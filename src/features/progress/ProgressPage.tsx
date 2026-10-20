import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, useAuth } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, Field, useAction, verdictLabel, InlineLoader } from "../../components/ui";
import { StudentProgress } from "./StudentProgress";
import { dateTime } from "../../lib/test-status";
import { defineText, formatDateTime } from "../../i18n";

const text = defineText({
  vi: {
    eyebrow: "TỪNG BƯỚC TIẾN BỘ",
    parentTitle: "Đồng hành cùng con",
    title: "Tiến độ học tập",
    description: "Mỗi lần thử đều là một bước tiến trong hành trình hiểu biết.",
    linked: "Học sinh đã liên kết",
    verifyEmail: "Xác minh email",
    consent: "Chấp thuận theo dõi tiến độ",
    unlink: "Hủy liên kết",
    code: "Mã liên kết do con cung cấp",
    link: "Liên kết",
    linkScope: "Liên kết chỉ hiển thị tiến độ tổng hợp và hoạt động an toàn của con; không hiển thị đáp án, gợi ý hoặc trạng thái lab thô.",
    openClasses: "Mở lớp học để xem phân tích từng học sinh",
    openAdmin: "Mở quản trị để xem người dùng",
    overdueNotices: "Thông báo bài quá hạn",
    overdueSince: (date: string) => `Đã quá hạn ${date}`,
    extended: " (hạn đã được dời)",
    notSubmitted: "Con chưa nộp bài",
    overdue: "Quá hạn",
    markSeen: "Đã xem",
    loadingNotices: "Đang tải thông báo…",
    noOverdue: "Không có bài kiểm tra nào quá hạn.",
    parentNote: "Thông báo chỉ để phụ huynh nắm tình hình; quá hạn không tự bị chấm 0 điểm. Việc nộp bài và quyết định về bài trễ thuộc về học sinh và giáo viên.",
    completed: "Hoàn thành",
    inProgress: "Đang học",
    labs: { circuit: "Mạch điện", eye: "Mắt người", chemistry: "Phản ứng hóa học" } as Record<string, string>,
    scoreAttempts: (score: number, n: number) => `${score} điểm · ${n} lần thử`,
    highestHint: (level: number) => `Mức trợ giúp cao nhất: ${level}/4`,
    history: "Lịch sử thực hành",
    time: "Thời gian",
    challenge: "Thử thách",
    result: "Kết quả",
    duration: "Thời lượng",
    seconds: (n: number) => `${n} giây`,
    noPractice: "Chưa có lượt thực hành.",
    analysing: "Đang phân tích tiến độ học tập…",
    noData: "Chưa có dữ liệu tiến độ.",
    chooseStudent: "Chọn học sinh để xem tiến độ.",
  },
  en: {
    eyebrow: "STEP BY STEP",
    parentTitle: "Supporting your child",
    title: "Learning progress",
    description: "Every attempt is a step forward in understanding.",
    linked: "Linked students",
    verifyEmail: "Verify email",
    consent: "Consent to progress tracking",
    unlink: "Unlink",
    code: "Link code from your child",
    link: "Link",
    linkScope: "A link shows only summary progress and safe activity; never answers, hints or raw lab state.",
    openClasses: "Open a class to see each student's analysis",
    openAdmin: "Open administration to see users",
    overdueNotices: "Overdue work notices",
    overdueSince: (date: string) => `Overdue since ${date}`,
    extended: " (due date extended)",
    notSubmitted: "Not submitted yet",
    overdue: "Overdue",
    markSeen: "Mark as seen",
    loadingNotices: "Loading notices…",
    noOverdue: "No tests are overdue.",
    parentNote: "Notices keep parents informed; overdue work is not scored 0 automatically. Submitting and late decisions belong to the student and teacher.",
    completed: "Completed",
    inProgress: "In progress",
    labs: { circuit: "Circuit", eye: "Human eye", chemistry: "Chemical reaction" },
    scoreAttempts: (score: number, n: number) => `${score} points · ${n} ${n === 1 ? "attempt" : "attempts"}`,
    highestHint: (level: number) => `Highest help level: ${level}/4`,
    history: "Practice history",
    time: "Time",
    challenge: "Challenge",
    result: "Result",
    duration: "Duration",
    seconds: (n: number) => `${n} s`,
    noPractice: "No practice attempts yet.",
    analysing: "Analysing learning progress…",
    noData: "No progress data yet.",
    chooseStudent: "Choose a student to see their progress.",
  },
});
const t = text();

