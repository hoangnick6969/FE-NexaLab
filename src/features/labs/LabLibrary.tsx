import { FlaskConical, ArrowUpRight, Zap, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, useAuth } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { labInfo } from "./lab-info";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    grades: "Lớp 8–9",
    basicsFirst: "Học kiến thức nền trước",
    explore: "Khám phá phòng lab",
    nonePublished: "Chưa có phòng thực hành nền tảng nào được phát hành.",
    eyebrow: "HỌC QUA TRẢI NGHIỆM",
    title: "Phòng thí nghiệm",
    description: "Tự đặt câu hỏi, tự thử nghiệm và kiểm chứng bằng kết quả.",
    disclaimer: "Mọi thí nghiệm đều là mô phỏng giáo dục. Không thực hiện với điện hoặc hóa chất thật theo mô hình này.",
  },
  en: {
    grades: "Grades 8–9",
    basicsFirst: "Learn the basics first",
    explore: "Explore the lab",
    nonePublished: "No foundation labs are published yet.",
    eyebrow: "LEARN BY EXPERIENCE",
    title: "Labs",
    description: "Ask your own questions, experiment and check against the results.",
    disclaimer: "Every experiment is an educational simulation. Do not try it with real electricity or chemicals.",
  },
});
const t = text();

export function LabCards({ guided = false }: { guided?: boolean } = {}) {
  const role = useAuth((s) => s.user!.role);
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => api<any[]>("/labs"), enabled: role === "STUDENT" });
  const cards = role === "STUDENT" ? (labs.data ?? []).flatMap((lab: any) => {
    const visual = labInfo.find((item) => item.id === lab.id);
    return visual ? [{ ...visual, title: lab.title, description: lab.learningObjective, subject: lab.subject?.name ?? visual.subject }] : [];
  }) : labInfo;
  return (
    <div className="lab-grid">
      {cards.map((l) => (
        <Link
          to={guided && role === "STUDENT" ? "/lessons" : ["STUDENT", "TEACHER"].includes(role) ? "/labs/" + l.id : "/labs"}
          className="lab-card"
          key={l.id}
        >
          <div className={"lab-art " + l.className}>
            <span className="lab-subject">{l.subject}</span>
            <span className="art-number">{l.number}</span>
            <div className="art-symbol">
              {l.id === "circuit" ? <Zap size={44} strokeWidth={1.5} /> : l.id === "eye" ? <Eye size={44} strokeWidth={1.5} /> : <FlaskConical size={44} strokeWidth={1.5} />}
            </div>
            <span className="art-caption">NEXALAB / EXPERIMENT {l.number}</span>
          </div>
          <div className="lab-copy">
            <div className="lab-meta">
              <span>{l.tag}</span>
              <span>{t.grades}</span>
            </div>
            <h3>{l.title}</h3>
            <p>{l.description}</p>
            <div className="card-footer">
              <span>{guided && role === "STUDENT" ? t.basicsFirst : t.explore}</span>
              <span className="round-arrow">
                <ArrowUpRight size={17} />
              </span>
            </div>
          </div>
        </Link>
      ))}
      {role === "STUDENT" && labs.isSuccess && cards.length === 0 && <p className="notice">{t.nonePublished}</p>}
    </div>
  );
}
export function LabLibrary() {
  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />
      <LabCards />
      <div className="notice">
        {t.disclaimer}
      </div>
    </>
  );
}
