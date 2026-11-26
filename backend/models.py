from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(String(20), nullable=False, default="USER")  # USER, MANAGER, ADMIN
    is_active = Column(Boolean, default=True, nullable=False)

    managed_rooms = relationship("Room", back_populates="manager", foreign_keys="Room.manager_id")
    bookings = relationship("Booking", back_populates="user", foreign_keys="Booking.user_id")
    notifications = relationship("Notification", back_populates="user")


class RoomCategory(Base):
    __tablename__ = "room_categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    rooms = relationship("Room", back_populates="category")


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    rooms = relationship("Room", secondary="room_equipment", back_populates="equipment")


class RoomEquipment(Base):
    __tablename__ = "room_equipment"

    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id", ondelete="CASCADE"), primary_key=True)


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("room_categories.id"), nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(150), nullable=False)
    location = Column(String(255), nullable=False)
    capacity = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="AVAILABLE")  # AVAILABLE, MAINTENANCE, INACTIVE

    category = relationship("RoomCategory", back_populates="rooms")
    manager = relationship("User", back_populates="managed_rooms", foreign_keys=[manager_id])
    equipment = relationship("Equipment", secondary="room_equipment", back_populates="rooms")
    bookings = relationship("Booking", back_populates="room")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    number_of_people = Column(Integer, nullable=False)
    purpose = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED, CANCELLED, COMPLETED
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    user = relationship("User", back_populates="bookings", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approver_id])
    room = relationship("Room", back_populates="bookings")
    history = relationship("BookingHistory", back_populates="booking", order_by="BookingHistory.created_at.desc()")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    user = relationship("User", back_populates="notifications")


class BookingHistory(Base):
    __tablename__ = "booking_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    booking = relationship("Booking", back_populates="history")
    actor = relationship("User", foreign_keys=[changed_by])
