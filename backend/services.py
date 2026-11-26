from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Booking, BookingHistory, Notification, Room, User


def normalize_dt(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


def find_conflicting_booking(
    db: Session,
    room_id: int,
    start_time: datetime,
    end_time: datetime,
    exclude_booking_id: Optional[int] = None,
) -> Optional[Booking]:
    """
    Quy tắc 4 & 8: Hai khoảng thời gian trùng nhau khi startA < endB và endA > startB.
    Chỉ kiểm tra với các lịch đã được xác nhận (APPROVED).
    Hai lịch chạm biên (endA == startB) không bị coi là trùng.
    """
    query = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.status == "APPROVED",
        Booking.start_time < end_time,
        Booking.end_time > start_time,
    )
    if exclude_booking_id is not None:
        query = query.filter(Booking.id != exclude_booking_id)
    return query.first()


def validate_booking_request(
    db: Session,
    room: Optional[Room],
    start_time: datetime,
    end_time: datetime,
    number_of_people: int,
    exclude_booking_id: Optional[int] = None,
):
    now = datetime.now()
    start_dt = normalize_dt(start_time)
    end_dt = normalize_dt(end_time)

    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng.")

    # Quy tắc 5: Không được đặt phòng đang bảo trì hoặc ngừng hoạt động
    if room.status != "AVAILABLE":
        status_label = "đang bảo trì" if room.status == "MAINTENANCE" else "ngừng hoạt động"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phòng {room.name} hiện {status_label}, không thể đặt lịch.",
        )

    # Quy tắc 1: Không cho phép đặt phòng trong quá khứ
    if start_dt <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thời gian bắt đầu phải lớn hơn thời điểm hiện tại.",
        )

    # Quy tắc 2: Thời gian kết thúc phải lớn hơn thời gian bắt đầu
    if end_dt <= start_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thời gian kết thúc phải lớn hơn thời gian bắt đầu.",
        )

    # Quy tắc 3: Không vượt quá sức chứa phòng
    if number_of_people <= 0 or number_of_people > room.capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số người tham gia ({number_of_people}) phải từ 1 đến {room.capacity} (sức chứa tối đa của phòng).",
        )

    # Quy tắc 4: Không cho phép trùng lịch đã được xác nhận
    conflict = find_conflicting_booking(db, room.id, start_dt, end_dt, exclude_booking_id)
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Phòng {room.name} đã có lịch được phê duyệt từ "
                f"{conflict.start_time.strftime('%H:%M %d/%m/%Y')} đến "
                f"{conflict.end_time.strftime('%H:%M %d/%m/%Y')}."
            ),
        )

    return start_dt, end_dt


def record_history(
    db: Session,
    booking_id: int,
    changed_by: int,
    old_status: Optional[str],
    new_status: str,
    note: Optional[str] = None,
):
    entry = BookingHistory(
        booking_id=booking_id,
        changed_by=changed_by,
        old_status=old_status,
        new_status=new_status,
        note=note,
        created_at=datetime.now(),
    )
    db.add(entry)


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    content: str,
    booking_id: Optional[int] = None,
):
    notif = Notification(
        user_id=user_id,
        booking_id=booking_id,
        title=title,
        content=content,
        is_read=False,
        created_at=datetime.now(),
    )
    db.add(notif)


def sync_completed_bookings(db: Session):
    now = datetime.now()
    expired_approved = (
        db.query(Booking)
        .filter(Booking.status == "APPROVED", Booking.end_time < now)
        .all()
    )
    for b in expired_approved:
        b.status = "COMPLETED"
        record_history(
            db,
            booking_id=b.id,
            changed_by=b.user_id,
            old_status="APPROVED",
            new_status="COMPLETED",
            note="Hệ thống tự động ghi nhận hoàn tất sau khi kết thúc thời gian sử dụng.",
        )
    if expired_approved:
        db.commit()


def serialize_room(room: Room) -> dict:
    return {
        "id": room.id,
        "name": room.name,
        "location": room.location,
        "capacity": room.capacity,
        "status": room.status,
        "category_id": room.category_id,
        "category_name": room.category.name if room.category else None,
        "manager_id": room.manager_id,
        "manager_name": room.manager.full_name if room.manager else None,
        "equipment": [
            {"id": eq.id, "name": eq.name, "description": eq.description}
            for eq in room.equipment
        ],
    }


def serialize_booking(booking: Booking) -> dict:
    return {
        "id": booking.id,
        "user_id": booking.user_id,
        "user_name": booking.user.full_name if booking.user else None,
        "user_email": booking.user.email if booking.user else None,
        "room_id": booking.room_id,
        "room_name": booking.room.name if booking.room else None,
        "room_location": booking.room.location if booking.room else None,
        "room_capacity": booking.room.capacity if booking.room else None,
        "approver_id": booking.approver_id,
        "approver_name": booking.approver.full_name if booking.approver else None,
        "start_time": booking.start_time.isoformat(),
        "end_time": booking.end_time.isoformat(),
        "number_of_people": booking.number_of_people,
        "purpose": booking.purpose,
        "status": booking.status,
        "rejection_reason": booking.rejection_reason,
        "created_at": booking.created_at.isoformat() if booking.created_at else None,
        "history": [
            {
                "id": h.id,
                "changed_by": h.changed_by,
                "actor_name": h.actor.full_name if h.actor else "Hệ thống",
                "old_status": h.old_status,
                "new_status": h.new_status,
                "note": h.note,
                "created_at": h.created_at.isoformat(),
            }
            for h in booking.history
        ],
    }
