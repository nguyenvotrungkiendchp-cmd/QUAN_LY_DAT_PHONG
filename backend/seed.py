from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from auth import hash_password
from models import (
    Booking,
    BookingHistory,
    Equipment,
    Notification,
    Room,
    RoomCategory,
    User,
)


def seed_database(db: Session):
    if db.query(User).count() > 0:
        return

    # 1. Users (Khớp với tài khoản kiểm thử trong Chương V báo cáo)
    user1 = User(
        email="user1234@gmail.com",
        password_hash=hash_password("12345678"),
        full_name="Nguyễn Võ Trung Kiên",
        phone="0912345678",
        role="USER",
        is_active=True,
    )
    user2 = User(
        email="dat.nt@ptit.edu.vn",
        password_hash=hash_password("12345678"),
        full_name="Nguyễn Tuấn Đạt",
        phone="0987654321",
        role="USER",
        is_active=True,
    )
    manager = User(
        email="manager123@gmail.com",
        password_hash=hash_password("abcd12345"),
        full_name="Hoàng Minh Tuấn",
        phone="0901122334",
        role="MANAGER",
        is_active=True,
    )
    admin = User(
        email="admin@ptit.edu.vn",
        password_hash=hash_password("admin1234"),
        full_name="Quản trị viên Hệ thống",
        phone="02438547799",
        role="ADMIN",
        is_active=True,
    )
    db.add_all([user1, user2, manager, admin])
    db.commit()
    db.refresh(user1)
    db.refresh(user2)
    db.refresh(manager)
    db.refresh(admin)

    # 2. Room Categories
    cat_hoc = RoomCategory(name="Phòng học lý thuyết", description="Phòng học tiêu chuẩn phục vụ giảng dạy và học nhóm")
    cat_hop = RoomCategory(name="Phòng họp", description="Phòng họp chuyên dụng cho các cuộc họp và bảo vệ đồ án")
    cat_hoi_thao = RoomCategory(name="Phòng hội thảo", description="Hội trường nhỏ tổ chức seminar, workshop")
    cat_lab = RoomCategory(name="Phòng Lab / Thực hành", description="Phòng máy tính và thực hành kỹ thuật")
    db.add_all([cat_hoc, cat_hop, cat_hoi_thao, cat_lab])
    db.commit()

    # 3. Equipment
    eq_projector = Equipment(name="Máy chiếu 4K", description="Máy chiếu độ phân giải cao hỗ trợ HDMI/Wireless")
    eq_board = Equipment(name="Bảng trắng thông minh", description="Bảng tương tác và bút viết")
    eq_audio = Equipment(name="Hệ thống âm thanh", description="Loa hội trường và micro không dây")
    eq_cam = Equipment(name="Camera hội nghị", description="Camera góc rộng phục vụ họp trực tuyến")
    eq_ac = Equipment(name="Điều hòa trung tâm", description="Hệ thống làm mát công suất lớn")
    eq_wifi = Equipment(name="Wifi tốc độ cao", description="Băng thông 1Gbps ổn định")
    eq_pc = Equipment(name="Máy tính cấu hình cao", description="40 máy trạm Core i7 RAM 32GB")
    db.add_all([eq_projector, eq_board, eq_audio, eq_cam, eq_ac, eq_wifi, eq_pc])
    db.commit()

    # 4. Rooms
    rooms = [
        Room(
            name="Phòng Họp A1-301",
            location="Tòa nhà A1 - Tầng 3",
            capacity=16,
            status="AVAILABLE",
            category_id=cat_hop.id,
            manager_id=manager.id,
            equipment=[eq_projector, eq_cam, eq_board, eq_ac, eq_wifi],
        ),
        Room(
            name="Phòng Học A2-204",
            location="Tòa nhà A2 - Tầng 2",
            capacity=45,
            status="AVAILABLE",
            category_id=cat_hoc.id,
            manager_id=manager.id,
            equipment=[eq_projector, eq_board, eq_audio, eq_ac, eq_wifi],
        ),
        Room(
            name="Phòng Lab B1-402",
            location="Tòa nhà B1 - Tầng 4",
            capacity=40,
            status="AVAILABLE",
            category_id=cat_lab.id,
            manager_id=manager.id,
            equipment=[eq_pc, eq_projector, eq_ac, eq_wifi],
        ),
        Room(
            name="Hội Trường C1-101",
            location="Tòa nhà C1 - Tầng 1",
            capacity=120,
            status="AVAILABLE",
            category_id=cat_hoi_thao.id,
            manager_id=manager.id,
            equipment=[eq_projector, eq_audio, eq_cam, eq_ac, eq_wifi],
        ),
        Room(
            name="Phòng Họp Nhóm A1-105",
            location="Tòa nhà A1 - Tầng 1",
            capacity=10,
            status="AVAILABLE",
            category_id=cat_hop.id,
            manager_id=manager.id,
            equipment=[eq_board, eq_ac, eq_wifi],
        ),
        Room(
            name="Phòng Học A2-501",
            location="Tòa nhà A2 - Tầng 5",
            capacity=60,
            status="MAINTENANCE",
            category_id=cat_hoc.id,
            manager_id=manager.id,
            equipment=[eq_projector, eq_audio, eq_ac],
        ),
    ]
    db.add_all(rooms)
    db.commit()
    for r in rooms:
        db.refresh(r)

    # 5. Bookings (Đa dạng trạng thái & có lịch sắp tới để test Nhắc lịch & Tránh trùng lịch)
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    today_plus_2h = now + timedelta(hours=2)
    today_plus_4h = now + timedelta(hours=4)
    tomorrow = (now + timedelta(days=1)).replace(hour=9, minute=0)
    tomorrow_end = tomorrow + timedelta(hours=2)
    day_after = (now + timedelta(days=2)).replace(hour=14, minute=0)
    day_after_end = day_after + timedelta(hours=2)
    yesterday = (now - timedelta(days=1)).replace(hour=10, minute=0)
    yesterday_end = yesterday + timedelta(hours=2)

    b1 = Booking(
        user_id=user1.id,
        room_id=rooms[0].id,
        approver_id=manager.id,
        start_time=today_plus_2h,
        end_time=today_plus_4h,
        number_of_people=10,
        purpose="Họp nhóm 19 rà soát tiến độ đồ án Kiến trúc và thiết kế phần mềm",
        status="APPROVED",
        created_at=now - timedelta(hours=5),
    )
    b2 = Booking(
        user_id=user2.id,
        room_id=rooms[1].id,
        start_time=tomorrow,
        end_time=tomorrow_end,
        number_of_people=25,
        purpose="Thảo luận chuyên đề UML & RESTful API",
        status="PENDING",
        created_at=now - timedelta(hours=2),
    )
    b3 = Booking(
        user_id=user1.id,
        room_id=rooms[2].id,
        start_time=day_after,
        end_time=day_after_end,
        number_of_people=30,
        purpose="Thực hành kiểm thử tích hợp FastAPI & ReactJS",
        status="PENDING",
        created_at=now - timedelta(hours=1),
    )
    b4 = Booking(
        user_id=user1.id,
        room_id=rooms[3].id,
        approver_id=manager.id,
        start_time=yesterday,
        end_time=yesterday_end,
        number_of_people=80,
        purpose="Hội thảo định hướng nghiên cứu khoa học sinh viên",
        status="COMPLETED",
        created_at=now - timedelta(days=3),
    )
    b5 = Booking(
        user_id=user2.id,
        room_id=rooms[0].id,
        approver_id=manager.id,
        start_time=tomorrow + timedelta(hours=4),
        end_time=tomorrow + timedelta(hours=6),
        number_of_people=12,
        purpose="Họp câu lạc bộ IT PTIT",
        status="REJECTED",
        rejection_reason="Phòng đã được ưu tiên cho lịch họp giao ban khoa.",
        created_at=now - timedelta(days=1),
    )
    db.add_all([b1, b2, b3, b4, b5])
    db.commit()
    for b in [b1, b2, b3, b4, b5]:
        db.refresh(b)

    # 6. Booking History
    histories = [
        BookingHistory(booking_id=b1.id, changed_by=user1.id, old_status=None, new_status="PENDING", note="Tạo yêu cầu đặt phòng mới", created_at=b1.created_at),
        BookingHistory(booking_id=b1.id, changed_by=manager.id, old_status="PENDING", new_status="APPROVED", note="Đã phê duyệt yêu cầu", created_at=b1.created_at + timedelta(minutes=30)),
        BookingHistory(booking_id=b2.id, changed_by=user2.id, old_status=None, new_status="PENDING", note="Tạo yêu cầu đặt phòng mới", created_at=b2.created_at),
        BookingHistory(booking_id=b3.id, changed_by=user1.id, old_status=None, new_status="PENDING", note="Tạo yêu cầu đặt phòng mới", created_at=b3.created_at),
        BookingHistory(booking_id=b4.id, changed_by=user1.id, old_status=None, new_status="PENDING", note="Tạo yêu cầu đặt phòng mới", created_at=b4.created_at),
        BookingHistory(booking_id=b4.id, changed_by=manager.id, old_status="PENDING", new_status="APPROVED", note="Phê duyệt tổ chức hội thảo", created_at=b4.created_at + timedelta(hours=1)),
        BookingHistory(booking_id=b4.id, changed_by=user1.id, old_status="APPROVED", new_status="COMPLETED", note="Hoàn tất sử dụng phòng", created_at=yesterday_end),
        BookingHistory(booking_id=b5.id, changed_by=manager.id, old_status="PENDING", new_status="REJECTED", note=b5.rejection_reason, created_at=now - timedelta(hours=12)),
    ]
    db.add_all(histories)

    # 7. Notifications
    notifs = [
        Notification(
            user_id=user1.id,
            booking_id=b1.id,
            title="Yêu cầu đặt phòng đã được phê duyệt",
            content=f"Yêu cầu đặt {rooms[0].name} vào lúc {today_plus_2h.strftime('%H:%M %d/%m/%Y')} đã được phê duyệt.",
            is_read=False,
            created_at=now - timedelta(hours=4),
        ),
        Notification(
            user_id=user1.id,
            booking_id=b1.id,
            title="Nhắc lịch sử dụng phòng sắp tới",
            content=f"Bạn có lịch sử dụng {rooms[0].name} vào lúc {today_plus_2h.strftime('%H:%M hôm nay')}. Vui lòng chuẩn bị đúng giờ.",
            is_read=False,
            created_at=now - timedelta(minutes=15),
        ),
        Notification(
            user_id=manager.id,
            booking_id=b2.id,
            title="Yêu cầu đặt phòng mới cần xét duyệt",
            content=f"{user2.full_name} đã gửi yêu cầu đặt {rooms[1].name} vào {tomorrow.strftime('%H:%M %d/%m/%Y')}.",
            is_read=False,
            created_at=b2.created_at,
        ),
        Notification(
            user_id=manager.id,
            booking_id=b3.id,
            title="Yêu cầu đặt phòng mới cần xét duyệt",
            content=f"{user1.full_name} đã gửi yêu cầu đặt {rooms[2].name} vào {day_after.strftime('%H:%M %d/%m/%Y')}.",
            is_read=False,
            created_at=b3.created_at,
        ),
    ]
    db.add_all(notifs)
    db.commit()
