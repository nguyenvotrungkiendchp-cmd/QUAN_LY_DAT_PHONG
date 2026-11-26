import React from "react";

const STATUS_MAP = {
  PENDING: { label: "Chờ duyệt", cls: "badge-pending" },
  APPROVED: { label: "Đã duyệt", cls: "badge-approved" },
  REJECTED: { label: "Từ chối", cls: "badge-rejected" },
  CANCELLED: { label: "Đã hủy", cls: "badge-cancelled" },
  COMPLETED: { label: "Hoàn tất", cls: "badge-completed" },
  AVAILABLE: { label: "Sẵn sàng", cls: "badge-available" },
  MAINTENANCE: { label: "Bảo trì", cls: "badge-maintenance" },
  INACTIVE: { label: "Ngừng hoạt động", cls: "badge-inactive" },
};

export function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || { label: status, cls: "badge-cancelled" };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

export function RoleBadge({ role }) {
  const labels = {
    USER: "Người đặt phòng (USER)",
    MANAGER: "Quản lý phòng (MANAGER)",
    ADMIN: "Quản trị viên (ADMIN)",
  };
  return <span className="badge badge-role">{labels[role] || role}</span>;
}
