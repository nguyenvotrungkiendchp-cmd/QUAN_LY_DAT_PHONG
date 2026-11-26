# Nền tảng đặt lịch sử dụng phòng họp / phòng học (PTIT - Nhóm 19)

Hệ thống web quản lý và đặt lịch sử dụng phòng học, phòng họp được xây dựng theo kiến trúc phân lớp (Layered Architecture) với **ReactJS (Vite)** và **Python FastAPI + SQLAlchemy + JWT**.

## Tính năng chính
- **Xem lịch trống & Tìm kiếm phòng:** Lọc theo tên, vị trí, loại phòng, sức chứa, thiết bị và khung giờ trống.
- **Đặt lịch & Tránh trùng lịch:** Kiểm tra xung đột lịch tự động (`startA < endB && endA > startB`) cả lúc tạo yêu cầu và lúc phê duyệt.
- **Phê duyệt yêu cầu (MANAGER / ADMIN):** Duyệt hoặc từ chối kèm lý do, quản lý trạng thái phòng (`AVAILABLE`, `MAINTENANCE`, `INACTIVE`).
- **Nhắc lịch & Thông báo:** Tự động nhắc lịch sử dụng phòng sắp tới trong 24 giờ và cập nhật thông báo theo trạng thái.
- **Quản trị & Thống kê (ADMIN):** Quản lý tài khoản, phân quyền RBAC (`USER`, `MANAGER`, `ADMIN`), danh mục loại phòng/thiết bị và thống kê hiệu suất sử dụng phòng.

## Hướng dẫn chạy dự án

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend (ReactJS + Vite)
```bash
cd frontend
npm install
npm run dev -- --port 5173
```

Hoặc chạy nhanh trên Windows bằng file `start.bat`.

## Tài khoản kiểm thử
- **USER:** `user1234@gmail.com` / `12345678`
- **MANAGER:** `manager123@gmail.com` / `abcd12345`
- **ADMIN:** `admin@ptit.edu.vn` / `admin1234`
