import React, { useState } from "react";
import { Building2, CalendarCheck, ShieldCheck, BellRing, LogIn, UserPlus } from "lucide-react";
import { apiRequest, setToken } from "../api";

export default function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setToken(res.access_token);
        onAuthSuccess(res.user);
      } else {
        if (password.length < 8) {
          throw new Error("Mật khẩu phải có tối thiểu 8 ký tự.");
        }
        if (password !== confirmPassword) {
          throw new Error("Xác nhận mật khẩu không trùng khớp.");
        }
        const res = await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            confirm_password: confirmPassword,
            full_name: fullName,
            phone: phone || null,
          }),
        });
        setToken(res.access_token);
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail, demoPass) => {
    setError("");
    setLoading(true);
    try {
      const res = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: demoEmail, password: demoPass }),
      });
      setToken(res.access_token);
      onAuthSuccess(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-hero">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>PTIT RoomBooking</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Học viện Công nghệ Bưu chính Viễn thông</div>
              </div>
            </div>

            <h1 style={{ fontSize: 28, lineHeight: 1.25, margin: "0 0 14px" }}>
              Nền tảng đặt lịch sử dụng phòng họp & phòng học
            </h1>
            <p style={{ opacity: 0.9, fontSize: 14.5, margin: "0 0 28px" }}>
              Giải pháp quản lý tập trung thông tin phòng, kiểm tra lịch trống theo thời gian thực, tự động tránh trùng lịch và nhắc lịch thông minh.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CalendarCheck size={18} />
                <span>Xem lịch trống trực quan & đăng ký sử dụng nhanh chóng</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldCheck size={18} />
                <span>Kiểm tra xung đột lịch tự động khi đặt & khi phê duyệt</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BellRing size={18} />
                <span>Thông báo trạng thái & nhắc lịch sử dụng sắp tới</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 32 }}>
            Đồ án môn học: Kiến trúc và thiết kế phần mềm — Nhóm 19
          </div>
        </div>

        <div className="auth-form-side">
          <div className="tabs" style={{ marginBottom: 22 }}>
            <button
              type="button"
              className={`tab-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => { setMode("login"); setError(""); }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`tab-btn ${mode === "register" ? "active" : ""}`}
              onClick={() => { setMode("register"); setError(""); }}
            >
              Đăng ký tài khoản
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <>
                <div className="form-group">
                  <label className="form-label">Họ và tên *</label>
                  <input
                    className="form-control"
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input
                    className="form-control"
                    type="tel"
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                className="form-control"
                type="email"
                required
                placeholder="email@ptit.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu *</label>
              <input
                className="form-control"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === "register" && (
              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu *</label>
                <input
                  className="form-control"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <button className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={loading}>
              {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
              {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập hệ thống" : "Tạo tài khoản"}
            </button>
          </form>

          {mode === "login" && (
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>
                ĐĂNG NHẬP NHANH (TÀI KHOẢN KIỂM THỬ)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="demo-card" onClick={() => quickLogin("user1234@gmail.com", "12345678")}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>Người đặt phòng (USER)</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>user1234@gmail.com / 12345678</div>
                  </div>
                  <span className="badge badge-role">Chọn</span>
                </div>
                <div className="demo-card" onClick={() => quickLogin("manager123@gmail.com", "abcd12345")}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>Quản lý phòng (MANAGER)</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>manager123@gmail.com / abcd12345</div>
                  </div>
                  <span className="badge badge-role">Chọn</span>
                </div>
                <div className="demo-card" onClick={() => quickLogin("admin@ptit.edu.vn", "admin1234")}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>Quản trị viên (ADMIN)</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>admin@ptit.edu.vn / admin1234</div>
                  </div>
                  <span className="badge badge-role">Chọn</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
