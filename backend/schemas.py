from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    confirm_password: str
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None


class UserUpdateProfile(BaseModel):
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None


class UserAdminUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserCreateAdmin(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    full_name: str
    phone: Optional[str] = None
    role: str = "USER"


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str]
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class EquipmentBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoomCreate(BaseModel):
    category_id: int
    manager_id: Optional[int] = None
    name: str
    location: str
    capacity: int = Field(..., gt=0)
    status: str = "AVAILABLE"
    equipment_ids: List[int] = []


class RoomUpdate(BaseModel):
    category_id: Optional[int] = None
    manager_id: Optional[int] = None
    name: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[int] = Field(default=None, gt=0)
    status: Optional[str] = None
    equipment_ids: Optional[List[int]] = None


class BookingCreate(BaseModel):
    room_id: int
    start_time: datetime
    end_time: datetime
    number_of_people: int = Field(..., gt=0)
    purpose: str = Field(..., min_length=3)


class BookingReject(BaseModel):
    rejection_reason: str = Field(..., min_length=3)


class BookingCancel(BaseModel):
    note: Optional[str] = None
