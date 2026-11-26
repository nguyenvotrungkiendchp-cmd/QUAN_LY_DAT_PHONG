import React, { useEffect, useState } from "react";
import { MapPin, Users, Search, Calendar, Filter, Eye, CalendarPlus, RotateCcw } from "lucide-react";
import { apiRequest } from "../api";
import { StatusBadge } from "../components/StatusBadge";

export default function RoomsScreen({
  categories,
  equipmentList,
  initialFilter,
  onSelectRoom,
  onBookRoom,
}) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState(initialFilter?.search || "");
  const [categoryId, setCategoryId] = useState("");
  const [minCapacity, setMinCapacity] = useState(initialFilter?.minCapacity || "");
  const [selectedEq, setSelectedEq] = useState([]);
  const [checkDate, setCheckDate] = useState("");
  const [startHour, setStartHour] = useState("08:00");
  const [endHour, setEndHour] = useState("10:00");

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (categoryId) params.set("category_id", categoryId);
      if (minCapacity) params.set("min_capacity", minCapacity);
      if (selectedEq.length > 0) params.set("equipment_ids", selectedEq.join(","));
      if (checkDate && startHour && endHour) {
        params.set("start_time", `${checkDate}T${startHour}:00`);
        params.set("end_time", `${checkDate}T${endHour}:00`);
      }
      const data = await apiRequest(`/rooms?${params.toString()}`);
      setRooms(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [categoryId, selectedEq]);

  const toggleEq = (id) => {
    setSelectedEq((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const resetFilters = () => {
    setSearch("");
    setCategoryId("");
    setMinCapacity("");
    setSelectedEq([]);
    setCheckDate("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Filter Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>
            <Filter size={18} color="var(--primary)" />
            Tìm kiếm & Lọc phòng trống
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
            <RotateCcw size={14} /> Đặt lại bộ lọc
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchRooms();
          }}
        >
          <div className="grid-4">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tên phòng / Vị trí</label>
              <input
                className="form-control"
                placeholder="VD: A1-301, Tòa A2..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Loại phòng</label>
              <select className="form-control" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Tất cả loại phòng</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Sức chứa tối thiểu</label>
              <input
                className="form-control"
                type="number"
                min="1"
                placeholder="Số người"
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Kiểm tra trống theo ngày</label>
              <input
                className="form-control"
                type="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
              />
            </div>
          </div>

          {checkDate && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
              <div className="form-group" style={{ marginBottom: 0, width: 150 }}>
                <label className="form-label">Từ giờ</label>
                <input className="form-control" type="time" value={startHour} onChange={(e) => setStartHour(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0, width: 150 }}>
                <label className="form-label">Đến giờ</label>
                <input className="form-control" type="time" value={endHour} onChange={(e) => setEndHour(e.target.value)} />
              </div>
              <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600, paddingBottom: 8 }}>
                Chỉ hiển thị phòng còn trống trong khung giờ này
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Thiết bị:</span>
              {equipmentList.map((eq) => {
                const active = selectedEq.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleEq(eq.id)}
                    className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}
                  >
                    {eq.name}
                  </button>
                );
              })}
            </div>

            <button type="submit" className="btn btn-primary">
              <Search size={16} /> Tìm kiếm
            </button>
          </div>
        </form>
      </div>

      {/* Room Cards */}
      {loading ? (
        <div className="card">Đang tải danh sách phòng...</div>
      ) : rooms.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          Không tìm thấy phòng phù hợp với tiêu chí lọc.
        </div>
      ) : (
        <div className="grid-3">
          {rooms.map((room) => (
            <div key={room.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>{room.category_name}</div>
                    <h3 style={{ margin: "2px 0 0", fontSize: 17 }}>{room.name}</h3>
                  </div>
                  <StatusBadge status={room.status} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: "var(--text-muted)", margin: "12px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <MapPin size={15} /> {room.location}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Users size={15} /> Sức chứa tối đa: <strong style={{ color: "var(--text)" }}>{room.capacity} người</strong>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {room.equipment.map((eq) => (
                    <span
                      key={eq.id}
                      style={{
                        fontSize: 11.5,
                        background: "var(--surface-muted)",
                        border: "1px solid var(--border)",
                        padding: "2px 8px",
                        borderRadius: 6,
                        color: "var(--text-muted)",
                      }}
                    >
                      {eq.name}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onSelectRoom(room.id)}>
                  <Eye size={14} /> Chi tiết & Lịch trống
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  disabled={room.status !== "AVAILABLE"}
                  onClick={() =>
                    onBookRoom(room.id, checkDate ? { date: checkDate, startHour, endHour } : null)
                  }
                >
                  <CalendarPlus size={14} /> Đặt phòng
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
