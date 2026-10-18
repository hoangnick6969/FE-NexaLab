import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { BookOpen, FlaskConical, ListChecks } from "lucide-react";
import {
  api,
  type ActivityItem,
  type ActivityPage,
  type MyPracticalAttemptDetail,
  type MyProgressAssignment,
  type MyProgressResponse,
  type MyProgressStep,
  type MyQuizAttemptDetail,
} from "./api";
import { Badge, Empty, ErrorBox, verdictLabel } from "./ui";

const stepNames: Record<string, string> = {
  READING: "Đọc",
  VIDEO: "Video",
  STUDY_CARDS: "Thẻ học",
  QUIZ: "Bài kiểm tra",
  LAB: "Thực hành",
  CHALLENGE: "Thử thách",
};
const stateNames: Record<MyProgressStep["state"], string> = {
  COMPLETED: "Hoàn thành",
  IN_PROGRESS: "Đang học",
  AVAILABLE: "Chưa bắt đầu",
  LOCKED: "Chưa mở",
};
const stateTones: Record<MyProgressStep["state"], string> = {
  COMPLETED: "passed",
  IN_PROGRESS: "partial",
  AVAILABLE: "outline",
  LOCKED: "outline",
};
const verdictTone = (verdict: string | null) => (verdict === "passed" ? "passed" : verdict === "partial" ? "partial" : "practice");
const time = (value: string | null) => (value ? new Date(value).toLocaleString("vi-VN") : "—");
const stepLink = (assignmentId: string | null, stepId: string | null) =>
  assignmentId ? `/assignments/${assignmentId}${stepId ? "#step-" + stepId : ""}` : null;

type SheetView =
  | { kind: "step"; assignment: MyProgressAssignment; step: MyProgressStep }
  | { kind: "quiz"; id: string }
  | { kind: "practical"; id: string };

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

