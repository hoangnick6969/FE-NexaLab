import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { api, useAuth } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge } from "../../components/ui";
import { LabCards } from "../labs/LabLibrary";
import { StudentDashboard } from "./StudentDashboard";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    eyebrow: "MỖI NGÀY, MỘT ĐIỀU MỚI",
    hello: (name: string) => `Chào ${name}, cùng khám phá nhé!`,
    description: "Một câu hỏi nhỏ hôm nay có thể mở ra cả một thế giới.",
    scope: (grade: number) => `KHOA HỌC TỰ NHIÊN · LỚP ${grade}`,
    kicker: "HỌC BẰNG CÁCH TỰ TAY LÀM",
    heroLine: "Đừng chỉ đọc về khoa học.",
    heroEmphasis: "Hãy chạm vào nó.",
    heroBody1: "Lắp một mạch điện. Khám phá đôi mắt.",
    heroBody2: "Nhìn thấy những phản ứng kỳ diệu.",
    openSpace: "Mở không gian khám phá",
    flow: "HỌC → QUAN SÁT → THỬ",
    everyStep: "Mỗi bước đều đáng khám phá",
    orbitArt: "Minh họa quỹ đạo nguyên tử",
    mistakes: "Sai cũng là một cách học.",
    teacherNote: "Quản lý lớp, giao thử thách và theo dõi cách học sinh tiến bộ qua mỗi lần thử.",
    parentNote: "Đồng hành cùng con qua tiến độ học tập và mức độ cần trợ giúp.",
    openManagement: "Mở không gian quản lý",
    exploreToday: "Hôm nay, em muốn khám phá gì?",
    threeSubjects: "Ba môn học. Vô vàn điều đáng tò mò.",
    allLabs: "Tất cả phòng lab",
  },
  en: {
    eyebrow: "SOMETHING NEW EVERY DAY",
    hello: (name: string) => `Hi ${name}, let's explore!`,
    description: "One small question today can open up a whole world.",
    scope: (grade: number) => `NATURAL SCIENCE · GRADE ${grade}`,
    kicker: "LEARN BY DOING",
    heroLine: "Don't just read about science.",
    heroEmphasis: "Touch it.",
    heroBody1: "Build a circuit. Explore the eye.",
    heroBody2: "See amazing reactions.",
    openSpace: "Open the discovery space",
    flow: "LEARN → OBSERVE → TRY",
    everyStep: "Every step is worth exploring",
    orbitArt: "Illustration of atomic orbits",
    mistakes: "Mistakes are a way to learn too.",
    teacherNote: "Manage classes, set challenges and follow how students improve with each attempt.",
    parentNote: "Support your child through their learning progress and where they need help.",
    openManagement: "Open the management space",
    exploreToday: "What would you like to explore today?",
    threeSubjects: "Three subjects. Endless things to be curious about.",
    allLabs: "All labs",
  },
});

export function Dashboard() {
  const user = useAuth((s) => s.user)!;
  const t = text();
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
  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={
          t.hello(user.fullName.split(" ").at(-1) ?? "")
        }
        description={t.description}
        action={
          <Badge tone="outline">{t.scope(user.grade)}</Badge>
        }
      />
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> {t.kicker}
          </span>
          <h2>
            {t.heroLine}
            <br />
            <em>{t.heroEmphasis}</em>
          </h2>
          <p>
            {t.heroBody1}
            <br />
            {t.heroBody2}
          </p>
          <Link
            className="cream-button"
            to={user.role === "TEACHER" ? "/labs/circuit" : "/progress"}
          >
            {t.openSpace} <ArrowUpRight size={19} />
          </Link>
          <div className="hero-foot">
            <span>{t.flow}</span>
            <i />
            <span>{t.everyStep}</span>
          </div>
        </div>
        <div className="hero-graphic">
          <svg viewBox="0 0 450 300" aria-label={t.orbitArt}>
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
            <span>✧</span> {t.mistakes}
          </div>
        </div>
      </section>
      <div className="role-note">
        <GraduationCap />
        <p>
          {user.role === "TEACHER"
            ? t.teacherNote
            : t.parentNote}
        </p>
        <Link to={user.role === "TEACHER" ? "/classes" : "/progress"}>
          {t.openManagement} →
        </Link>
      </div>
      <div className="section-heading">
        <div>
          <h2>{t.exploreToday}</h2>
          <p className="muted">{t.threeSubjects}</p>
        </div>
        <Link to="/labs">
          {t.allLabs} <ArrowRight size={15} />
        </Link>
      </div>
      <LabCards />
    </>
  );
}
