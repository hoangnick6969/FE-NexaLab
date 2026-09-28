import { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Atom,
  LayoutDashboard,
  FlaskConical,
  BookOpen,
  Users,
  ChartNoAxesCombined,
  Bookmark,
  LogOut,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Settings,
  ArrowRight,
  GraduationCap,
  Search,
  User,
  BarChart2,
  HelpCircle,
  Flag,
  Award,
  Flame,
} from "lucide-react";
import { api, useAuth, restore } from "./api";
import { queryClient } from "./main";
import { Badge, Empty, ErrorBox, Field, useAction, Breadcrumb } from "./ui";
import {
  Lessons,
  Classes,
  ProgressPage,
  Saved,
  SettingsPage,
  AdminPage,
  WebGLFallbackPage,
} from "./pages";
const Lab = lazy(() => import("./labs/Lab"));
const names = {
  STUDENT: "Học sinh",
  TEACHER: "Giáo viên",
  PARENT: "Phụ huynh",
  ADMIN: "Quản trị viên",
};
export default function App() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const location = useLocation();
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    restore().finally(() => setReady(true));
  }, []);
  if (!ready)
    return (
      <div className="boot">
        <Atom size={42} />
        <p>Đang tải dữ liệu…</p>
      </div>
    );
  if (!user) return <Login />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Atom size={25} />
          </span>
          NexaLab<span className="brand-dot">.</span>
        </Link>
        <div className="workspace">
          <span className="workspace-icon">
            <GraduationCap size={20} />
          </span>
          <div>
            <b>Không gian học tập</b>
            <small>Khoa học tự nhiên · THCS</small>
          </div>
        </div>
        <div className="sidebar-scroll">
          <p className="nav-caption">DANH MỤC CHÍNH</p>
          <nav>
            <NavLink end to="/">
              <LayoutDashboard />
              Tổng quan
            </NavLink>
            {["STUDENT", "TEACHER"].includes(user.role) && (
              <NavLink to="/labs">
                <FlaskConical />
                Phòng thí nghiệm <span className="nav-count">3</span>
              </NavLink>
            )}
            <NavLink to="/lessons">
              <BookOpen />
              Thư viện bài học
            </NavLink>
            {["STUDENT", "TEACHER", "ADMIN"].includes(user.role) && (
              <NavLink to="/classes">
                <Users />
                Lớp học của tôi
              </NavLink>
            )}
            <NavLink to="/progress">
              <ChartNoAxesCombined />
              {user.role === "PARENT" ? "Tiến độ của con" : "Tiến độ học tập"}
            </NavLink>
            {user.role === "STUDENT" && (
              <NavLink to="/saved">
                <Bookmark />
                Thí nghiệm đã lưu
              </NavLink>
            )}
            {user.role === "ADMIN" && (
              <NavLink to="/admin">
                <Settings />
                Quản trị
              </NavLink>
            )}
          </nav>
          <NavLink className="settings-link" to="/settings">
            <Settings size={18} />
            Cài đặt tài khoản
          </NavLink>
        </div>
        <div className="user-card">
          <span className="avatar">
            {user.fullName.split(" ").at(-1)?.slice(0, 1)}
          </span>
          <div>
            <b>{user.fullName}</b>
            <small>{names[user.role]}</small>
          </div>
          <button
            title="Đăng xuất"
            className="icon-button"
            onClick={async () => {
              await api("/auth/logout", "POST");
              useAuth.getState().set(null, null);
              queryClient.clear();
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <Breadcrumb 
            items={[
              { label: 'Không gian học tập' },
              { label: 'NexaLab' }
            ]} 
          />

          {/* ── Search ── */}
          <div className="topbar-search" ref={searchRef}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm bài học, chủ đề..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              autoComplete="off"
            />
            {searchFocused && (
              <div className="search-results">
                <div className="search-results-header">Gợi ý</div>
                {[
                  { icon: <FlaskConical size={16} />, iconBg: '#DBEAFE', iconColor: '#1D4ED8', title: 'Phản ứng oxi hoá khử', meta: 'Hóa học · Lớp 9' },
                  { icon: <BookOpen size={16} />, iconBg: '#F0FDF4', iconColor: '#16A34A', title: 'Mạch điện đơn giản', meta: 'Vật lý · Lớp 8' },
                  { icon: <FlaskConical size={16} />, iconBg: '#FFF7ED', iconColor: '#EA580C', title: 'Khúc xạ ánh sáng', meta: 'Vật lý · Lớp 7' },
                  { icon: <BookOpen size={16} />, iconBg: '#FDF4FF', iconColor: '#9333EA', title: 'Tế bào sinh vật', meta: 'Sinh học · Lớp 8' },
                ].filter(r => !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.meta.toLowerCase().includes(searchQuery.toLowerCase()) || searchQuery.length === 0).map((r, i) => (
                  <div key={i} className="search-result-item">
                    <div className="search-result-icon" style={{ background: r.iconBg, color: r.iconColor }}>{r.icon}</div>
                    <div>
                      <div className="search-result-title">{r.title}</div>
                      <div className="search-result-meta">{r.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right actions ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#FEF2F2', color: '#E11D48', padding: '6px 12px', borderRadius: '999px', fontWeight: 600, fontSize: '12px', gap: '5px' }}>
              <Flame size={14} />
              <span>3 ngày</span>
            </div>

            {/* Notification dropdown */}
            <div className="tb-dropdown-wrap" ref={notifRef}>
              <button 
                className="icon-button" 
                onClick={() => { setShowNotifications(p => !p); setShowProfile(false); }}
                style={{ position: 'relative', background: showNotifications ? '#EFF6FF' : '#F1F5F9', borderRadius: '999px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: showNotifications ? 'var(--blue)' : undefined }}
              >
                <Bell size={16} />
                <span style={{ position: 'absolute', top: '0px', right: '0px', background: '#E11D48', color: 'white', fontSize: '9px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', fontWeight: 700 }}>2</span>
              </button>
              {showNotifications && (
                <div className="tb-dropdown notif-dropdown">
                  <div className="notif-dropdown-header">
                    <h4>Thông báo</h4>
                    <button className="notif-mark-all">Xem tất cả</button>
                  </div>
                  <div className="notif-list">
                    <div className="notif-item unread">
                      <div className="notif-dot" />
                      <div className="notif-item-icon" style={{ background: '#DBEAFE', color: '#1D4ED8' }}><FlaskConical size={16} /></div>
                      <div className="notif-item-body">
                        <div className="notif-item-title">Thử nghiệm Hóa học đã được chấm điểm</div>
                        <div className="notif-item-desc">Bài "Phản ứng Oxi hoá khử" của bạn đã được giáo viên xem xét.</div>
                        <div className="notif-item-time">5 phút trước</div>
                      </div>
                    </div>
                    <div className="notif-item unread">
                      <div className="notif-dot" />
                      <div className="notif-item-icon" style={{ background: '#FEF9C3', color: '#CA8A04' }}><Users size={16} /></div>
                      <div className="notif-item-body">
                        <div className="notif-item-title">Giáo viên giao bài tập mới</div>
                        <div className="notif-item-desc">Lớp "Khoa học lớp 9" có bài mới cần hoàn thành trước 20/9.</div>
                        <div className="notif-item-time">2 giờ trước</div>
                      </div>
                    </div>
                    <div className="notif-item">
                      <div style={{ width: '7px', flexShrink: 0 }} />
                      <div className="notif-item-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}><ChartNoAxesCombined size={16} /></div>
                      <div className="notif-item-body">
                        <div className="notif-item-title">Tiến độ tuần này</div>
                        <div className="notif-item-desc">Bạn đã hoàn thành 3/5 mục tiêu tuần. Thêm 2 bài nữa nhé!</div>
                        <div className="notif-item-time">Hôm qua</div>
                      </div>
                    </div>
                  </div>
                  <div className="notif-dropdown-footer">Xem tất cả thông báo</div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="tb-dropdown-wrap" ref={profileRef}>
              <button
                onClick={() => { setShowProfile(p => !p); setShowNotifications(false); }}
                aria-label="Tài khoản"
                className="avatar small"
                style={{ margin: 0, cursor: 'pointer', outline: showProfile ? '2px solid var(--blue)' : 'none', outlineOffset: '2px' }}
              >
                {user.fullName.charAt(0)}
              </button>
              {showProfile && (
                <div className="tb-dropdown profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="profile-dd-avatar">{user.fullName.charAt(0)}</div>
                    <div>
                      <div className="profile-dd-name">{user.fullName}</div>
                      <div className="profile-dd-role">{names[user.role]}</div>
                    </div>
                  </div>
                  <div className="profile-menu">
                    <Link to="/settings" className="profile-menu-item" onClick={() => setShowProfile(false)}>
                      <User size={15} /> Thông tin cá nhân
                    </Link>
                    <Link to="/progress" className="profile-menu-item" onClick={() => setShowProfile(false)}>
                      <BarChart2 size={15} /> Tình trạng học tập
                    </Link>
                    <Link to="/settings" className="profile-menu-item" onClick={() => setShowProfile(false)}>
                      <Settings size={15} /> Cài đặt
                    </Link>
                    {user.role === 'STUDENT' && (
                      <button className="profile-menu-item" onClick={() => setShowProfile(false)}>
                        <Flag size={15} /> Báo cáo giáo viên
                      </button>
                    )}
                    <button className="profile-menu-item" onClick={() => setShowProfile(false)}>
                      <HelpCircle size={15} /> Trợ giúp
                    </button>
                    <div className="profile-menu-divider" />
                    <button
                      className="profile-menu-item danger"
                      onClick={async () => {
                        setShowProfile(false);
                        await api("/auth/logout", "POST");
                        useAuth.getState().set(null, null);
                        queryClient.clear();
                      }}
                    >
                      <LogOut size={15} /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="main">
          <Suspense fallback={<Empty>Đang tải phòng thí nghiệm…</Empty>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/labs" element={<LabLibrary />} />
              <Route
                path="/labs/:id"
                element={
                  ["STUDENT", "TEACHER"].includes(user.role) ? (
                    <Lab />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              <Route path="/lessons" element={<Lessons />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/admin"
                element={
                  user.role === "ADMIN" ? <AdminPage /> : <Navigate to="/" />
                }
              />
              <Route path="/fallback" element={<WebGLFallbackPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="footer">
          <span>NexaLab · Chạm vào khoa học</span>
          <span>Quan sát. Thử nghiệm. Thấu hiểu.</span>
        </footer>
      </div>
    </div>
  );
}
function Login() {
  const [mode, setMode] = useState(
    new URLSearchParams(location.search).has("reset") ? "reset" : "login",
  );
  const [message, setMessage] = useState("");
  const action = useAction(async (b: any) => {
    if (mode === "forgot") {
      const r = await api("/auth/forgot", "POST", b);
      setMessage(r.message);
      return;
    }
    if (mode === "reset") {
      await api("/auth/reset", "POST", {
        ...b,
        token: new URLSearchParams(location.search).get("reset"),
      });
      history.replaceState({}, "", "/");
      setMode("login");
      setMessage("Đã đổi mật khẩu. Vui lòng đăng nhập.");
      return;
    }
    const r = await api(
      "/auth/" + (mode === "register" ? "register" : "login"),
      "POST",
      mode === "register" ? { ...b, consent: true } : b,
    );
    useAuth.getState().set(r.user, r.accessToken);
  });
  return (
    <div className="login">
      <section className="login-story">
        <div className="brand">
          <Atom /> NexaLab.
        </div>
        <Badge>PHÒNG THỰC HÀNH CỦA THẾ HỆ MỚI</Badge>
        <h1>
          Khoa học
          <br />
          bắt đầu từ
          <br />
          <em>“Tại sao?”</em>
        </h1>
        <p>
          Biến những điều em tò mò thành những điều em hiểu. Khám phá, thực hành
          và học qua từng lần thử.
        </p>
        <div className="orbit-art">
          <i />
          <i />
          <i />
          <span>✦</span>
        </div>
        <small>Sinh học · Hóa học · Vật lý</small>
      </section>
      <section className="login-form">
        <div>
          <Badge>CHÀO MỪNG ĐẾN NEXALAB</Badge>
          <h2>
            {mode === "login"
              ? "Bắt đầu khám phá"
              : mode === "register"
                ? "Đăng ký tài khoản"
                : mode === "forgot"
                  ? "Quên mật khẩu"
                  : "Đặt mật khẩu mới"}
          </h2>
          <p className="muted">
            {mode === "login"
              ? "Đăng nhập để tiếp tục hành trình học tập."
              : "Chọn vai trò và điền thông tin để đăng ký tài khoản mới."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.mutate(Object.fromEntries(new FormData(e.currentTarget)));
            }}
          >
            {mode === "register" && (
              <>
                <Field label="Họ và tên" name="fullName" required />
                <div style={{ marginBottom: '16px' }}>
                  <label className="field">
                    <span>Vai trò</span>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="radio" name="role" value="STUDENT" required defaultChecked /> Học sinh
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="radio" name="role" value="PARENT" required /> Phụ huynh
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="radio" name="role" value="TEACHER" required /> Giáo viên
                      </label>
                    </div>
                  </label>
                </div>
              </>
            )}
            {mode !== "reset" && (
              <Field
                label="Email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            )}
            {mode !== "forgot" && (
              <Field
                label="Mật khẩu"
                name="password"
                type="password"
                minLength={mode === "login" ? 1 : 12}
                required
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            )}{" "}
            {mode === "register" && (
              <label className="check">
                <input type="checkbox" required />
                Tôi là người lớn và đồng ý xử lý dữ liệu tài khoản để sử dụng
                nền tảng.
              </label>
            )}
            <ErrorBox error={action.error} />
            {message && <p className="notice">{message}</p>}
            <button className="primary wide" disabled={action.isPending}>
              {action.isPending
                ? "Đang xử lý…"
                : mode === "login"
                  ? "Đăng nhập"
                  : mode === "register"
                    ? "Tạo tài khoản"
                    : "Xác nhận"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="login-links">
            <button
              onClick={() => {
                setMode(mode === "forgot" ? "login" : "forgot");
                setMessage("");
              }}
            >
              Quên mật khẩu?
            </button>
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setMessage("");
              }}
            >
              {mode === "login" ? "Đăng ký tài khoản mới" : "Quay lại đăng nhập"}
            </button>
          </div>
          <p className="tiny muted">
            Không cần camera. Các thí nghiệm được thực hiện hoàn toàn trên trình
            duyệt.
          </p>
        </div>
      </section>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
function Dashboard() {
  const user = useAuth((s) => s.user)!;
  const student = user.role === "STUDENT";
  const stats = useQuery({
    queryKey: ["progress", user.id],
    queryFn: () => api("/progress/" + user.id),
    enabled: student,
  });
  const assignments = useQuery({
    queryKey: ["assignments"],
    queryFn: () => api("/assignments"),
    enabled: student,
  });
  const p = stats.data?.progress ?? [];
  const attempts = stats.data?.attempts ?? [];
  return (
    <>
      <PageHeading
        title={
          "Chào " + user.fullName.split(" ").at(-1) + "!"
        }
        description="Theo dõi tiến độ học tập, nhiệm vụ được giao và tiếp tục các bài thực hành."
        action={
          <Badge tone="outline">KHOA HỌC TỰ NHIÊN · LỚP {user.grade}</Badge>
        }
      />
      {student ? (
        <>
          <div className="stats">
            <Stat
              label="Bài học hoàn thành"
              value={p.filter((x: any) => x.status === "completed").length}
              icon={<BookOpen />}
            />
            <Stat
              label="Lần thử nghiệm"
              value={attempts.length}
              icon={<FlaskConical />}
            />
            <Stat
              label="Thử thách đạt"
              value={attempts.filter((a: any) => a.verdict === "passed").length}
              icon={<Award />}
            />
            <Stat
              label="Bài được giao"
              value={assignments.data?.length ?? 0}
              icon={<Bookmark />}
            />
          </div>
          <ErrorBox error={stats.error || assignments.error} />
        </>
      ) : (
        <div className="role-note">
          <GraduationCap />
          <p>
            {user.role === "TEACHER"
              ? "Quản lý lớp, giao thử thách và theo dõi cách học sinh tiến bộ qua mỗi lần thử."
              : user.role === "PARENT"
                ? "Đồng hành cùng con qua tiến độ học tập và mức độ cần trợ giúp."
                : "Quản lý người dùng và nội dung khoa học của NexaLab."}
          </p>
          <Link
            to={
              user.role === "TEACHER"
                ? "/classes"
                : user.role === "PARENT"
                  ? "/progress"
                  : "/admin"
            }
          >
            Mở không gian quản lý <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <div className="section-heading">
        <div>
          <h2>Phòng thực hành mô phỏng</h2>
          <p className="muted">Các chủ đề Vật lý, Sinh học và Hóa học theo chương trình.</p>
        </div>
        <Link to="/labs">
          Tất cả phòng lab <ArrowRight size={15} />
        </Link>
      </div>
      <LabCards />
      {student && (
        <section className="panel assignments-panel">
          <div className="section-heading">
            <h2>Nhiệm vụ tiếp theo</h2>
            <Badge>{assignments.data?.length ?? 0} bài được giao</Badge>
          </div>
          {assignments.data?.length ? (
            assignments.data.map((a: any) => (
              <Link
                key={a.id}
                className="assignment-row"
                to={
                  a.contentType === "lab" ? "/labs/" + a.contentId : "/lessons"
                }
              >
                <span className="assignment-icon">
                  <BookOpen />
                </span>
                <div>
                  <b>{a.title}</b>
                  <small>
                    {a.classroom.name} · Hạn{" "}
                    {new Date(a.dueDate).toLocaleDateString("vi-VN")}
                  </small>
                </div>
                <ArrowUpRight size={19} />
              </Link>
            ))
          ) : (
            <Empty>Chưa có bài được giao. Em có thể tự khám phá các lab.</Empty>
          )}
        </section>
      )}
    </>
  );
}
function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">
      <span>{icon}</span>
      <div>
        <strong>{value.toString().padStart(2, "0")}</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}
const labInfo = [
  {
    id: "circuit",
    subject: "VẬT LÝ",
    tag: "THỬ THÁCH",
    title: "Thắp sáng ý tưởng",
    description: "Tự lắp mạch điện và tìm cách làm LED sáng an toàn.",
    className: "physics",
    number: "01",
    symbol: "⌁",
  },
  {
    id: "eye",
    subject: "SINH HỌC",
    tag: "MÔ HÌNH 3D",
    title: "Thế giới qua đôi mắt",
    description: "Đi sâu vào cấu tạo mắt và theo dấu hành trình ánh sáng.",
    className: "biology",
    number: "02",
    symbol: "◉",
  },
  {
    id: "chemistry",
    subject: "HÓA HỌC",
    tag: "THÍ NGHIỆM",
    title: "Những biến đổi kỳ diệu",
    description: "Khám phá phản ứng, quan sát hiện tượng và chất dư.",
    className: "chemistry",
    number: "03",
    symbol: "⚗",
  },
];
function LabCards() {
  const role = useAuth((s) => s.user!.role);
  return (
    <div className="lab-grid">
      {labInfo.map((l) => (
        <Link
          to={
            ["STUDENT", "TEACHER"].includes(role) ? "/labs/" + l.id : "/lessons"
          }
          className="lab-card"
          key={l.id}
        >
          <div className={"lab-art " + l.className}>
            <span className="lab-subject">{l.subject}</span>
            <span className="art-number">{l.number}</span>
            <div className="art-symbol">{l.symbol}</div>
            <span className="art-caption">NEXALAB / EXPERIMENT {l.number}</span>
          </div>
          <div className="lab-copy">
            <div className="lab-meta">
              <span>{l.tag}</span>
              <span>Lớp 8–9</span>
            </div>
            <h3>{l.title}</h3>
            <p>{l.description}</p>
            <div className="card-footer">
              <span>Khám phá phòng lab</span>
              <span className="round-arrow">
                <ArrowUpRight size={17} />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
function LabLibrary() {
  return (
    <>
      <PageHeading
        eyebrow="PHÒNG THÍ NGHIỆM ẢO"
        title="Phòng thí nghiệm mô phỏng"
        description="Hệ thống mô phỏng tương tác cho các bộ môn Vật lý, Sinh học và Hóa học."
      />
      <LabCards />
      <div className="notice">
        Mọi thí nghiệm đều là mô phỏng giáo dục. Không thực hiện với điện hoặc
        hóa chất thật theo mô hình này.
      </div>
    </>
  );
}
