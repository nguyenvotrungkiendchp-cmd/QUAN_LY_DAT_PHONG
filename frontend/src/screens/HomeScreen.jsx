import React, { useState } from "react";
import {
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Search,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { formatDateTime } from "../api";
import { RoleBadge, StatusBadge } from "../components/StatusBadge";

export default function HomeScreen({
  user,
  rooms,
  myBookings,
  reminders,
  notifications,
  onNavigate,
  onQuickSearch,
}) {
  const [searchText, setSearchText] = useState("");
  const [minCap, setMinCap] = useState("");

  const availableCount = rooms.filter((r) => r.status === "AVAILABLE").length;
  const pendingCount = myBookings.filter((b) => b.status === "PENDING").length;
  const approvedCount = myBookings.filter((b) => b.status === "APPROVED").length;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onQuickSearch({ search: searchText, minCapacity: minCap });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(120deg, #4f46e5, #3730a3)",
          color: "#fff",
          border: "none",
          padding: 26,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Sparkles size={18} />
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>Xin chào, {user.full_name}</span>
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 24 }}>
              Hệ thống đặt lịch sử dụng phòng họp & phòng học
            </h2>
            <p style={{ margin: 0, opacity: 0.88, fontSize: 14, maxWidth: 640 }}>
              Tra cứu phòng trống theo thời gian thực, gửi yêu cầu đặt phòng nhanh chóng và theo dõi lịch trình của bạn.
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.16)", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
            Vai trò: {user.role}
          </div>
        </div>

        {/* Quick Search */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            marginTop: 20,
            background: "rgba(255,255,255,0.97)",
            padding: 10,
            borderRadius: 12,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "2 1 220px", display: "flex", alignItems: "center", gap: 8, paddingLeft: 8 }}>
            <Search size={18} color="#64748b" />
            <input
              style={{ border: "none", outline: "none", width: "100%", fontSize: 14, color: "#0f172a" }}
              placeholder="Tìm theo tên phòng hoặc tòa nhà (VD: A1-301, Lab...)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div style={{ flex: "1 1 140px", borderLeft: "1px solid #e2e8f0", paddingLeft: 12 }}>
            <input
              type="number"
              min="1"
              style={{ border: "none", outline: "none", width: "100%", fontSize: 14, color: "#0f172a" }}
              placeholder="Số người dự kiến"
              value={minCap}
              onChange={(e) => setMinCap(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Tìm phòng trống <ArrowRight size={16} />
          </button>
        </form>
      </div>

      {/* Nhắc lịch sắp tới (Reminders) */}
      {reminders.length > 0 && (
        <div className="card" style={{ borderLeft: "4px solid var(--warning)", background: "#fffdf5" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <BellRing size={20} color="#d97706" />
            <h3 style={{ margin: 0, fontSize: 16 }}>Nhắc lịch sử dụng phòng sắp tới (trong 24 giờ)</h3>
          </div>
          <div className="grid-2">
            {reminders.map((b) => (
              <div
                key={b.id}
                style={{
                  background: "#fff",
                  border: "1px solid #fde68a",
                  borderRadius: 10,
                  padding: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{b.room_name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{b.room_location}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#b45309", marginTop: 4 }}>
                    {formatDateTime(b.start_time)} — {new Date(b.end_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{b.purpose}</div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid-4">
        <div className="card" style={{ cursor: "pointer" }} onClick={() => onNavigate("rooms")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Phòng sẵn sàng</span>
            <Building2 size={20} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{availableCount}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Trên tổng {rooms.length} phòng</div>
        </div>

        <div className="card" style={{ cursor: "pointer" }} onClick={() => onNavigate("history")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Lịch đã được duyệt</span>
            <CheckCircle2 size={20} color="var(--success)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{approvedCount}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Sẵn sàng sử dụng</div>
        </div>

        <div className="card" style={{ cursor: "pointer" }} onClick={() => onNavigate("history")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Đang chờ phê duyệt</span>
            <Clock size={20} color="var(--warning)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{pendingCount}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Đang chờ quản lý xử lý</div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Thông báo mới</span>
            <CalendarClock size={20} color="var(--info)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{unreadCount}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Cập nhật trạng thái đặt lịch</div>
        </div>
      </div>

      {/* Recent Bookings & Notifications */}
      <div className="grid-2">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Lịch đặt gần đây của tôi</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate("history")}>
              Xem tất cả
            </button>
          </div>
          {myBookings.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "16px 0" }}>
              Bạn chưa có yêu cầu đặt phòng nào.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {myBookings.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: 12,
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{b.room_name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                      {formatDateTime(b.start_time)}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Thông báo gần nhất</h3>
            <RoleBadge role={user.role} />
          </div>
          {notifications.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "16px 0" }}>
              Chưa có thông báo nào.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {notifications.slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: 12,
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    background: n.is_read ? "#fff" : "var(--primary-soft)",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{n.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{n.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
