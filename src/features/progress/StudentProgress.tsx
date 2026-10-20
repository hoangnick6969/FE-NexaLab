import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { BookOpen, FlaskConical, ListChecks } from "lucide-react";
import { api, type ActivityPage, type MyProgressResponse } from "../../lib/api";
import { Badge, Empty, ErrorBox } from "../../components/ui";
import { type SheetView, time } from "./progress-format";
import { AssignmentProgress } from "./AssignmentProgress";
import { ActivityGroups } from "./ActivityList";
import { EvidenceSheet, SheetContent } from "./EvidenceSheet";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    reload: "Tải lại tiến độ",
    loading: "Đang tải tiến độ…",
    assignmentsDone: "Bài tập đã hoàn thành",
    stepsLeft: "Bước bắt buộc còn lại",
    practicals: (passed: number) => `Lượt thực hành · ${passed} lượt đạt`,
    computed: (when: string) => `Số liệu được máy chủ tính từ từng lần học và lần thử của em. Cập nhật gần nhất: ${when}`,
    assignments: "Bài tập",
    noAssigned: "Em chưa có bài được giao nào.",
    home: "Về trang chủ",
    foundational: "Chương trình nền tảng",
    foundationalIntro: "Tiến độ theo phiên bản chương trình chính thức, độc lập với bài tập được giao.",
    loadingCurriculum: "Đang tải tiến độ chương trình…",
    courseLine: (grade: number, version: string) => `LỚP ${grade} · PHIÊN BẢN ${version}`,
    steps: (done: number, total: number) => `${done}/${total} bước`,
    stateDone: "hoàn thành",
    stateDoing: "đang học",
    stateTodo: "chưa bắt đầu",
    sourceUpdated: (source: string, when: string) => `Nguồn ${source} · cập nhật ${when}`,
    noCurriculum: "Chương trình chính thức chưa được cấu hình; tiến độ nền tảng chưa được tính.",
    history: "Lịch sử lần thử",
    loadingHistory: "Đang tải lịch sử…",
    retry: "Thử lại",
    noAttempts: "Chưa có lần thử nào được ghi lại.",
    retryNext: "Thử tải lại trang tiếp",
    loadingShort: "Đang tải…",
    older: "Xem thêm lần thử cũ hơn",
  },
  en: {
    reload: "Reload progress",
    loading: "Loading progress…",
    assignmentsDone: "Assignments completed",
    stepsLeft: "Required steps left",
    practicals: (passed: number) => `Practice attempts · ${passed} passed`,
    computed: (when: string) => `The server computes these from each of your lessons and attempts. Last updated: ${when}`,
    assignments: "Assignments",
    noAssigned: "You have no assigned work yet.",
    home: "Go home",
    foundational: "Foundation curriculum",
    foundationalIntro: "Progress against the official curriculum version, separate from assigned work.",
    loadingCurriculum: "Loading curriculum progress…",
    courseLine: (grade: number, version: string) => `GRADE ${grade} · VERSION ${version}`,
    steps: (done: number, total: number) => `${done}/${total} steps`,
    stateDone: "completed",
    stateDoing: "in progress",
    stateTodo: "not started",
    sourceUpdated: (source: string, when: string) => `Source ${source} · updated ${when}`,
    noCurriculum: "The official curriculum is not configured; foundation progress is not computed.",
    history: "Attempt history",
    loadingHistory: "Loading history…",
    retry: "Try again",
    noAttempts: "No attempts recorded yet.",
    retryNext: "Try loading the next page again",
    loadingShort: "Loading…",
    older: "Show older attempts",
  },
});
const t = text();

