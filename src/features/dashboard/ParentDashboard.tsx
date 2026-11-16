import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Empty } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { LoadError } from "../classes/class-ui";
import { ParentOverviewSkeleton } from "../progress/ParentSkeletons";
import { defineText } from "../../i18n";
import "../progress/parent.css";

type Child = { student: { id: string; fullName: string; grade: number | null } };
type LabProgress = { contentId: string; status: string; score: number; attemptsCount: number };
type ChildProgress = { progress: LabProgress[]; attempts?: unknown[] };
type Notice = { id: string; readAt: string | null };
type LinkStatus = { emailVerified: boolean; consent: boolean; pending: Array<{ studentId: string; fullName: string }> };

const text = defineText({
  vi: {
    title: "Đồng hành cùng con",
    description: "Xem con đã làm được gì và cần được giúp ở đâu. Chỉ có tiến độ và số lần xin gợi ý, không có nội dung bài làm.",
    setup: "Cần hoàn tất trước khi xem tiến độ của con",
    needEmail: "Xác minh email",
    needConsent: "Chấp thuận theo dõi tiến độ",
    open: "Mở tiến độ",
    doNow: "Làm ngay",
    none: "Chưa liên kết với học sinh nào. Nhập mã liên kết do giáo viên cấp để bắt đầu.",
    link: "Liên kết với con",
    grade: (grade: number | null) => (grade ? `Khối ${grade}` : ""),
    allClear: "Chưa có bài quá hạn nào.",
    overdueLine: (name: string, n: number) => `${name} có ${n} bài quá hạn chưa nộp.`,
    labsDone: "lab hoàn thành",
    attempts: "lần thử",
    overdue: "bài quá hạn",
    loading: "Đang tải tiến độ của con…",
    loadFailed: "học sinh đã liên kết",
  },
  en: {
    title: "Supporting your child",
    description: "See what your child has done and where they need help. Progress and how often they asked for hints only, never their work.",
    setup: "To finish before you can see your child's progress",
    needEmail: "Verify your email",
    needConsent: "Consent to progress tracking",
    open: "Open progress",
    doNow: "Do it now",
    none: "No student is linked yet. Enter the link code from the teacher to begin.",
    link: "Link your child",
    grade: (grade: number | null) => (grade ? `Grade ${grade}` : ""),
    allClear: "Nothing is overdue.",
    overdueLine: (name: string, n: number) => `${name} has ${n} overdue ${n === 1 ? "task" : "tasks"} not handed in.`,
    labsDone: "labs completed",
    attempts: "attempts",
    overdue: "overdue",
    loading: "Loading your child's progress…",
    loadFailed: "linked students",
  },
});

/** The parent's home: one card per linked child with three readings, and one sentence on what needs them. */
export function ParentDashboard() {
  const t = text();
  const children = useQuery<Child[]>({ queryKey: ["children"], queryFn: () => api("/children") });
  const status = useQuery<LinkStatus>({ queryKey: ["children-link-status"], queryFn: () => api("/children/link-status") });
  const list = children.data ?? [];
  const progress = useQueries({ queries: list.map((c) => ({ queryKey: ["progress", c.student.id], queryFn: () => api<ChildProgress>("/children/" + c.student.id + "/progress") })) });
  const notices = useQueries({ queries: list.map((c) => ({ queryKey: ["assignment-notices", c.student.id], queryFn: () => api<Notice[]>("/children/" + c.student.id + "/assignment-notices") })) });

  const loading = children.isLoading || status.isLoading;
  const settingUp = status.data && (!status.data.emailVerified || !status.data.consent);
  const overdueLines = list.flatMap((c, i) => {
    const n = notices[i]?.data?.length ?? 0;
    return n > 0 ? [t.overdueLine(c.student.fullName, n)] : [];
  });
  const settled = notices.every((q) => !q.isPending);

  return (
    <div className="pp-page">
      <PageHeading title={t.title} description={t.description} />
      <LoadError query={children} what={t.loadFailed} />
      {loading && <ParentOverviewSkeleton label={t.loading} />}

      {settingUp && (
        <section className="pp-section" aria-labelledby="parent-setup-title">
          <h2 id="parent-setup-title" className="pp-signal-head">{t.setup}</h2>
          <ul className="pp-checks">
            {!status.data!.emailVerified && <li><span>{t.needEmail}</span><Link className="nx-link" to="/progress">{t.doNow}</Link></li>}
            {!status.data!.consent && <li><span>{t.needConsent}</span><Link className="nx-link" to="/progress">{t.doNow}</Link></li>}
          </ul>
        </section>
      )}

      {!loading && children.isSuccess && list.length === 0 && (
        <Empty>
          {t.none} <Link className="nx-link" to="/progress">{t.link}</Link>
        </Empty>
      )}

      {list.length > 0 && (
        <>
          {settled && <p className="pp-lede">{overdueLines.length ? overdueLines.join(" ") : t.allClear}</p>}
          <div className="pp-children">
            {list.map((c, i) => {
              const labs = progress[i]?.data?.progress ?? [];
              const done = labs.filter((lab) => lab.status === "completed").length;
              const attempts = labs.reduce((sum, lab) => sum + (lab.attemptsCount ?? 0), 0);
              const overdue = notices[i]?.data?.length ?? 0;
              const ready = !progress[i]?.isPending && !notices[i]?.isPending;
              return (
                <article key={c.student.id} className="pp-child">
                  <header>
                    <h2>{c.student.fullName}</h2>
                    <p>{t.grade(c.student.grade)}</p>
                  </header>
                  <dl className="pp-readings">
                    <div><dt>{t.labsDone}</dt><dd>{ready ? `${done}/${labs.length}` : "…"}</dd></div>
                    <div><dt>{t.attempts}</dt><dd>{ready ? attempts : "…"}</dd></div>
                    <div className={overdue > 0 ? "is-signal" : ""}><dt>{t.overdue}</dt><dd>{ready ? overdue : "…"}</dd></div>
                  </dl>
                  <Link className="primary pp-btn" to={`/progress?child=${encodeURIComponent(c.student.id)}`}>{t.open}</Link>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
