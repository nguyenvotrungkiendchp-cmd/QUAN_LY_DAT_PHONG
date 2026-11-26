import React, { useEffect, useState } from "react";
import { ArrowLeft, Calendar, CalendarPlus, MapPin, Users, UserCheck, Wrench } from "lucide-react";
import { apiRequest, formatTime } from "../api";
import { StatusBadge } from "../components/StatusBadge";

const SLOTS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00",
];

export default function RoomDetailScreen({ roomId, onBack, onBookRoom }) {
  const [room, setRoom] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [roomData, schedData] = await Promise.all([
          apiRequest(`/rooms/${roomId}`),
          apiRequest(
            `/rooms/${roomId}/schedule?date_from=${selectedDate}T00:00:00&date_to=${selectedDate}T23:59:59`
          ),
        ]);
        setRoom(roomData);
        setSchedule(schedData);
      } finally {
        setLoading(false);
      }
    };
    if (roomId) load();
  }, [roomId, selectedDate]);

  if (loading || !room) {
    return <div className="card">Đang tải thông tin phòng...</div>;
  }

  const getSlotBooking = (hourStr) => {
    const slotStart = new Date(`${selectedDate}T${hourStr}:00`);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
    return schedule.find((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return slotStart < bEnd && slotEnd > bStart;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={15} /> Quay lại danh sách phòng
        </button>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>{room.category_name}</div>
            <h2 style={{ margin: "4px 0 8px", fontSize: 22 }}>{room.name}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, fontSize: 14, color: "var(--text-muted)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <MapPin size={16} /> {room.location}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Users size={16} /> Sức chứa: <strong style={{ color: "var(--text)" }}>{room.capacity} người</strong>
              </span>
              {room.manager_name && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <UserCheck size={16} /> Phụ trách: <strong style={{ color: "var(--text)" }}>{room.manager_name}</strong>
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusBadge status={room.status} />
            <button
              className="btn btn-primary"
              disabled={room.status !== "AVAILABLE"}
              onClick={() => onBookRoom(room.id, { date: selectedDate, startHour: "08:00", endHour: "10:00" })}
            >
              <CalendarPlus size={16} /> Đặt phòng này
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Wrench size={15} /> Trang thiết bị trong phòng
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {room.equipment.length === 0 ? (
              <span style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Không có thông tin thiết bị</span>
            ) : (
              room.equipment.map((eq) => (
                <span key={eq.id} className="badge" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  {eq.name}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lịch trống trực quan theo ngày */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: 16 }}>Lịch trống & Lịch đã đặt theo ngày</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Chọn ngày:</label>
            <input
              type="date"
              className="form-control"
              style={{ width: "auto" }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid-4" style={{ gap: 10 }}>
          {SLOTS.map((hour) => {
            const nextHour = `${String(parseInt(hour.slice(0, 2), 10) + 1).padStart(2, "0")}:00`;
            const booking = getSlotBooking(hour);
            const isApproved = booking?.status === "APPROVED";
            const isPending = booking?.status === "PENDING";

            return (
              <div
                key={hour}
                onClick={() => {
                  if (!isApproved && room.status === "AVAILABLE") {
                    onBookRoom(room.id, { date: selectedDate, startHour: hour, endHour: nextHour });
                  }
                }}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid",
                  borderColor: isApproved ? "#fca5a5" : isPending ? "#fcd34d" : "#a7f3d0",
                  background: isApproved ? "#fef2f2" : isPending ? "#fffbeb" : "#ecfdf5",
                  cursor: !isApproved && room.status === "AVAILABLE" ? "pointer" : "default",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 14 }}>{hour} - {nextHour}</strong>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: isApproved ? "#b91c1c" : isPending ? "#b45309" : "#047857" }}>
                    {isApproved ? "Đã duyệt" : isPending ? "Chờ duyệt" : "Còn trống"}
                  </span>
                </div>
                {booking && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {booking.user_name} ({formatTime(booking.start_time)}-{formatTime(booking.end_time)})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
