import React, { useState } from "react";
import { History, XCircle, Clock, X } from "lucide-react";
import { apiRequest, formatDateTime, formatTime } from "../api";
import { StatusBadge } from "../components/StatusBadge";

const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  { key: "PENDING", label: "Chờ duyệt" },
  { key: "APPROVED", label: "Đã duyệt" },
  { key: "REJECTED", label: "Từ chối" },
  { key: "CANCELLED", label: "Đã hủy" },
  { key: "COMPLETED", label: "Hoàn tất" },
];

export default function MyBookingsScreen({ bookings, onRefresh }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [historyModal, setHistoryModal] = useState(null);
  const [error, setError] = useState("");

  const filtered = statusFilter ? bookings.filter((b) => b.status === statusFilter) : bookings;

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy lịch đặt phòng này không?")) return;
    setError("");
    try {
      await apiRequest(`/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ note: "Người đặt tự hủy lịch trên hệ thống." }),
      });
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Lịch sử & Trạng thái đặt phòng của tôi</h2>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="tabs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${statusFilter === t.key ? "active" : ""}`}
            onClick={() => setStatusFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
          Không có yêu cầu đặt phòng nào trong mục này.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Phòng</th>
                <th>Thời gian sử dụng</th>
                <th>Số người</th>
                <th>Mục đích</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const canCancel =
                  (b.status === "PENDING" || b.status === "APPROVED") &&
                  new Date(b.start_time) > new Date();
                return (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.room_name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{b.room_location}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{formatDateTime(b.start_time)}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Đến {formatTime(b.end_time)}
                      </div>
                    </td>
                    <td>{b.number_of_people}</td>
                    <td style={{ maxWidth: 260 }}>
                      <div>{b.purpose}</div>
                      {b.rejection_reason && (
                        <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>
                          Lý do từ chối: {b.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setHistoryModal(b)}
                          title="Xem lịch sử thay đổi"
                        >
                          <History size={14} /> Lịch sử
                        </button>
                        {canCancel && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(b.id)}>
                            <XCircle size={14} /> Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {historyModal && (
        <div className="modal-backdrop" onClick={() => setHistoryModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Lịch sử xử lý — {historyModal.room_name}</h3>
              <button className="icon-btn" onClick={() => setHistoryModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {historyModal.history.map((h) => (
                <div key={h.id} style={{ padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-muted)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={14} color="var(--primary)" />
                      <strong style={{ fontSize: 13 }}>{h.actor_name}</strong>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDateTime(h.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {h.old_status ? `${h.old_status} → ` : "Khởi tạo → "}
                    <strong>{h.new_status}</strong>
                  </div>
                  {h.note && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>{h.note}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