export function StudentProgress() {
  const progress = useQuery<MyProgressResponse>({ queryKey: ["me-progress"], queryFn: () => api("/me/progress") });
  const foundational = useQuery<any>({ queryKey: ["me-foundational-progress"], queryFn: () => api("/me/foundational-progress") });
  const activity = useInfiniteQuery<ActivityPage>({
    queryKey: ["me-activity"],
    queryFn: ({ pageParam }) => api("/me/activity?limit=20" + (pageParam ? "&cursor=" + encodeURIComponent(String(pageParam)) : "")),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const [sheet, setSheet] = useState<SheetView[]>([]);
  const opener = useRef<HTMLElement | null>(null);
  const open = (view: SheetView, event: React.MouseEvent<HTMLElement>) => {
    opener.current = event.currentTarget;
    setSheet([view]);
  };
  const close = () => {
    setSheet([]);
    opener.current?.focus();
  };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const summary = progress.data?.summary;
  const assignments = progress.data?.assignments ?? [];
  const items = activity.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="my-progress">
      <ErrorBox error={progress.error} />
      {progress.isError && (
        <button className="secondary" type="button" onClick={() => progress.refetch()}>
          {t.reload}
        </button>
      )}
      {progress.isPending ? (
        <Empty>{t.loading}</Empty>
      ) : summary ? (
        <>
          <div className="stats progress-stats">
            <button type="button" className="stat" onClick={() => scrollTo("progress-completion")}>
              <span><BookOpen /></span>
              <div>
                <strong>{summary.activeAssignments ? `${summary.completedAssignments}/${summary.activeAssignments}` : "—"}</strong>
                <p>{t.assignmentsDone}</p>
              </div>
            </button>
            <button type="button" className="stat" onClick={() => scrollTo("progress-completion")}>
              <span><ListChecks /></span>
              <div>
                <strong>{summary.activeAssignments ? summary.remainingRequiredSteps : "—"}</strong>
                <p>{t.stepsLeft}</p>
              </div>
            </button>
            <button type="button" className="stat" onClick={() => scrollTo("progress-history")}>
              <span><FlaskConical /></span>
              <div>
                <strong>{summary.practicalAttempts}</strong>
                <p>{t.practicals(summary.passedPracticals)}</p>
              </div>
            </button>
          </div>
          <p className="tiny muted progress-updated">
            {t.computed(time(summary.updatedAt))}
          </p>
          <section id="progress-completion" className="progress-section" aria-labelledby="progress-completion-title">
            <h2 id="progress-completion-title">{t.assignments}</h2>
            {assignments.length === 0 ? (
              <Empty>
                {t.noAssigned} <Link to="/">{t.home} →</Link>
              </Empty>
            ) : (
              assignments.map((assignment) => (
                <AssignmentProgress key={assignment.assignmentId} assignment={assignment} onOpen={open} />
              ))
            )}
          </section>
          <section className="panel progress-section" aria-labelledby="foundational-progress-title">
            <h2 id="foundational-progress-title">{t.foundational}</h2>
            <p className="muted">{t.foundationalIntro}</p>
            <ErrorBox error={foundational.error} />
            {foundational.isPending ? <Empty>{t.loadingCurriculum}</Empty> : foundational.data?.courses?.length ? foundational.data.courses.map((course: any) => (
              <article className="progress-course" key={course.id}>
                <div className="lesson-chapter-heading"><div><span className="eyebrow">{t.courseLine(course.grade, course.version)}</span><h3>{course.subject.name}</h3></div><Badge>{t.steps(course.summary.completedEvidenceItems, course.summary.totalEvidenceItems)}</Badge></div>
                <div className="progress-track"><i style={{ width: `${course.summary.percent ?? 0}%` }} /></div>
                <ol>{course.lessons.map((lesson: any) => <li key={lesson.id}><Link to={`/lessons/${lesson.id}`}>{lesson.title}</Link><span>{lesson.evidence.map((item: any) => `${item.kind}: ${item.state === "COMPLETED" ? t.stateDone : item.state === "IN_PROGRESS" ? t.stateDoing : t.stateTodo}${item.kind === "basicExercise" && item.score !== null ? ` (${item.score}% / ${item.passThreshold}%)` : ""}`).join(" · ")}</span>{lesson.evidence.filter((item: any) => item.updatedAt).map((item: any) => <small key={item.stepId}>{t.sourceUpdated(item.sourceId, time(item.updatedAt))}</small>)}</li>)}</ol>
              </article>
            )) : <Empty>{t.noCurriculum}</Empty>}
          </section>
        </>
      ) : null}
      <section id="progress-history" className="panel progress-section" aria-labelledby="progress-history-title">
        <h2 id="progress-history-title">{t.history}</h2>
        {activity.isPending ? (
          <Empty>{t.loadingHistory}</Empty>
        ) : activity.isError && !items.length ? (
          <>
            <ErrorBox error={activity.error} />
            <button className="secondary" type="button" onClick={() => activity.refetch()}>{t.retry}</button>
          </>
        ) : items.length === 0 ? (
          <Empty>{t.noAttempts}</Empty>
        ) : (
          <>
            <ActivityGroups items={items} onOpen={open} />
            {activity.isFetchNextPageError && (
              <>
                <ErrorBox error={activity.error} />
                <button className="secondary" type="button" onClick={() => activity.fetchNextPage()}>{t.retryNext}</button>
              </>
            )}
            {activity.hasNextPage && !activity.isFetchNextPageError && (
              <button className="secondary load-more" type="button" disabled={activity.isFetchingNextPage} onClick={() => activity.fetchNextPage()}>
                {activity.isFetchingNextPage ? t.loadingShort : t.older}
              </button>
            )}
          </>
        )}
      </section>
      {sheet.length > 0 && (
        <EvidenceSheet onClose={close} onBack={sheet.length > 1 ? () => setSheet((views) => views.slice(0, -1)) : undefined}>
          <SheetContent view={sheet.at(-1)!} push={(view) => setSheet((views) => [...views, view])} />
        </EvidenceSheet>
      )}
    </div>
  );
}