export function ProgressPage() {
  const user = useAuth((s) => s.user)!;
  const [student, setStudent] = useState(
    user.role === "STUDENT" ? user.id : "",
  );
  const children = useQuery({
    queryKey: ["children"],
    queryFn: () => api("/children"),
    enabled: user.role === "PARENT",
  });
  const q = useQuery({
    queryKey: ["progress", student],
    queryFn: () => api(user.role === "PARENT" ? "/children/" + student + "/progress" : "/progress/" + student),
    enabled: !!student && user.role !== "STUDENT",
  });
  const queryClient = useQueryClient();
  // Each notice is the stored notification the bell shows (acc-3), so marking it here clears it there too.
  const markSeen = useMutation({
    mutationFn: (id: string) => api(`/me/notifications/${id}/read`, "POST"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assignment-notices"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
  const notices = useQuery<Array<{ id: string; assignmentId: string; title: string; className: string; dueAt: string; extended: boolean; readAt: string | null }>>({
    queryKey: ["assignment-notices", student],
    queryFn: () => api("/children/" + student + "/assignment-notices"),
    enabled: !!student && user.role === "PARENT",
  });
  const link = useAction((code: string) =>
    api("/children/link", "POST", { code }),
  );
  const verifyEmail = useAction(() => api("/auth/email/verify", "POST"));
  const consent = useAction(() => api("/auth/consents", "POST", { purpose: "PARENT_CHILD_PROGRESS", version: "2026-10-v1", contentHash: "dev" }));
  const unlink = useAction((id: string) => api("/children/" + id + "/link", "DELETE"));
  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={
          user.role === "PARENT" ? t.parentTitle : t.title
        }
        description={t.description}
      />
      {user.role === "PARENT" && (
        <section className="panel">
          <h3>{t.linked}</h3>
          <div className="button-row">
            <button className="secondary" onClick={() => verifyEmail.mutate()}>{t.verifyEmail}</button>
            <button className="secondary" onClick={() => consent.mutate()}>{t.consent}</button>
          </div>
          <div className="button-row">
            {children.data?.map((c: any) => (
              <span key={c.student.id}>
                <button className="secondary" onClick={() => setStudent(c.student.id)}>{c.student.fullName}</button>
                <button className="icon-button" aria-label={t.unlink} onClick={() => unlink.mutate(c.student.id)}>×</button>
              </span>
            ))}
          </div>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              link.mutate(String(new FormData(e.currentTarget).get("code")));
            }}
          >
            <Field label={t.code} name="code" required />
            <button className="primary" disabled={link.isPending}>
              {t.link}
            </button>
          </form>
          <p className="tiny muted">
            {t.linkScope}
          </p>
          <ErrorBox error={link.error || children.error} />
        </section>
      )}
      {user.role === "STUDENT" ? (
        <StudentProgress />
      ) : ["TEACHER", "ADMIN"].includes(user.role) ? (
        <Empty>
          {user.role === "TEACHER" ? (
            <Link to="/classes">
              {t.openClasses} →
            </Link>
          ) : (
            <Link to="/admin">{t.openAdmin} →</Link>
          )}
        </Empty>
      ) : (
        <>
          <ErrorBox error={q.error} />
          {user.role === "PARENT" && student && (
            <section className="panel" aria-labelledby="parent-notices-title">
              <h2 id="parent-notices-title">{t.overdueNotices}</h2>
              <ErrorBox error={notices.error} />
              {notices.data?.length ? (
                notices.data.map((notice) => (
                  <div className="assignment-row" key={notice.id}>
                    <div>
                      <b>{notice.title}</b>
                      <small>
                        {notice.className} · {t.overdueSince(dateTime(notice.dueAt))}
                        {notice.extended ? t.extended : ""} · {t.notSubmitted}
                      </small>
                    </div>
                    <Badge tone="not_passed">{t.overdue}</Badge>
                    {!notice.readAt && (
                      <button type="button" className="text-button" disabled={markSeen.isPending} onClick={() => markSeen.mutate(notice.id)}>
                        {t.markSeen}
                      </button>
                    )}
                  </div>
                ))
              ) : notices.isLoading ? (
                <InlineLoader message={t.loadingNotices} />
              ) : (
                <Empty>{t.noOverdue}</Empty>
              )}
              <p className="tiny muted">{t.parentNote}</p>
            </section>
          )}
          {q.data ? (
            <>
              <div className="progress-cards">
                {q.data.progress.map((p: any) => (
                  <div className="panel" key={p.contentId}>
                    <Badge>
                      {p.status === "completed" ? t.completed : t.inProgress}
                    </Badge>
                    <h3>
                      {t.labs[p.contentId as string] ?? p.contentId}
                    </h3>
                    <div className="progress-track">
                      <i style={{ width: p.score + "%" }} />
                    </div>
                    <p>
                      {t.scoreAttempts(Math.round(p.score), p.attemptsCount)}
                    </p>
                    <small>{t.highestHint(p.lastHintLevel)}</small>
                  </div>
                ))}
              </div>
              <section className="panel">
                <h2>{t.history}</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.time}</th>
                        <th>{t.challenge}</th>
                        <th>{t.result}</th>
                        <th>{t.duration}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(q.data.attempts ?? []).map((a: any) => (
                        <tr key={a.id}>
                          <td>
                            {formatDateTime(a.createdAt)}
                          </td>
                          <td>{a.challengeId}</td>
                          <td>
                            <Badge tone={a.verdict}>
                              {verdictLabel(a.verdict)}
                            </Badge>
                          </td>
                          <td>{t.seconds(Math.round(a.durationMs / 1000))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!q.data.attempts?.length && (
                  <Empty>{t.noPractice}</Empty>
                )}
              </section>
            </>
          ) : q.isLoading && student ? (
            <InlineLoader message={t.analysing} />
          ) : (
            <Empty>
              {student ? t.noData : t.chooseStudent}
            </Empty>
          )}
        </>
      )}
    </>
  );
}
