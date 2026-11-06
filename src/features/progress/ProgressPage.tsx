import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, AlertCircle, ShieldCheck, Mail, Trash2, FlaskConical, Atom, Eye, Zap, Clock } from "lucide-react";
import { api, useAuth } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, Field, useAction, verdictLabel, InlineLoader } from "../../components/ui";
import { StudentProgress } from "./StudentProgress";
import { dateTime } from "../../lib/test-status";
import { defineText, formatDateTime } from "../../i18n";
import { HelpSeekingPanel } from "./HelpSeekingPanel";

const text = defineText({
  vi: {
    eyebrow: "TỪNG BƯỚC TIẾN BỘ",
    parentTitle: "Đồng hành cùng con",
    title: "Tiến độ học tập",
    description: "Mỗi lần thử đều là một bước tiến trong hành trình hiểu biết.",
    linked: "Học sinh đã liên kết",
    verifyEmail: "Gửi email xác minh",
    verifySent: "Đã gửi email xác minh. Mở liên kết trong email để hoàn tất.",
    emailVerified: "Email đã xác minh",
    emailNotVerified: "Email chưa xác minh",
    consent: "Chấp thuận theo dõi tiến độ",
    consentDone: "Đã chấp thuận theo dõi tiến độ",
    consentMissing: "Chưa chấp thuận theo dõi tiến độ",
    consentSaved: "Đã ghi nhận chấp thuận.",
    pendingTitle: "Liên kết đang chờ kích hoạt",
    pendingHint: "Liên kết được kích hoạt khi bạn đã xác minh email và chấp thuận theo dõi tiến độ.",
    linkedPending: "Đã nhận mã. Liên kết đang chờ: hãy xác minh email và chấp thuận theo dõi tiến độ.",
    linkedApproved: "Đã liên kết thành công.",
    unlinked: "Đã hủy liên kết.",
    confirmUnlink: (name: string) => `Hủy liên kết với ${name}? Bạn sẽ không còn xem được tiến độ của con.`,
    unlink: "Hủy liên kết",
    code: "Mã liên kết do giáo viên cấp",
    link: "Liên kết",
    linkScope: "Liên kết chỉ hiển thị tiến độ tổng hợp và hoạt động an toàn của con; không hiển thị đáp án, nội dung gợi ý hoặc trạng thái lab thô (chỉ số lần con xin gợi ý).",
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
    verifyEmail: "Send verification email",
    verifySent: "Verification email sent. Open the link in it to finish.",
    emailVerified: "Email verified",
    emailNotVerified: "Email not verified",
    consent: "Consent to progress tracking",
    consentDone: "Progress tracking consented",
    consentMissing: "Progress tracking not consented",
    consentSaved: "Consent recorded.",
    pendingTitle: "Links waiting for activation",
    pendingHint: "A link activates once your email is verified and you have consented to progress tracking.",
    linkedPending: "Code accepted. The link is pending: verify your email and consent to progress tracking.",
    linkedApproved: "Linked successfully.",
    unlinked: "Link removed.",
    confirmUnlink: (name: string) => `Unlink ${name}? You will no longer see their progress.`,
    unlink: "Unlink",
    code: "Link code from the teacher",
    link: "Link",
    linkScope: "A link shows only summary progress and safe activity; never answers, hint text or raw lab state (only how often hints were asked).",
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

function LabIcon({ contentId }: { contentId: string }) {
  if (contentId === "circuit") return <Zap size={18} strokeWidth={2} />;
  if (contentId === "eye") return <Eye size={18} strokeWidth={2} />;
  return <FlaskConical size={18} strokeWidth={2} />;
}

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
  // Activation prerequisites and pending links (C1 CAP-3); approved children come from /children.
  const linkStatus = useQuery<{ emailVerified: boolean; consent: boolean; pending: Array<{ studentId: string; fullName: string }> }>({
    queryKey: ["children-link-status"],
    queryFn: () => api("/children/link-status"),
    enabled: user.role === "PARENT",
  });
  const [notice, setNotice] = useState("");
  const link = useAction(async (code: string) => {
    const result = await api<{ status: string }>("/children/link", "POST", { code });
    setNotice(result.status === "approved" ? t.linkedApproved : t.linkedPending);
  });
  // The email counts as verified only after the parent opens the mailed one-time link.
  const verifyEmail = useAction(async () => {
    await api("/auth/email/verify/request", "POST");
    setNotice(t.verifySent);
  });
  const consent = useAction(async () => {
    // The server publishes the exact consent version and hash it accepts.
    const terms = await api<{ purpose: string; version: string; contentHash: string }>("/auth/consents/parent-child-progress");
    await api("/auth/consents", "POST", terms);
    setNotice(t.consentSaved);
  });
  const unlink = useAction(async (id: string) => {
    await api("/children/" + id + "/link", "DELETE");
    // The unlinked child's data is no longer readable, so stop showing it.
    if (id === student) setStudent("");
    setNotice(t.unlinked);
  });
  const status = linkStatus.data;
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
          {status && (
            <div className="button-row">
              <Badge tone={status.emailVerified ? "passed" : "not_passed"}>{status.emailVerified ? t.emailVerified : t.emailNotVerified}</Badge>
              {!status.emailVerified && (
                <button className="secondary" disabled={verifyEmail.isPending} onClick={() => verifyEmail.mutate(undefined)}>{t.verifyEmail}</button>
              )}
              <Badge tone={status.consent ? "passed" : "not_passed"}>{status.consent ? t.consentDone : t.consentMissing}</Badge>
              {!status.consent && (
                <button className="secondary" disabled={consent.isPending} onClick={() => consent.mutate(undefined)}>{t.consent}</button>
              )}
            </div>
          )}
          <div className="button-row parent-children-row">
            {children.data?.map((c: any) => (
              <span key={c.student.id} className="child-chip-wrap">
                <button
                  className={`secondary child-pill ${student === c.student.id ? "is-active" : ""}`}
                  onClick={() => setStudent(c.student.id)}
                >
                  <Users size={14} aria-hidden="true" />
                  <span>{c.student.fullName}</span>
                </button>
                <button
                  className="icon-button child-unlink-btn"
                  aria-label={t.unlink}
                  disabled={unlink.isPending}
                  onClick={() => window.confirm(t.confirmUnlink(c.student.fullName)) && unlink.mutate(c.student.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {status?.pending.length ? (
            <div>
              <h4>{t.pendingTitle}</h4>
              <ul>
                {status.pending.map((p) => (
                  <li key={p.studentId}>{p.fullName}</li>
                ))}
              </ul>
              <p className="tiny muted">{t.pendingHint}</p>
            </div>
          ) : null}
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
          {notice && <p className="notice" role="status">{notice}</p>}
          <ErrorBox error={link.error || verifyEmail.error || consent.error || unlink.error || children.error || linkStatus.error} />
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
          {user.role === "PARENT" && student && <HelpSeekingPanel key={student} studentId={student} />}
          {q.data ? (
            <>
              <div className="progress-cards">
                {q.data.progress.map((p: any) => (
                  <div className="panel progress-lab-card" key={p.contentId}>
                    <div className="progress-lab-card-header">
                      <span className="progress-lab-icon">
                        <LabIcon contentId={p.contentId} />
                      </span>
                      <Badge tone={p.status === "completed" ? "passed" : "neutral"}>
                        {p.status === "completed" ? t.completed : t.inProgress}
                      </Badge>
                    </div>
                    <h3>
                      {t.labs[p.contentId as string] ?? p.contentId}
                    </h3>
                    <div className="progress-track" role="progressbar" aria-valuenow={Math.round(p.score)} aria-valuemin={0} aria-valuemax={100}>
                      <i style={{ width: p.score + "%" }} />
                    </div>
                    <p className="progress-lab-score">
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
