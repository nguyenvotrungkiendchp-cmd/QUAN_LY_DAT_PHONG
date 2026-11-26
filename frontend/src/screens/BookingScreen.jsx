import React, { useEffect, useState } from "react";
import { AlertTriangle, CalendarPlus, CheckCircle2, Info } from "lucide-react";
import { apiRequest } from "../api";

export default function BookingScreen({ rooms, initialRoomId, initialSlot, onBookingCreated }) {
  const availableRooms = rooms.filter((r) => r.status === "AVAILABLE");
  const defaultRoomId = initialRoomId || (availableRooms[0]?.id ? String(availableRooms[0].id) : "");

  const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const [roomId, setRoomId] = useState(String(defaultRoomId));
  const [date, setDate] = useState(initialSlot?.date || tomorrowStr());
  const [startHour, setStartHour] = useState(initialSlot?.startHour || "09:00");
  const [endHour, setEndHour] = useState(initialSlot?.endHour || "11:00");
  const [numberOfPeople, setNumberOfPeople] = useState("10");
  const [purpose, setPurpose] = useState("");

  const [conflictInfo, setConflictInfo] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedRoom = rooms.find((r) => String(r.id) === String(roomId));

  useEffect(() => {
    if (initialRoomId) setRoomId(String(initialRoomId));
    if (initialSlot) {
      if (initialSlot.date) setDate(initialSlot.date);
      if (initialSlot.startHour) setStartHour(initialSlot.startHour);
      if (initialSlot.endHour) setEndHour(initialSlot.endHour);
    }
  }, [initialRoomId, initialSlot]);

  useEffect(() => {
    const check = async () => {
      if (!roomId || !date || !startHour || !endHour) {
        setConflictInfo(null);
        return;
      }
      if (endHour <= startHour) {
        setConflictInfo({ has_conflict: true, message: "Thời gian kết thúc phải lớn hơn thời gian bắt đầu." });
        return;
      }
      try {
        const res = await apiRequest(
          `/bookings/check-conflict?room_id=${roomId}&start_time=${date}T${startHour}:00&end_time=${date}T${endHour}:00`
        );
        setConflictInfo(res);
      } catch {
        setConflictInfo(null);
      }
    };
    check();
  }, [roomId, date, startHour, endHour]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await apiRequest("/bookings", {
        method: "POST",
        body: JSON.stringify({
          room_id: Number(roomId),
          start_time: `${date}T${startHour}:00`,
          end_time: `${date}T${endHour}:00`,
          number_of_people: Number(numberOfPeople),
          purpose,
        }),
      });
      setSuccess("Gửi yêu cầu đặt phòng thành công! Trạng thái hiện tại: PENDING (Đang chờ phê duyệt).");
      setPurpose("");
      onBookingCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid-2" style={{ alignItems: "start" }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <CalendarPlus size={20} color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: 18 }}>Đăng ký đặt lịch sử dụng phòng</h2>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Chọn phòng *</label>
            <select className="form-control" required value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">-- Chọn phòng --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id} disabled={r.status !== "AVAILABLE"}>
                  {r.name} — {r.location} (Tối đa {r.capacity} người) {r.status !== "AVAILABLE" ? `[${r.status}]` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Ngày sử dụng *</label>
              <input className="form-control" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ bắt đầu *</label>
              <input className="form-control" type="time" required value={startHour} onChange={(e) => setStartHour(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ kết thúc *</label>
              <input className="form-control" type="time" required value={endHour} onChange={(e) => setEndHour(e.target.value)} />
            </div>
          </div>

          {conflictInfo && (
            <div className={`alert ${conflictInfo.has_conflict ? "alert-danger" : "alert-success"}`}>
              {conflictInfo.has_conflict ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>{conflictInfo.message}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Số lượng người tham gia * {selectedRoom ? `(Tối đa ${selectedRoom.capacity} người)` : ""}
            </label>
            <input
              className="form-control"
              type="number"
              min="1"
              max={selectedRoom?.capacity || 500}
              required
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mục đích sử dụng *</label>
            <textarea
              className="form-control"
              rows={3}
              required
              placeholder="VD: Họp nhóm đồ án môn học, tổ chức seminar, học nhóm..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" style={{ width: "100%" }} disabled={submitting || conflictInfo?.has_conflict}>
            {submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu đặt phòng"}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Info size={18} color="var(--info)" />
          <h3 style={{ margin: 0, fontSize: 16 }}>Quy tắc nghiệp vụ đặt phòng</h3>
        </div>
        <ul style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5, color: "var(--text-muted)" }}>
          <li>Thời gian bắt đầu sử dụng phải lớn hơn thời điểm hiện tại.</li>
          <li>Thời gian kết thúc phải lớn hơn thời gian bắt đầu.</li>
          <li>Số lượng người tham gia không được vượt quá sức chứa tối đa của phòng.</li>
          <li>Không thể đặt phòng đang ở trạng thái <strong>Bảo trì (MAINTENANCE)</strong> hoặc <strong>Ngừng hoạt động</strong>.</li>
          <li>Hệ thống tự động kiểm tra trùng lịch với các yêu cầu đã được phê duyệt (<code>APPROVED</code>) cả lúc gửi yêu cầu và lúc người quản lý phê duyệt.</li>
          <li>Hai lịch chạm biên (giờ kết thúc bằng giờ bắt đầu của lịch tiếp theo) được phép đặt bình thường.</li>
        </ul>

        {selectedRoom && (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 10, background: "var(--surface-muted)", border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{selectedRoom.name}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              Vị trí: {selectedRoom.location} • Sức chứa: {selectedRoom.capacity} người
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {selectedRoom.equipment.map((eq) => (
                <span key={eq.id} className="badge badge-role">{eq.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
