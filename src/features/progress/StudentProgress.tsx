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
          Tải lại tiến độ
        </button>
      )}
      {progress.isPending ? (
        <Empty>Đang tải tiến độ…</Empty>
      ) : summary ? (
        <>
          <div className="stats progress-stats">
            <button type="button" className="stat" onClick={() => scrollTo("progress-completion")}>
              <span><BookOpen /></span>
              <div>
                <strong>{summary.activeAssignments ? `${summary.completedAssignments}/${summary.activeAssignments}` : "—"}</strong>
                <p>Bài tập đã hoàn thành</p>
              </div>
            </button>
            <button type="button" className="stat" onClick={() => scrollTo("progress-completion")}>
              <span><ListChecks /></span>
              <div>
                <strong>{summary.activeAssignments ? summary.remainingRequiredSteps : "—"}</strong>
                <p>Bước bắt buộc còn lại</p>
              </div>
            </button>
            <button type="button" className="stat" onClick={() => scrollTo("progress-history")}>
              <span><FlaskConical /></span>
              <div>
                <strong>{summary.practicalAttempts}</strong>
                <p>Lượt thực hành · {summary.passedPracticals} lượt đạt</p>
              </div>
            </button>
          </div>
          <p className="tiny muted progress-updated">
            Số liệu được máy chủ tính từ từng lần học và lần thử của em. Cập nhật gần nhất: {time(summary.updatedAt)}
          </p>
          <section id="progress-completion" className="progress-section" aria-labelledby="progress-completion-title">
            <h2 id="progress-completion-title">Bài tập</h2>
            {assignments.length === 0 ? (
              <Empty>
                Em chưa có bài được giao nào. <Link to="/">Về trang chủ →</Link>
              </Empty>
            ) : (
              assignments.map((assignment) => (
                <AssignmentProgress key={assignment.assignmentId} assignment={assignment} onOpen={open} />
              ))
            )}
          </section>
          <section className="panel progress-section" aria-labelledby="foundational-progress-title">
            <h2 id="foundational-progress-title">Chương trình nền tảng</h2>
            <p className="muted">Tiến độ theo phiên bản chương trình chính thức, độc lập với bài tập được giao.</p>
            <ErrorBox error={foundational.error} />
            {foundational.isPending ? <Empty>Đang tải tiến độ chương trình…</Empty> : foundational.data?.courses?.length ? foundational.data.courses.map((course: any) => (
              <article className="progress-course" key={course.id}>
                <div className="lesson-chapter-heading"><div><span className="eyebrow">LỚP {course.grade} · PHIÊN BẢN {course.version}</span><h3>{course.subject.name}</h3></div><Badge>{course.summary.completedEvidenceItems}/{course.summary.totalEvidenceItems} bước</Badge></div>
                <div className="progress-track"><i style={{ width: `${course.summary.percent ?? 0}%` }} /></div>
                <ol>{course.lessons.map((lesson: any) => <li key={lesson.id}><Link to={`/lessons/${lesson.id}`}>{lesson.title}</Link><span>{lesson.evidence.map((item: any) => `${item.kind}: ${item.state === "COMPLETED" ? "hoàn thành" : item.state === "IN_PROGRESS" ? "đang học" : "chưa bắt đầu"}${item.kind === "basicExercise" && item.score !== null ? ` (${item.score}% / ${item.passThreshold}%)` : ""}`).join(" · ")}</span>{lesson.evidence.filter((item: any) => item.updatedAt).map((item: any) => <small key={item.stepId}>Nguồn {item.sourceId} · cập nhật {time(item.updatedAt)}</small>)}</li>)}</ol>
              </article>
            )) : <Empty>Chương trình chính thức chưa được cấu hình; tiến độ nền tảng chưa được tính.</Empty>}
          </section>
        </>
      ) : null}
      <section id="progress-history" className="panel progress-section" aria-labelledby="progress-history-title">
        <h2 id="progress-history-title">Lịch sử lần thử</h2>
        {activity.isPending ? (
          <Empty>Đang tải lịch sử…</Empty>
        ) : activity.isError && !items.length ? (
          <>
            <ErrorBox error={activity.error} />
            <button className="secondary" type="button" onClick={() => activity.refetch()}>Thử lại</button>
          </>
        ) : items.length === 0 ? (
          <Empty>Chưa có lần thử nào được ghi lại.</Empty>
        ) : (
          <>
            <ActivityGroups items={items} onOpen={open} />
            {activity.isFetchNextPageError && (
              <>
                <ErrorBox error={activity.error} />
                <button className="secondary" type="button" onClick={() => activity.fetchNextPage()}>Thử tải lại trang tiếp</button>
              </>
            )}
            {activity.hasNextPage && !activity.isFetchNextPageError && (
              <button className="secondary load-more" type="button" disabled={activity.isFetchingNextPage} onClick={() => activity.fetchNextPage()}>
                {activity.isFetchingNextPage ? "Đang tải…" : "Xem thêm lần thử cũ hơn"}
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
