import React, { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  CalendarPlus,
  CheckSquare,
  History,
  Home,
  LayoutGrid,
  LogOut,
  Settings,
  User as UserIcon,
  X,
} from "lucide-react";
import { apiRequest, formatDateTime, getToken, setToken } from "./api";
import AuthScreen from "./screens/AuthScreen";
import HomeScreen from "./screens/HomeScreen";
import RoomsScreen from "./screens/RoomsScreen";
import RoomDetailScreen from "./screens/RoomDetailScreen";
import BookingScreen from "./screens/BookingScreen";
import MyBookingsScreen from "./screens/MyBookingsScreen";
import ManagerScreen from "./screens/ManagerScreen";
import AdminScreen from "./screens/AdminScreen";

const PAGE_TITLES = {
  home: "Trang chủ",
  rooms: "Danh sách phòng họp & phòng học",
  roomDetail: "Chi tiết phòng & Lịch trống",
  booking: "Đặt lịch sử dụng phòng",
  history: "Lịch sử đặt phòng của tôi",
  manager: "Phê duyệt yêu cầu & Quản lý phòng",
  admin: "Quản trị hệ thống & Thống kê",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [page, setPage] = useState("home");

  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [bookingPreset, setBookingPreset] = useState({ roomId: null, slot: null });
  const [roomSearchPreset, setRoomSearchPreset] = useState(null);

  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

  const loadAppData = async () => {
    try {
      const [r, c, eq, b, rem, n] = await Promise.all([
        apiRequest("/rooms"),
        apiRequest("/categories"),
        apiRequest("/equipment"),
        apiRequest("/bookings?scope=mine"),
        apiRequest("/bookings/reminders"),
        apiRequest("/notifications"),
      ]);
      setRooms(r);
      setCategories(c);
      setEquipmentList(eq);
      setMyBookings(b);
      setReminders(rem);
      setNotifications(n);
    } catch {
      // Ignore if token expired
    }
  };

  useEffect(() => {
    const restore = async () => {
      if (getToken()) {
        try {
          const me = await apiRequest("/auth/me");
          setUser(me);
          await loadAppData();
        } catch {
          setToken(null);
        }
      }
      setInitializing(false);
    };
    restore();
  }, []);

  const handleAuthSuccess = async (loggedInUser) => {
    setUser(loggedInUser);
    setPage("home");
    await loadAppData();
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setPage("home");
  };

  const handleOpenRoomDetail = (roomId) => {
    setSelectedRoomId(roomId);
    setPage("roomDetail");
  };

  const handleBookRoom = (roomId, slot = null) => {
    setBookingPreset({ roomId, slot });
    setPage("booking");
  };

  const handleQuickSearch = (filter) => {
    setRoomSearchPreset(filter);
    setPage("rooms");
  };

  const markNotifRead = async (id) => {
    await apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    await apiRequest("/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const openProfile = () => {
    setProfileName(user.full_name);
    setProfilePhone(user.phone || "");
    setProfileMsg("");
    setShowProfile(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const updated = await apiRequest("/auth/me", {
      method: "PUT",
      body: JSON.stringify({ full_name: profileName, phone: profilePhone }),
    });
    setUser(updated);
    setProfileMsg("Cập nhật thông tin cá nhân thành công!");
  };

  if (initializing) {
    return <div style={{ padding: 40, textAlign: "center" }}>Đang khởi tạo hệ thống...</div>;
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Building2 size={22} />
          </div>
          <div>
            <div className="brand-title">PTIT RoomBooking</div>
            <div className="brand-sub">Đặt lịch phòng học / phòng họp</div>
          </div>
        </div>

        <nav className="nav-list">
          <button className={`nav-item ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>
            <Home size={18} /> Trang chủ
            {reminders.length > 0 && <span className="nav-badge">{reminders.length}</span>}
          </button>

          <button
            className={`nav-item ${page === "rooms" || page === "roomDetail" ? "active" : ""}`}
            onClick={() => { setRoomSearchPreset(null); setPage("rooms"); }}
          >
            <LayoutGrid size={18} /> Danh sách phòng
          </button>

          <button className={`nav-item ${page === "booking" ? "active" : ""}`} onClick={() => handleBookRoom(null, null)}>
            <CalendarPlus size={18} /> Đặt lịch sử dụng
          </button>

          <button className={`nav-item ${page === "history" ? "active" : ""}`} onClick={() => setPage("history")}>
            <History size={18} /> Lịch sử đặt phòng
          </button>

          {(user.role === "MANAGER" || user.role === "ADMIN") && (
            <button className={`nav-item ${page === "manager" ? "active" : ""}`} onClick={() => setPage("manager")}>
              <CheckSquare size={18} /> Phê duyệt & Phòng
            </button>
          )}

          {user.role === "ADMIN" && (
            <button className={`nav-item ${page === "admin" ? "active" : ""}`} onClick={() => setPage("admin")}>
              <Settings size={18} /> Quản trị hệ thống
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={openProfile}>
            <UserIcon size={18} />
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.full_name}
            </div>
          </button>
          <button className="nav-item" onClick={handleLogout} style={{ color: "#fca5a5" }}>
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-area">
        <header className="topbar">
          <h1 className="topbar-title">{PAGE_TITLES[page] || "Hệ thống đặt phòng"}</h1>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => setShowNotifs(true)} title="Thông báo">
              <Bell size={18} />
              {unreadCount > 0 && <span className="icon-dot">{unreadCount}</span>}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={openProfile}>
              <UserIcon size={15} /> {user.role}
            </button>
          </div>
        </header>

        <main className="content">
          {page === "home" && (
            <HomeScreen
              user={user}
              rooms={rooms}
              myBookings={myBookings}
              reminders={reminders}
              notifications={notifications}
              onNavigate={setPage}
              onQuickSearch={handleQuickSearch}
            />
          )}

          {page === "rooms" && (
            <RoomsScreen
              categories={categories}
              equipmentList={equipmentList}
              initialFilter={roomSearchPreset}
              onSelectRoom={handleOpenRoomDetail}
              onBookRoom={handleBookRoom}
            />
          )}

          {page === "roomDetail" && (
            <RoomDetailScreen
              roomId={selectedRoomId}
              onBack={() => setPage("rooms")}
              onBookRoom={handleBookRoom}
            />
          )}

          {page === "booking" && (
            <BookingScreen
              rooms={rooms}
              initialRoomId={bookingPreset.roomId}
              initialSlot={bookingPreset.slot}
              onBookingCreated={loadAppData}
            />
          )}

          {page === "history" && (
            <MyBookingsScreen bookings={myBookings} onRefresh={loadAppData} />
          )}

          {page === "manager" && (
            <ManagerScreen
              user={user}
              categories={categories}
              equipmentList={equipmentList}
              onGlobalRefresh={loadAppData}
            />
          )}

          {page === "admin" && (
            <AdminScreen
              categories={categories}
              equipmentList={equipmentList}
              onGlobalRefresh={loadAppData}
            />
          )}
        </main>
      </div>

      {/* Notifications Modal */}
      {showNotifs && (
        <div className="modal-backdrop" onClick={() => setShowNotifs(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thông báo ({unreadCount} chưa đọc)</h3>
              <div style={{ display: "flex", gap: 8 }}>
                {unreadCount > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
                    Đọc tất cả
                  </button>
                )}
                <button className="icon-btn" onClick={() => setShowNotifs(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>
            {notifications.length === 0 ? (
              <div style={{ color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>
                Bạn chưa có thông báo nào.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markNotifRead(n.id)}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: n.is_read ? "#fff" : "var(--primary-soft)",
                      cursor: n.is_read ? "default" : "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ fontSize: 13.5 }}>{n.title}</strong>
                      <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{formatDateTime(n.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{n.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className="modal-backdrop" onClick={() => setShowProfile(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thông tin tài khoản</h3>
              <button className="icon-btn" onClick={() => setShowProfile(false)}>
                <X size={16} />
              </button>
            </div>
            {profileMsg && <div className="alert alert-success">{profileMsg}</div>}
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" disabled value={user.email} />
              </div>
              <div className="form-group">
                <label className="form-label">Vai trò</label>
                <input className="form-control" disabled value={user.role} />
              </div>
              <div className="form-group">
                <label className="form-label">Họ và tên *</label>
                <input className="form-control" required value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input className="form-control" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProfile(false)}>Đóng</button>
                <button type="submit" className="btn btn-primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
