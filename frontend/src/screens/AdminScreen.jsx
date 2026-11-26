import React, { useEffect, useState } from "react";
import { BarChart3, Users, Building2, Calendar, Lock, Unlock, Plus, Trash2 } from "lucide-react";
import { apiRequest, formatDateTime, formatTime } from "../api";
import { StatusBadge } from "../components/StatusBadge";

export default function AdminScreen({ categories, equipmentList, onGlobalRefresh }) {
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [error, setError] = useState("");

  const [newCat, setNewCat] = useState("");
  const [newEq, setNewEq] = useState("");

  const loadAll = async () => {
    try {
      const [s, u, b] = await Promise.all([
        apiRequest("/stats"),
        apiRequest("/users"),
        apiRequest("/bookings?scope=all"),
      ]);
      setStats(s);
      setUsers(u);
      setAllBookings(b);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleToggleActive = async (u) => {
    setError("");
    try {
      await apiRequest(`/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRoleChange = async (u, role) => {
    setError("");
    try {
      await apiRequest(`/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    try {
      await apiRequest("/categories", { method: "POST", body: JSON.stringify({ name: newCat }) });
      setNewCat("");
      onGlobalRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    if (!newEq.trim()) return;
    try {
      await apiRequest("/equipment", { method: "POST", body: JSON.stringify({ name: newEq }) });
      setNewEq("");
      onGlobalRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCat = async (id) => {
    try {
      await apiRequest(`/categories/${id}`, { method: "DELETE" });
      onGlobalRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteEq = async (id) => {
    try {
      await apiRequest(`/equipment/${id}`, { method: "DELETE" });
      onGlobalRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="tabs">
          <button className={`tab-btn ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>
            <BarChart3 size={15} style={{ verticalAlign: "middle", marginRight: 5 }} /> Thống kê & Hiệu suất
          </button>
          <button className={`tab-btn ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
            <Users size={15} style={{ verticalAlign: "middle", marginRight: 5 }} /> Tài khoản & Phân quyền
          </button>
          <button className={`tab-btn ${tab === "catalog" ? "active" : ""}`} onClick={() => setTab("catalog")}>
            <Building2 size={15} style={{ verticalAlign: "middle", marginRight: 5 }} /> Loại phòng & Thiết bị
          </button>
          <button className={`tab-btn ${tab === "bookings" ? "active" : ""}`} onClick={() => setTab("bookings")}>
            <Calendar size={15} style={{ verticalAlign: "middle", marginRight: 5 }} /> Toàn bộ lịch đặt
          </button>
        </div>

        {tab === "stats" && stats && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="grid-4">
              <div className="card" style={{ background: "var(--surface-muted)" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Tổng số phòng</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{stats.total_rooms}</div>
                <div style={{ fontSize: 12, color: "var(--success)" }}>{stats.available_rooms} sẵn sàng • {stats.maintenance_rooms} bảo trì</div>
              </div>
              <div className="card" style={{ background: "var(--surface-muted)" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Tổng người dùng</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{stats.total_users}</div>
              </div>
              <div className="card" style={{ background: "var(--surface-muted)" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Tổng lượt đặt phòng</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{stats.total_bookings}</div>
              </div>
              <div className="card" style={{ background: "var(--surface-muted)" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Đã duyệt / Hoàn tất</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>
                  {(stats.by_status.APPROVED || 0) + (stats.by_status.COMPLETED || 0)}
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Hiệu suất sử dụng theo từng phòng</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {stats.room_utilization.map((r) => (
                  <div key={r.room_id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                      <strong>{r.room_name}</strong>
                      <span style={{ color: "var(--text-muted)" }}>
                        {r.booking_count} lượt • {r.total_hours} giờ ({r.utilization_pct}%)
                      </span>
                    </div>
                    <div style={{ height: 10, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.max(r.utilization_pct, 3)}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #4f46e5, #06b6d4)",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>SĐT</th>
                  <th>Vai trò (RBAC)</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || "—"}</td>
                    <td>
                      <select
                        className="form-control"
                        style={{ width: "auto", padding: "5px 10px" }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                      >
                        <option value="USER">USER</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? "badge-available" : "badge-inactive"}`}>
                        {u.is_active ? "Hoạt động" : "Đã khóa"}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleToggleActive(u)}>
                        {u.is_active ? <><Lock size={13} /> Khóa</> : <><Unlock size={13} /> Mở khóa</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "catalog" && (
          <div className="grid-2">
            <div>
              <h3 style={{ fontSize: 16, marginTop: 0 }}>Danh mục loại phòng</h3>
              <form onSubmit={handleAddCategory} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  className="form-control"
                  placeholder="Tên loại phòng mới..."
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" type="submit"><Plus size={15} /> Thêm</button>
              </form>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {categories.map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 9 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCat(c.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 16, marginTop: 0 }}>Danh mục thiết bị</h3>
              <form onSubmit={handleAddEquipment} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  className="form-control"
                  placeholder="Tên thiết bị mới..."
                  value={newEq}
                  onChange={(e) => setNewEq(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" type="submit"><Plus size={15} /> Thêm</button>
              </form>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {equipmentList.map((eq) => (
                  <div key={eq.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 9 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{eq.name}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteEq(eq.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Người đặt</th>
                  <th>Phòng</th>
                  <th>Thời gian</th>
                  <th>Mục đích</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {allBookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.user_name}</td>
                    <td style={{ fontWeight: 600 }}>{b.room_name}</td>
                    <td>{formatDateTime(b.start_time)} - {formatTime(b.end_time)}</td>
                    <td>{b.purpose}</td>
                    <td><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
