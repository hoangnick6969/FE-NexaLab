import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { api, useAuth } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge } from "../../components/ui";
import { LabCards } from "../labs/LabLibrary";
import { StudentDashboard } from "./StudentDashboard";
import { TeacherDashboard } from "./TeacherDashboard";

export function Dashboard() {
  const user = useAuth((s) => s.user)!;
  const isStudent = user.role === "STUDENT";
  const stats = useQuery({
    queryKey: ["progress", user.id],
    queryFn: () => api("/progress/" + user.id),
    enabled: isStudent,
  });
  const assignments = useQuery({
    queryKey: ["assignments"],
    queryFn: () => api("/assignments"),
    enabled: isStudent,
  });
  if (isStudent) {
    return <StudentDashboard user={user} stats={stats} assignments={assignments} />;
  }
  if (user.role === "TEACHER") return <TeacherDashboard />;
  return (
    <>
      <PageHeading
        eyebrow="MỖI NGÀY, MỘT ĐIỀU MỚI"
        title={
          "Chào " + user.fullName.split(" ").at(-1) + ", cùng khám phá nhé!"
        }
        description="Một câu hỏi nhỏ hôm nay có thể mở ra cả một thế giới."
        action={
          <Badge tone="outline">KHOA HỌC TỰ NHIÊN · LỚP {user.grade}</Badge>
        }
      />
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> HỌC BẰNG CÁCH TỰ TAY LÀM
          </span>
          <h2>
            Đừng chỉ đọc về khoa học.
            <br />
            <em>Hãy chạm vào nó.</em>
          </h2>
          <p>
            Lắp một mạch điện. Khám phá đôi mắt.
            <br />
            Nhìn thấy những phản ứng kỳ diệu.
          </p>
          <Link
            className="cream-button"
            to="/progress"
          >
            Mở không gian khám phá <ArrowUpRight size={19} />
          </Link>
          <div className="hero-foot">
            <span>HỌC → QUAN SÁT → THỬ</span>
            <i />
            <span>Mỗi bước đều đáng khám phá</span>
          </div>
        </div>
        <div className="hero-graphic">
          <svg viewBox="0 0 450 300" aria-label="Minh họa quỹ đạo nguyên tử">
            <defs>
              <radialGradient id="glow">
                <stop stopColor="#edbd71" />
                <stop offset="1" stopColor="#c4a460" />
              </radialGradient>
            </defs>
            <circle
              cx="230"
              cy="145"
              r="115"
              fill="none"
              stroke="#57776b"
              strokeDasharray="3 6"
            />
            <g fill="none" stroke="#9dbeac" strokeWidth="1.3">
              <ellipse
                cx="230"
                cy="145"
                rx="148"
                ry="53"
                transform="rotate(-30 230 145)"
              />
              <ellipse
                cx="230"
                cy="145"
                rx="148"
                ry="53"
                transform="rotate(35 230 145)"
              />
              <ellipse
                cx="230"
                cy="145"
                rx="148"
                ry="53"
                transform="rotate(90 230 145)"
              />
            </g>
            <circle cx="230" cy="145" r="34" fill="url(#glow)" />
            <circle cx="111" cy="213" r="10" fill="#d7e4c2" />
            <circle cx="283" cy="38" r="7" fill="#dac8a4" />
            <circle cx="350" cy="224" r="10" fill="#a0cbb4" />
            <text
              x="31"
              y="67"
              fill="#c8d7ca"
              fontSize="17"
              fontFamily="monospace"
            >
              E = curiosity²
            </text>
            <text x="325" y="86" fill="#abc6b6" fontSize="13">
              ✦ EXPLORE
            </text>
            <text
              x="163"
              y="283"
              fill="#9dbeac"
              fontSize="11"
              letterSpacing="4"
            >
              A WORLD OF POSSIBILITIES
            </text>
          </svg>
          <div className="floating-note">
            <span>✧</span> Sai cũng là một cách học.
          </div>
        </div>
      </section>
      <div className="role-note">
        <GraduationCap />
        <p>
          Đồng hành cùng con qua tiến độ học tập và mức độ cần trợ giúp.
        </p>
        <Link to="/progress">
          Mở không gian quản lý →
        </Link>
      </div>
      <div className="section-heading">
        <div>
          <h2>Hôm nay, em muốn khám phá gì?</h2>
          <p className="muted">Ba môn học. Vô vàn điều đáng tò mò.</p>
        </div>
        <Link to="/labs">
          Tất cả phòng lab <ArrowRight size={15} />
        </Link>
      </div>
      <LabCards />
    </>
  );
}
