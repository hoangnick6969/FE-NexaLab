import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, useAuth } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Empty, ErrorBox, Field, useAction, verdictLabel } from "../../components/ui";
import { StudentProgress } from "./StudentProgress";
import { dateTime } from "../../lib/test-status";
import { defineText, formatDateTime } from "../../i18n";
import { HelpSeekingPanel } from "./HelpSeekingPanel";
import { ParentLabsSkeleton, ParentRowsSkeleton } from "./ParentSkeletons";
import "./parent.css";

const text = defineText({
  vi: {
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
    labsTitle: (name?: string) => (name ? `Các bài thực hành của ${name}` : "Các bài thực hành"),
    points: "điểm",
    attemptsOf: (n: number) => `${n} lần thử`,
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
    labsTitle: (name?: string) => (name ? `${name}'s practice labs` : "Practice labs"),
    points: "points",
    attemptsOf: (n: number) => `${n} ${n === 1 ? "attempt" : "attempts"}`,
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
  const [searchParams] = useSearchParams();
  const [student, setStudent] = useState(
    user.role === "STUDENT" ? user.id : searchParams.get("child") ?? "",
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
  const parent = user.role === "PARENT";
  const activeChild = children.data?.find((c: any) => c.student.id === student)?.student;
  return (
    <>
      <PageHeading
        title={parent ? t.parentTitle : t.title}
        description={t.description}
      />
      {user.role === "STUDENT" ? (
        <StudentProgress />
      ) : ["TEACHER", "ADMIN"].includes(user.role) ? (
        <Empty>
          {user.role === "TEACHER" ? (
            <Link to="/classes">{t.openClasses}</Link>
          ) : (
            <Link to="/admin">{t.openAdmin}</Link>
          )}
        </Empty>
      ) : (
        <div className="pp-page">
          <section className="pp-section" aria-labelledby="parent-linked-title">
            <div className="pp-section-head"><h2 id="parent-linked-title">{t.linked}</h2></div>
            {!!children.data?.length && (
              <ul className="pp-picker">
                {children.data.map((c: any) => (
                  <li key={c.student.id} className={student === c.student.id ? "is-active" : ""}>
                    <button type="button" className="pp-pick" aria-pressed={student === c.student.id} onClick={() => setStudent(c.student.id)}>
                      {c.student.fullName}
                    </button>
                    <button
                      type="button"
                      className="pp-text-btn"
                      disabled={unlink.isPending}
                      onClick={() => window.confirm(t.confirmUnlink(c.student.fullName)) && unlink.mutate(c.student.id)}
                    >
                      {t.unlink}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {status && (
              <ul className="pp-checks">
                <li className={status.emailVerified ? "is-ok" : "is-todo"}>
                  <span>{status.emailVerified ? t.emailVerified : t.emailNotVerified}</span>
                  {!status.emailVerified && <button type="button" className="pp-text-btn" disabled={verifyEmail.isPending} onClick={() => verifyEmail.mutate(undefined)}>{t.verifyEmail}</button>}
                </li>
                <li className={status.consent ? "is-ok" : "is-todo"}>
                  <span>{status.consent ? t.consentDone : t.consentMissing}</span>
                  {!status.consent && <button type="button" className="pp-text-btn" disabled={consent.isPending} onClick={() => consent.mutate(undefined)}>{t.consent}</button>}
                </li>
              </ul>
            )}
            {status?.pending.length ? (
              <div>
                <h3 className="pp-sub">{t.pendingTitle}</h3>
                <ul className="pp-plain">
                  {status.pending.map((p) => (
                    <li key={p.studentId}>{p.fullName}</li>
                  ))}
                </ul>
                <p className="pp-note">{t.pendingHint}</p>
              </div>
            ) : null}
            <form
              className="pp-link-form"
              onSubmit={(e) => {
                e.preventDefault();
                link.mutate(String(new FormData(e.currentTarget).get("code")));
              }}
            >
              <Field label={t.code} name="code" required />
              <button className="primary pp-btn" disabled={link.isPending}>
                {t.link}
              </button>
            </form>
            <p className="pp-note">{t.linkScope}</p>
            {notice && <p className="notice" role="status">{notice}</p>}
            <ErrorBox error={link.error || verifyEmail.error || consent.error || unlink.error || children.error || linkStatus.error} />
          </section>

          <ErrorBox error={q.error} />
          {student && (
            <section className="pp-section" aria-labelledby="parent-notices-title">
              <div className="pp-section-head"><h2 id="parent-notices-title">{t.overdueNotices}</h2></div>
              <ErrorBox error={notices.error} />
              {notices.data?.length ? (
                <div className="pp-rows">
                  {notices.data.map((notice) => (
                    <div className="pp-row" key={notice.id}>
                      <div>
                        <b>{notice.title}</b>
                        <small>
                          {notice.className}, {t.overdueSince(dateTime(notice.dueAt))}
                          {notice.extended ? t.extended : ""}. {t.notSubmitted}
                        </small>
                      </div>
                      <div className="pp-row-end">
                        <span className="pp-row-state">{t.overdue}</span>
                        {!notice.readAt && (
                          <button type="button" className="pp-text-btn" disabled={markSeen.isPending} onClick={() => markSeen.mutate(notice.id)}>
                            {t.markSeen}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : notices.isLoading ? (
                <ParentRowsSkeleton label={t.loadingNotices} />
              ) : (
                <Empty>{t.noOverdue}</Empty>
              )}
              <p className="pp-note">{t.parentNote}</p>
            </section>
          )}
          {student && <HelpSeekingPanel key={student} studentId={student} />}
          {q.data ? (
            <>
              <section className="pp-section" aria-labelledby="parent-labs-title">
                <div className="pp-section-head"><h2 id="parent-labs-title">{t.labsTitle(activeChild?.fullName)}</h2></div>
                <div className="pp-labs">
                  {q.data.progress.map((p: any) => (
                    <article className="pp-lab" key={p.contentId}>
                      <h3>{t.labs[p.contentId as string] ?? p.contentId}</h3>
                      <span className={`pp-lab-state ${p.status === "completed" ? "is-done" : "is-doing"}`}>
                        {p.status === "completed" ? t.completed : t.inProgress}
                      </span>
                      <p className="pp-lab-score nx-reading"><span className="nx-value">{Math.round(p.score)}</span><span className="nx-unit">{t.points}</span></p>
                      <div className="progress-track" role="progressbar" aria-valuenow={Math.round(p.score)} aria-valuemin={0} aria-valuemax={100}>
                        <i style={{ width: p.score + "%" }} />
                      </div>
                      <small>{t.attemptsOf(p.attemptsCount)}. {t.highestHint(p.lastHintLevel)}</small>
                    </article>
                  ))}
                </div>
              </section>
              <section className="pp-section" aria-labelledby="parent-history-title">
                <div className="pp-section-head"><h2 id="parent-history-title">{t.history}</h2></div>
                {!!q.data.attempts?.length && (
                  <div className="pp-table-wrap">
                    <table className="pp-table">
                      <thead>
                        <tr>
                          <th>{t.time}</th>
                          <th>{t.challenge}</th>
                          <th>{t.result}</th>
                          <th>{t.duration}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.data.attempts.map((a: any) => (
                          <tr key={a.id}>
                            <td>{formatDateTime(a.createdAt)}</td>
                            <td>{a.challengeId}</td>
                            <td>
                              <span className={`pp-result ${a.verdict === "passed" ? "is-passed" : a.verdict === "partial" ? "is-partial" : ""}`}>
                                {verdictLabel(a.verdict)}
                              </span>
                            </td>
                            <td>{t.seconds(Math.round(a.durationMs / 1000))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {!q.data.attempts?.length && (
                  <Empty>{t.noPractice}</Empty>
                )}
              </section>
            </>
          ) : q.isLoading && student ? (
            <ParentLabsSkeleton label={t.analysing} />
          ) : (
            <Empty>
              {student ? t.noData : t.chooseStudent}
            </Empty>
          )}
        </div>
      )}
    </>
  );
}