function AssignmentProgress({
  assignment,
  onOpen,
}: {
  assignment: MyProgressAssignment;
  onOpen: (view: SheetView, event: React.MouseEvent<HTMLElement>) => void;
}) {
  const next = assignment.steps.find((step) => step.stepId === assignment.nextStepId);
  return (
    <article className="panel assignment-progress">
      <header>
        <div>
          <p className="eyebrow">{assignment.subject.name} · {assignment.chapter}</p>
          <h3>{assignment.title}</h3>
          <p className="tiny muted">
            {assignment.dueDate ? "Hạn: " + new Date(assignment.dueDate).toLocaleDateString("vi-VN") : "Không có hạn nộp"}{" "}
            {assignment.kind === "LAB" && <Badge tone="outline">Bài thực hành</Badge>}{" "}
            {assignment.contentArchived && <Badge tone="outline">Nội dung đã lưu trữ</Badge>}{" "}
            {assignment.overdue && !assignment.completed && <Badge tone="outline">Đã quá hạn</Badge>}
          </p>
        </div>
        <Link className="primary" to={stepLink(assignment.assignmentId, assignment.nextStepId)!}>
          {assignment.completed ? "Xem lại bài" : next ? `Tiếp tục: ${stepNames[next.type]}` : "Mở bài"}
        </Link>
      </header>
      <div className="completion-meter">
        <span>
          <b>{assignment.completedRequired}/{assignment.totalRequired}</b> bước bắt buộc
        </span>
        {assignment.percent === null ? (
          <span className="tiny muted">— Bài này chưa có bước bắt buộc nên không tính phần trăm.</span>
        ) : (
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Tỉ lệ bước bắt buộc đã hoàn thành"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={assignment.percent}
          >
            <i style={{ width: assignment.percent + "%" }} />
          </div>
        )}
      </div>
      {assignment.steps.length > 0 && (
      <div className="table-wrap">
        <table className="steps-table">
          <thead>
            <tr>
              <th scope="col">Bước</th>
              <th scope="col">Nội dung</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Cập nhật</th>
              <th scope="col"><span className="visually-hidden">Bằng chứng</span></th>
            </tr>
          </thead>
          <tbody>
            {assignment.steps.map((step, index) => (
              <tr key={step.stepId}>
                <td data-label="Bước">Bước {index + 1}</td>
                <td data-label="Nội dung">{stepNames[step.type] ?? step.type}{!step.required && <span className="tiny muted"> (không bắt buộc)</span>}</td>
                <td data-label="Trạng thái"><Badge tone={stateTones[step.state]}>{stateNames[step.state]}</Badge></td>
                <td data-label="Cập nhật">{time(step.updatedAt)}</td>
                <td>
                  {step.evidenceId ? (
                    <button type="button" className="link-button" onClick={(event) => onOpen({ kind: "step", assignment, step }, event)}>
                      Xem bằng chứng
                    </button>
                  ) : (
                    <span className="tiny muted">Chưa có</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </article>
  );
}

function groupOf(value: string, now = new Date()) {
  const date = new Date(value);
  if (date.toDateString() === now.toDateString()) return "Hôm nay";
  if (now.getTime() - date.getTime() < 7 * 86400000) return "Tuần này";
  return "Trước đó";
}

function ActivityGroups({
  items,
  onOpen,
}: {
  items: ActivityItem[];
  onOpen: (view: SheetView, event: React.MouseEvent<HTMLElement>) => void;
}) {
  const groups = items.reduce<Array<{ label: string; items: ActivityItem[] }>>((all, item) => {
    const label = groupOf(item.occurredAt);
    if (all.at(-1)?.label === label) all.at(-1)!.items.push(item);
    else all.push({ label, items: [item] });
    return all;
  }, []);
  return (
    <>
      {groups.map((group, index) => (
        <div className="activity-group" key={group.label + index}>
          <h3>{group.label}</h3>
          <ul className="activity-list">
            {group.items.map((item) => (
              <ActivityRow key={item.kind + item.id} item={item} onOpen={onOpen} />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function ActivityRow({ item, onOpen }: { item: ActivityItem; onOpen: (view: SheetView, event: React.MouseEvent<HTMLElement>) => void }) {
  return (
    <li className="activity-row">
      <Badge tone="outline">{item.kind === "QUIZ" ? "Quiz" : "Thực hành"}</Badge>
      <div className="activity-title">
        <b>{item.title}</b>
        <span className="tiny muted">
          {item.stepType ? stepNames[item.stepType] : item.labTitle ?? "Phòng lab"}
          {item.legacy && " · Bản ghi cũ, có thể thiếu liên kết bài học"}
        </span>
      </div>
      {item.kind === "QUIZ" ? (
        <Badge tone={item.passed ? "passed" : "practice"}>{item.passed ? "Đạt" : "Chưa đạt"}</Badge>
      ) : (
        <Badge tone={verdictTone(item.verdict)}>{item.verdict ? verdictLabel(item.verdict) : "Không rõ"}</Badge>
      )}
      <time dateTime={item.occurredAt} className="tiny muted">{time(item.occurredAt)}</time>
      <button
        type="button"
        className="link-button"
        onClick={(event) => onOpen(item.kind === "QUIZ" ? { kind: "quiz", id: item.id } : { kind: "practical", id: item.id }, event)}
      >
        Xem chi tiết
      </button>
    </li>
  );
}

function EvidenceSheet({ onClose, onBack, children }: { onClose: () => void; onBack?: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const panel = ref.current;
    panel?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <section ref={ref} role="dialog" aria-modal="true" aria-labelledby="evidence-sheet-title" className="evidence-sheet" onClick={(event) => event.stopPropagation()}>
        <header>
          {onBack && (
            <button type="button" className="secondary" onClick={onBack}>← Quay lại</button>
          )}
          <h2 id="evidence-sheet-title">Bằng chứng</h2>
          <button type="button" className="icon-button" aria-label="Đóng" onClick={onClose} data-autofocus>×</button>
        </header>
        {children}
      </section>
    </div>
  );
}

function SheetContent({ view, push }: { view: SheetView; push: (view: SheetView) => void }) {
  if (view.kind === "quiz") return <QuizDetail id={view.id} />;
  if (view.kind === "practical") return <PracticalDetail id={view.id} />;
  return <StepDetail assignment={view.assignment} step={view.step} push={push} />;
}

function StepDetail({ assignment, step, push }: { assignment: MyProgressAssignment; step: MyProgressStep; push: (view: SheetView) => void }) {
  const kind = step.type === "QUIZ" ? "QUIZ" : step.type === "LAB" || step.type === "CHALLENGE" ? "PRACTICAL" : null;
  const attempts = useQuery<ActivityPage>({
    queryKey: ["me-activity-step", step.stepId],
    queryFn: () => api(`/me/activity?limit=50&kind=${kind}&stepId=${encodeURIComponent(step.stepId)}`),
    enabled: Boolean(kind),
  });
  const saved = step.stepProgress;
  return (
    <div className="evidence-body">
      <p className="eyebrow">{assignment.title}</p>
      <h3>{stepNames[step.type]} · <Badge tone={stateTones[step.state]}>{stateNames[step.state]}</Badge></h3>
      <dl className="evidence-facts">
        <dt>Hoàn thành lúc</dt><dd>{time(step.completedAt)}</dd>
        <dt>Cập nhật gần nhất</dt><dd>{time(step.updatedAt)}</dd>
        {saved && (
          <>
            <dt>Bắt đầu lúc</dt><dd>{time(saved.startedAt)}</dd>
            <dt>Mức đã học</dt><dd>{saved.progressValue}%</dd>
            {step.type === "VIDEO" && saved.lastPosition !== null && (<><dt>Đã xem tới</dt><dd>{saved.lastPosition} giây</dd></>)}
            {step.type === "STUDY_CARDS" && (<><dt>Thẻ đã xem</dt><dd>{saved.visitedCards}</dd></>)}
          </>
        )}
        {step.quiz && (
          <>
            <dt>Lần mới nhất</dt><dd>{Math.round(step.quiz.latest.score)}% · {time(step.quiz.latest.createdAt)}</dd>
            <dt>Lần cao nhất</dt><dd>{Math.round(step.quiz.best.score)}% · {time(step.quiz.best.createdAt)}</dd>
          </>
        )}
        {step.practical && (
          <>
            <dt>Kết quả mới nhất</dt><dd>{verdictLabel(step.practical.latest.verdict)}</dd>
            <dt>Kết quả tốt nhất</dt><dd>{verdictLabel(step.practical.best.verdict)}</dd>
            <dt>Đạt lần đầu lúc</dt><dd>{time(step.practical.passedAt)}</dd>
          </>
        )}
      </dl>
      {kind && (
        <>
          <h4>Các lần thử của bước này</h4>
          <ErrorBox error={attempts.error} />
          {attempts.isPending ? (
            <p className="tiny muted">Đang tải…</p>
          ) : (
            <ul className="activity-list compact">
              {attempts.data?.items.map((item) => (
                <li className="activity-row" key={item.id}>
                  <time dateTime={item.occurredAt} className="tiny muted">{time(item.occurredAt)}</time>
                  {item.kind === "QUIZ" ? (
                    <Badge tone={item.passed ? "passed" : "practice"}>{item.passed ? "Đạt" : "Chưa đạt"}</Badge>
                  ) : (
                    <Badge tone={verdictTone(item.verdict)}>{item.verdict ? verdictLabel(item.verdict) : "Không rõ"}</Badge>
                  )}
                  {item.id === step.evidenceId && <span className="tiny">Dùng để tính trạng thái</span>}
                  <button type="button" className="link-button" onClick={() => push(item.kind === "QUIZ" ? { kind: "quiz", id: item.id } : { kind: "practical", id: item.id })}>
                    Xem chi tiết
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Link className="secondary" to={stepLink(assignment.assignmentId, step.stepId)!}>Mở bước học</Link>
    </div>
  );
}

function QuizDetail({ id }: { id: string }) {
  const q = useQuery<MyQuizAttemptDetail>({ queryKey: ["me-quiz-attempt", id], queryFn: () => api("/me/quiz-attempts/" + id) });
  if (q.isPending) return <p className="tiny muted">Đang tải…</p>;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? "Không tìm thấy bản ghi"} />;
  const a = q.data;
  const link = a.sourceAvailable ? stepLink(a.assignmentId, a.stepId) : null;
  return (
    <div className="evidence-body">
      <p className="eyebrow">{a.lessonTitle}</p>
      <h3>
        Bài kiểm tra · lần {a.attemptNumber}/{a.totalAttempts}{" "}
        {a.latest && <Badge tone="outline">Mới nhất</Badge>} {a.best && <Badge tone="gold">Cao nhất</Badge>}
      </h3>
      <dl className="evidence-facts">
        <dt>Thời gian</dt><dd>{time(a.createdAt)}</dd>
        <dt>Kết quả</dt><dd><Badge tone={a.passed ? "passed" : "practice"}>{a.passed ? "Đạt" : "Chưa đạt"}</Badge></dd>
        <dt>Cách tính điểm</dt><dd>{a.correctCount}/{a.questionCount} câu đúng = {Math.round(a.score)}% (cần từ {a.passThreshold}% để đạt)</dd>
      </dl>
      <h4>Từng câu hỏi</h4>
      <ol className="question-results">
        {a.results.map((result) => (
          <li key={result.questionId}>
            <p>{result.prompt}</p>
            <p className="tiny">
              Em chọn: {result.selectedOptionText || "Chưa có đáp án"} · <b>{result.correct ? "Đúng" : "Chưa đúng"}</b>
            </p>
          </li>
        ))}
      </ol>
      {link ? <Link className="secondary" to={link}>Mở bước học</Link> : <p className="tiny muted">Bài học gốc không còn khả dụng.</p>}
    </div>
  );
}

function PracticalDetail({ id }: { id: string }) {
  const q = useQuery<MyPracticalAttemptDetail>({ queryKey: ["me-attempt", id], queryFn: () => api("/me/attempts/" + id) });
  if (q.isPending) return <p className="tiny muted">Đang tải…</p>;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? "Không tìm thấy bản ghi"} />;
  const a = q.data;
  const link = a.sourceAvailable ? stepLink(a.assignmentId, a.stepId) : null;
  return (
    <div className="evidence-body">
      <p className="eyebrow">{a.lessonTitle ?? a.labTitle}</p>
      <h3>{a.labTitle} · lần thử {a.attemptNumber}</h3>
      <dl className="evidence-facts">
        <dt>Thời gian</dt><dd>{time(a.createdAt)}</dd>
        <dt>Kết quả chính thức</dt><dd><Badge tone={verdictTone(a.verdict)}>{a.verdict ? verdictLabel(a.verdict) : "Không rõ"}</Badge></dd>
        <dt>Mục tiêu</dt><dd>{a.challengeObjective}</dd>
        {a.outcome.currentMa !== null && (<><dt>Dòng điện đo được</dt><dd>{a.outcome.currentMa} mA</dd></>)}
        <dt>Thời lượng</dt><dd>{Math.round(a.durationMs / 1000)} giây</dd>
        <dt>Gợi ý đã dùng</dt><dd>{a.hintLevels.length ? "Mức " + a.hintLevels.join(", ") : "Không"}</dd>
        <dt>Mô hình mô phỏng</dt><dd>phiên bản {a.simulationModelVersion}</dd>
      </dl>
      {a.retryGuidance && <p className="notice">{a.retryGuidance}</p>}
      {a.legacy && <p className="tiny muted">Bản ghi cũ: có thể thiếu liên kết tới bài được giao.</p>}
      {link ? <Link className="secondary" to={link}>Mở bước thực hành</Link> : <p className="tiny muted">Không có bước học gốc để mở.</p>}
    </div>
  );
}
