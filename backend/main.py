from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_roles,
    verify_password,
)
from database import Base, SessionLocal, engine, get_db
from models import (
    Booking,
    Equipment,
    Notification,
    Room,
    RoomCategory,
    User,
)
from schemas import (
    BookingCancel,
    BookingCreate,
    BookingReject,
    CategoryBase,
    EquipmentBase,
    LoginRequest,
    RegisterRequest,
    RoomCreate,
    RoomUpdate,
    UserAdminUpdate,
    UserCreateAdmin,
    UserOut,
    UserUpdateProfile,
)
from seed import seed_database
from services import (
    create_notification,
    find_conflicting_booking,
    normalize_dt,
    record_history,
    serialize_booking,
    serialize_room,
    sync_completed_bookings,
    validate_booking_request,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Nền tảng đặt lịch sử dụng phòng họp / phòng học",
    description="API hệ thống quản lý và đặt lịch sử dụng phòng học, phòng họp (PTIT - Nhóm 19)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- AUTH --------------------
@app.post("/api/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.strip()).first()
    if not user:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa.")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Mật khẩu không chính xác.")

    token = create_access_token(user.id, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserOut.model_validate(user).model_dump(),
    }


@app.post("/api/auth/register", status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Xác nhận mật khẩu không trùng khớp.")
    existing = db.query(User).filter(User.email == payload.email.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký.")

    user = User(
        email=payload.email.strip(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        phone=payload.phone,
        role="USER",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserOut.model_validate(user).model_dump(),
    }


@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user).model_dump()


@app.put("/api/auth/me")
def update_profile(
    payload: UserUpdateProfile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.full_name = payload.full_name.strip()
    current_user.phone = payload.phone
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user).model_dump()


# -------------------- USERS (ADMIN) --------------------
@app.get("/api/users")
def list_users(
    role: Optional[str] = None,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return [UserOut.model_validate(u).model_dump() for u in query.order_by(User.id).all()]


@app.get("/api/users/managers")
def list_managers(
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"])),
    db: Session = Depends(get_db),
):
    managers = db.query(User).filter(User.role.in_(["MANAGER", "ADMIN"]), User.is_active == True).all()
    return [UserOut.model_validate(u).model_dump() for u in managers]


@app.post("/api/users", status_code=201)
def create_user_admin(
    payload: UserCreateAdmin,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db),
):
    if payload.role not in {"USER", "MANAGER", "ADMIN"}:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ.")
    if db.query(User).filter(User.email == payload.email.strip()).first():
        raise HTTPException(status_code=400, detail="Email đã tồn tại.")

    user = User(
        email=payload.email.strip(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        phone=payload.phone,
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user).model_dump()


@app.patch("/api/users/{user_id}")
def update_user_admin(
    user_id: int,
    payload: UserAdminUpdate,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    if payload.role is not None:
        if payload.role not in {"USER", "MANAGER", "ADMIN"}:
            raise HTTPException(status_code=400, detail="Vai trò không hợp lệ.")
        user.role = payload.role
    if payload.is_active is not None:
        if user.id == current_user.id and not payload.is_active:
            raise HTTPException(status_code=400, detail="Không thể tự khóa tài khoản của chính mình.")
        user.is_active = payload.is_active
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        user.phone = payload.phone
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user).model_dump()


# -------------------- CATEGORIES & EQUIPMENT --------------------
@app.get("/api/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(RoomCategory).order_by(RoomCategory.id).all()
    return [{"id": c.id, "name": c.name, "description": c.description} for c in cats]


@app.post("/api/categories", status_code=201)
def create_category(
    payload: CategoryBase,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db),
):
    if db.query(RoomCategory).filter(RoomCategory.name == payload.name.strip()).first():
        raise HTTPException(status_code=400, detail="Tên loại phòng đã tồn tại.")
    cat = RoomCategory(name=payload.name.strip(), description=payload.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": cat.id, "name": cat.name, "description": cat.description}


@app.delete("/api/categories/{category_id}")
def delete_category(
    category_id: int,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db),
):
    cat = db.query(RoomCategory).filter(RoomCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại phòng.")
    if db.query(Room).filter(Room.category_id == category_id).count() > 0:
        raise HTTPException(status_code=400, detail="Không thể xóa loại phòng đang có phòng sử dụng.")
    db.delete(cat)
    db.commit()
    return {"message": "Đã xóa loại phòng."}


@app.get("/api/equipment")
def list_equipment(db: Session = Depends(get_db)):
    items = db.query(Equipment).order_by(Equipment.id).all()
    return [{"id": e.id, "name": e.name, "description": e.description} for e in items]


@app.post("/api/equipment", status_code=201)
def create_equipment(
    payload: EquipmentBase,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db),
):
    if db.query(Equipment).filter(Equipment.name == payload.name.strip()).first():
        raise HTTPException(status_code=400, detail="Tên thiết bị đã tồn tại.")
    eq = Equipment(name=payload.name.strip(), description=payload.description)
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return {"id": eq.id, "name": eq.name, "description": eq.description}


@app.delete("/api/equipment/{equipment_id}")
def delete_equipment(
    equipment_id: int,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db),
):
    eq = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị.")
    db.delete(eq)
    db.commit()
    return {"message": "Đã xóa thiết bị."}


# -------------------- ROOMS --------------------
@app.get("/api/rooms")
def list_rooms(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    location: Optional[str] = None,
    min_capacity: Optional[int] = None,
    equipment_ids: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    include_all: bool = False,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    sync_completed_bookings(db)
    query = db.query(Room)

    if not include_all and not status_filter:
        query = query.filter(Room.status != "INACTIVE")
    elif status_filter:
        query = query.filter(Room.status == status_filter)

    if category_id:
        query = query.filter(Room.category_id == category_id)
    if min_capacity:
        query = query.filter(Room.capacity >= min_capacity)
    if location:
        query = query.filter(Room.location.ilike(f"%{location.strip()}%"))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter((Room.name.ilike(term)) | (Room.location.ilike(term)))

    rooms = query.order_by(Room.id).all()

    if equipment_ids:
        req_ids = {int(x) for x in equipment_ids.split(",") if x.strip().isdigit()}
        if req_ids:
            rooms = [r for r in rooms if req_ids.issubset({e.id for e in r.equipment})]

    # Lọc phòng trống trong khoảng thời gian nếu người dùng chọn
    if start_time and end_time:
        st = normalize_dt(start_time)
        et = normalize_dt(end_time)
        available_rooms = []
        for r in rooms:
            if r.status != "AVAILABLE":
                continue
            if not find_conflicting_booking(db, r.id, st, et):
                available_rooms.append(r)
        rooms = available_rooms

    return [serialize_room(r) for r in rooms]


@app.get("/api/rooms/{room_id}")
def get_room_detail(room_id: int, db: Session = Depends(get_db)):
    sync_completed_bookings(db)
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng.")
    return serialize_room(room)


@app.get("/api/rooms/{room_id}/schedule")
def get_room_schedule(
    room_id: int,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    sync_completed_bookings(db)
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng.")

    query = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.status.in_(["APPROVED", "PENDING"]),
    )
    if date_from:
        query = query.filter(Booking.end_time >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Booking.start_time <= datetime.fromisoformat(date_to))

    bookings = query.order_by(Booking.start_time.asc()).all()
    return [serialize_booking(b) for b in bookings]


@app.post("/api/rooms", status_code=201)
def create_room(
    payload: RoomCreate,
    current_user: User = Depends(require_roles(["MANAGER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    manager_id = payload.manager_id if current_user.role == "ADMIN" else current_user.id
    room = Room(
        category_id=payload.category_id,
        manager_id=manager_id,
        name=payload.name.strip(),
        location=payload.location.strip(),
        capacity=payload.capacity,
        status=payload.status,
    )
    if payload.equipment_ids:
        room.equipment = db.query(Equipment).filter(Equipment.id.in_(payload.equipment_ids)).all()
    db.add(room)
    db.commit()
    db.refresh(room)
    return serialize_room(room)


@app.put("/api/rooms/{room_id}")
@app.patch("/api/rooms/{room_id}")
def update_room(
    room_id: int,
    payload: RoomUpdate,
    current_user: User = Depends(require_roles(["MANAGER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng.")
    if current_user.role == "MANAGER" and room.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn chỉ được cập nhật phòng thuộc phạm vi quản lý.")

    if payload.name is not None:
        room.name = payload.name.strip()
    if payload.location is not None:
        room.location = payload.location.strip()
    if payload.capacity is not None:
        room.capacity = payload.capacity
    if payload.category_id is not None:
        room.category_id = payload.category_id
    if payload.status is not None:
        if payload.status not in {"AVAILABLE", "MAINTENANCE", "INACTIVE"}:
            raise HTTPException(status_code=400, detail="Trạng thái phòng không hợp lệ.")
        room.status = payload.status
    if payload.manager_id is not None and current_user.role == "ADMIN":
        room.manager_id = payload.manager_id
    if payload.equipment_ids is not None:
        room.equipment = db.query(Equipment).filter(Equipment.id.in_(payload.equipment_ids)).all()

    db.commit()
    db.refresh(room)
    return serialize_room(room)


# -------------------- BOOKINGS --------------------
@app.get("/api/bookings/check-conflict")
def check_conflict(
    room_id: int,
    start_time: datetime,
    end_time: datetime,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    st = normalize_dt(start_time)
    et = normalize_dt(end_time)
    conflict = find_conflicting_booking(db, room_id, st, et)
    if conflict:
        return {
            "has_conflict": True,
            "message": f"Trùng với lịch đã duyệt từ {conflict.start_time.strftime('%H:%M %d/%m/%Y')} đến {conflict.end_time.strftime('%H:%M %d/%m/%Y')}.",
            "conflict_booking": serialize_booking(conflict),
        }
    return {"has_conflict": False, "message": "Khung giờ này hiện đang trống."}


@app.get("/api/bookings/reminders")
def get_upcoming_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trả về danh sách lịch đặt đã duyệt sắp diễn ra trong 24 giờ tới để nhắc lịch."""
    sync_completed_bookings(db)
    now = datetime.now()
    horizon = now + timedelta(hours=24)
    upcoming = (
        db.query(Booking)
        .filter(
            Booking.user_id == current_user.id,
            Booking.status == "APPROVED",
            Booking.start_time >= now,
            Booking.start_time <= horizon,
        )
        .order_by(Booking.start_time.asc())
        .all()
    )
    return [serialize_booking(b) for b in upcoming]


@app.get("/api/bookings")
def list_bookings(
    scope: str = Query(default="mine"),  # mine | managed | all
    status_filter: Optional[str] = Query(default=None, alias="status"),
    room_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sync_completed_bookings(db)
    query = db.query(Booking)

    if scope == "mine":
        query = query.filter(Booking.user_id == current_user.id)
    elif scope == "managed":
        if current_user.role == "USER":
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem danh sách phê duyệt.")
        if current_user.role == "MANAGER":
            managed_ids = [r.id for r in db.query(Room).filter(Room.manager_id == current_user.id).all()]
            query = query.filter(Booking.room_id.in_(managed_ids) if managed_ids else Booking.id == -1)
    elif scope == "all":
        if current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Chỉ quản trị viên mới được xem toàn bộ lịch đặt.")

    if status_filter:
        query = query.filter(Booking.status == status_filter)
    if room_id:
        query = query.filter(Booking.room_id == room_id)

    bookings = query.order_by(Booking.created_at.desc()).all()
    result = []
    for b in bookings:
        item = serialize_booking(b)
        if b.status == "PENDING":
            conflict = find_conflicting_booking(db, b.room_id, b.start_time, b.end_time, exclude_booking_id=b.id)
            item["has_conflict_now"] = conflict is not None
        else:
            item["has_conflict_now"] = False
        result.append(item)
    return result


@app.post("/api/bookings", status_code=201)
def create_booking(
    payload: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = db.query(Room).filter(Room.id == payload.room_id).first()
    start_dt, end_dt = validate_booking_request(
        db, room, payload.start_time, payload.end_time, payload.number_of_people
    )

    booking = Booking(
        user_id=current_user.id,
        room_id=room.id,
        start_time=start_dt,
        end_time=end_dt,
        number_of_people=payload.number_of_people,
        purpose=payload.purpose.strip(),
        status="PENDING",
        created_at=datetime.now(),
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    record_history(
        db,
        booking_id=booking.id,
        changed_by=current_user.id,
        old_status=None,
        new_status="PENDING",
        note="Người dùng gửi yêu cầu đặt phòng.",
    )

    if room.manager_id:
        create_notification(
            db,
            user_id=room.manager_id,
            booking_id=booking.id,
            title="Yêu cầu đặt phòng mới",
            content=f"{current_user.full_name} yêu cầu đặt {room.name} từ {start_dt.strftime('%H:%M %d/%m/%Y')} đến {end_dt.strftime('%H:%M')}.",
        )
    db.commit()
    db.refresh(booking)
    return serialize_booking(booking)


@app.post("/api/bookings/{booking_id}/approve")
def approve_booking(
    booking_id: int,
    current_user: User = Depends(require_roles(["MANAGER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đặt phòng.")
    if booking.status != "PENDING":
        raise HTTPException(status_code=400, detail="Chỉ có thể phê duyệt yêu cầu đang ở trạng thái PENDING.")

    room = booking.room
    if current_user.role == "MANAGER" and room.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không quản lý phòng này.")

    # Quy tắc 8: Kiểm tra lại xung đột lịch tại thời điểm phê duyệt
    validate_booking_request(
        db,
        room,
        booking.start_time,
        booking.end_time,
        booking.number_of_people,
        exclude_booking_id=booking.id,
    )

    booking.status = "APPROVED"
    booking.approver_id = current_user.id
    record_history(
        db,
        booking_id=booking.id,
        changed_by=current_user.id,
        old_status="PENDING",
        new_status="APPROVED",
        note=f"Phê duyệt bởi {current_user.full_name}.",
    )
    create_notification(
        db,
        user_id=booking.user_id,
        booking_id=booking.id,
        title="Yêu cầu đặt phòng đã được phê duyệt",
        content=f"Yêu cầu đặt {room.name} ({booking.start_time.strftime('%H:%M %d/%m/%Y')} - {booking.end_time.strftime('%H:%M')}) đã được chấp thuận.",
    )
    db.commit()
    db.refresh(booking)
    return serialize_booking(booking)


@app.post("/api/bookings/{booking_id}/reject")
def reject_booking(
    booking_id: int,
    payload: BookingReject,
    current_user: User = Depends(require_roles(["MANAGER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đặt phòng.")
    if booking.status != "PENDING":
        raise HTTPException(status_code=400, detail="Chỉ có thể từ chối yêu cầu đang ở trạng thái PENDING.")

    room = booking.room
    if current_user.role == "MANAGER" and room.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không quản lý phòng này.")

    booking.status = "REJECTED"
    booking.approver_id = current_user.id
    booking.rejection_reason = payload.rejection_reason.strip()
    record_history(
        db,
        booking_id=booking.id,
        changed_by=current_user.id,
        old_status="PENDING",
        new_status="REJECTED",
        note=f"Từ chối: {booking.rejection_reason}",
    )
    create_notification(
        db,
        user_id=booking.user_id,
        booking_id=booking.id,
        title="Yêu cầu đặt phòng bị từ chối",
        content=f"Yêu cầu đặt {room.name} ({booking.start_time.strftime('%H:%M %d/%m/%Y')}) đã bị từ chối. Lý do: {booking.rejection_reason}",
    )
    db.commit()
    db.refresh(booking)
    return serialize_booking(booking)


@app.post("/api/bookings/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    payload: BookingCancel = BookingCancel(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đặt phòng.")

    is_owner = booking.user_id == current_user.id
    is_admin_or_manager = current_user.role in {"ADMIN", "MANAGER"}
    if not is_owner and not is_admin_or_manager:
        raise HTTPException(status_code=403, detail="Bạn không có quyền hủy lịch đặt này.")

    if booking.status not in {"PENDING", "APPROVED"}:
        raise HTTPException(status_code=400, detail="Chỉ có thể hủy yêu cầu đang chờ duyệt hoặc đã duyệt chưa sử dụng.")
    if booking.start_time <= datetime.now():
        raise HTTPException(status_code=400, detail="Không thể hủy lịch đã hoặc đang diễn ra.")

    old_status = booking.status
    booking.status = "CANCELLED"
    record_history(
        db,
        booking_id=booking.id,
        changed_by=current_user.id,
        old_status=old_status,
        new_status="CANCELLED",
        note=payload.note or f"Hủy lịch bởi {current_user.full_name}.",
    )

    if booking.room.manager_id and booking.room.manager_id != current_user.id:
        create_notification(
            db,
            user_id=booking.room.manager_id,
            booking_id=booking.id,
            title="Lịch đặt phòng đã bị hủy",
            content=f"{current_user.full_name} đã hủy lịch đặt {booking.room.name} lúc {booking.start_time.strftime('%H:%M %d/%m/%Y')}.",
        )
    db.commit()
    db.refresh(booking)
    return serialize_booking(booking)


# -------------------- NOTIFICATIONS --------------------
@app.get("/api/notifications")
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [
        {
            "id": n.id,
            "user_id": n.user_id,
            "booking_id": n.booking_id,
            "title": n.title,
            "content": n.content,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in items
    ]


@app.patch("/api/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo.")
    notif.is_read = True
    db.commit()
    return {"id": notif.id, "is_read": True}


@app.post("/api/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "Đã đánh dấu tất cả thông báo là đã đọc."}


# -------------------- STATS (ADMIN / MANAGER) --------------------
@app.get("/api/stats")
def get_stats(
    current_user: User = Depends(require_roles(["ADMIN", "MANAGER"])),
    db: Session = Depends(get_db),
):
    sync_completed_bookings(db)
    total_rooms = db.query(Room).count()
    available_rooms = db.query(Room).filter(Room.status == "AVAILABLE").count()
    maintenance_rooms = db.query(Room).filter(Room.status == "MAINTENANCE").count()
    total_users = db.query(User).count()

    bookings = db.query(Booking).all()
    by_status = {
        "PENDING": 0,
        "APPROVED": 0,
        "REJECTED": 0,
        "CANCELLED": 0,
        "COMPLETED": 0,
    }
    for b in bookings:
        by_status[b.status] = by_status.get(b.status, 0) + 1

    # Tính hiệu suất sử dụng phòng (tổng giờ APPROVED + COMPLETED / 40h chuẩn tuần)
    rooms = db.query(Room).all()
    room_utilization = []
    for r in rooms:
        r_bookings = [b for b in bookings if b.room_id == r.id and b.status in {"APPROVED", "COMPLETED"}]
        total_hours = sum((b.end_time - b.start_time).total_seconds() / 3600 for b in r_bookings)
        utilization_pct = min(round((total_hours / 40.0) * 100, 1), 100.0)
        room_utilization.append(
            {
                "room_id": r.id,
                "room_name": r.name,
                "booking_count": len(r_bookings),
                "total_hours": round(total_hours, 1),
                "utilization_pct": utilization_pct,
            }
        )

    return {
        "total_rooms": total_rooms,
        "available_rooms": available_rooms,
        "maintenance_rooms": maintenance_rooms,
        "total_users": total_users,
        "total_bookings": len(bookings),
        "by_status": by_status,
        "room_utilization": room_utilization,
    }
