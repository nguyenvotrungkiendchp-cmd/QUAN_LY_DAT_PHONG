import React, { useEffect, useState } from "react";
import { AlertTriangle, Check, X, Plus, Wrench } from "lucide-react";
import { apiRequest, formatDateTime, formatTime } from "../api";
import { StatusBadge } from "../components/StatusBadge";

export default function ManagerScreen({ user, categories, equipmentList, onGlobalRefresh }) {
  const [tab, setTab] = useState("approvals");
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Add room modal
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: "",
    location: "",
    capacity: 20,
    category_id: categories[0]?.id || 1,
    equipment_ids: [],
  });

  const loadData = async () => {
    try {
      const [bData, rData] = await Promise.all([
        apiRequest("/bookings?scope=managed"),
        apiRequest("/rooms?include_all=true"),
      ]);
      setBookings(bData);
      const myRooms = user.role === "ADMIN" ? rData : rData.filter((r) => r.manager_id === user.id);
      setRooms(myRooms);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (bookingId) => {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/bookings/${bookingId}/approve`, { method: "POST" });
      setSuccess("Đã phê duyệt yêu cầu đặt phòng và gửi thông báo cho người đặt.");
      loadData();
      onGlobalRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/bookings/${rejectTarget.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejection_reason: rejectReason }),
      });
      setRejectTarget(null);
      setRejectReason("");
      setSuccess("Đã từ chối yêu cầu đặt phòng.");
      loadData();
      onGlobalRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRoomStatus = async (roomId, status) => {
    setError("");
    try {
      await apiRequest(`/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      loadData();
      onGlobalRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await apiRequest("/rooms", {
        method: "POST",
        body: JSON.stringify({
          ...newRoom,
          capacity: Number(newRoom.capacity),
          category_id: Number(newRoom.category_id),
        }),
      });
      setShowAddRoom(false);
      setNewRoom({ name: "", location: "", capacity: 20, category_id: categories[0]?.id || 1, equipment_ids: [] });
      loadData();
      onGlobalRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const pendingList = bookings.filter((b) => b.status === "PENDING");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <div className="tabs">
          <button className={`tab-btn ${tab === "approvals" ? "active" : ""}`} onClick={() => setTab("approvals")}>
            Phê duyệt yêu cầu ({pendingList.length} chờ)
          </button>
          <button className={`tab-btn ${tab === "rooms" ? "active" : ""}`} onClick={() => setTab("rooms")}>
            Phòng phụ trách & Bảo trì ({rooms.length})
          </button>
        </div>

        {tab === "approvals" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Người đặt</th>
                  <th>Phòng</th>
                  <th>Thời gian</th>
                  <th>Mục đích & Số người</th>
                  <th>Trạng thái</th>
                  <th>Xét duyệt</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.user_name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{b.user_email}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.room_name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{b.room_location}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{formatDateTime(b.start_time)}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Đến {formatTime(b.end_time)}</div>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <div>{b.purpose}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Số người: {b.number_of_people}</div>
                      {b.has_conflict_now && (
                        <div style={{ fontSize: 12, color: "var(--danger)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                          <AlertTriangle size={14} /> Cảnh báo: Đã có lịch APPROVED trùng giờ!
                        </div>
                      )}
                    </td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>
                      {b.status === "PENDING" ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-success btn-sm"
                            disabled={b.has_conflict_now}
                            onClick={() => handleApprove(b.id)}
                          >
                            <Check size={14} /> Duyệt
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => { setRejectTarget(b); setRejectReason(""); }}
                          >
                            <X size={14} /> Từ chối
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "rooms" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddRoom(true)}>
                <Plus size={15} /> Thêm phòng mới
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tên phòng</th>
                    <th>Loại phòng</th>
                    <th>Vị trí</th>
                    <th>Sức chứa</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td>{r.category_name}</td>
                      <td>{r.location}</td>
                      <td>{r.capacity} người</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={r.status === "AVAILABLE"}
                            onClick={() => handleRoomStatus(r.id, "AVAILABLE")}
                          >
                            Sẵn sàng
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={r.status === "MAINTENANCE"}
                            onClick={() => handleRoomStatus(r.id, "MAINTENANCE")}
                          >
                            <Wrench size={13} /> Bảo trì
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={r.status === "INACTIVE"}
                            onClick={() => handleRoomStatus(r.id, "INACTIVE")}
                          >
                            Ngừng
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="modal-backdrop" onClick={() => setRejectTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Từ chối yêu cầu đặt {rejectTarget.room_name}</h3>
              <button className="icon-btn" onClick={() => setRejectTarget(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="form-group">
                <label className="form-label">Lý do từ chối *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  required
                  placeholder="Nhập lý do cụ thể để thông báo cho người đặt..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setRejectTarget(null)}>Hủy</button>
                <button type="submit" className="btn btn-danger">Xác nhận từ chối</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="modal-backdrop" onClick={() => setShowAddRoom(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm phòng mới</h3>
              <button className="icon-btn" onClick={() => setShowAddRoom(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label className="form-label">Tên phòng *</label>
                <input className="form-control" required value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Vị trí *</label>
                <input className="form-control" required value={newRoom.location} onChange={(e) => setNewRoom({ ...newRoom, location: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Loại phòng *</label>
                  <select className="form-control" value={newRoom.category_id} onChange={(e) => setNewRoom({ ...newRoom, category_id: e.target.value })}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sức chứa *</label>
                  <input className="form-control" type="number" min="1" required value={newRoom.capacity} onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Thiết bị</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {equipmentList.map((eq) => {
                    const active = newRoom.equipment_ids.includes(eq.id);
                    return (
                      <button
                        type="button"
                        key={eq.id}
                        className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}
                        onClick={() =>
                          setNewRoom({
                            ...newRoom,
                            equipment_ids: active
                              ? newRoom.equipment_ids.filter((id) => id !== eq.id)
                              : [...newRoom.equipment_ids, eq.id],
                          })
                        }
                      >
                        {eq.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRoom(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu phòng</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
