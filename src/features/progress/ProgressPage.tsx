import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, useAuth } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, Field, useAction, verdictLabel, InlineLoader } from "../../components/ui";
import { StudentProgress } from "./StudentProgress";
import { dateTime } from "../../lib/test-status";

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
  const notices = useQuery<Array<{ id: string; assignmentId: string; title: string; className: string; dueAt: string; extended: boolean }>>({
    queryKey: ["assignment-notices", student],
    queryFn: () => api("/children/" + student + "/assignment-notices"),
    enabled: !!student && user.role === "PARENT",
  });
  const link = useAction((code: string) =>
    api("/children/link", "POST", { code }),
  );
  const verifyEmail = useAction(() => api("/auth/email/verify", "POST"));
  const consent = useAction(async () => {
    // The server publishes the exact consent version and hash it accepts.
    const terms = await api<{ purpose: string; version: string; contentHash: string }>("/auth/consents/parent-child-progress");
    return api("/auth/consents", "POST", terms);
  });
  const unlink = useAction((id: string) => api("/children/" + id + "/link", "DELETE"));
  return (
    <>
      <PageHeading
        eyebrow="TỪNG BƯỚC TIẾN BỘ"
        title={
          user.role === "PARENT" ? "Đồng hành cùng con" : "Tiến độ học tập"
        }
        description="Mỗi lần thử đều là một bước tiến trong hành trình hiểu biết."
      />
      {user.role === "PARENT" && (
        <section className="panel">
          <h3>Học sinh đã liên kết</h3>
          <div className="button-row">
            <button className="secondary" onClick={() => verifyEmail.mutate()}>Xác minh email</button>
            <button className="secondary" onClick={() => consent.mutate()}>Chấp thuận theo dõi tiến độ</button>
          </div>
          <div className="button-row">
            {children.data?.map((c: any) => (
              <span key={c.student.id}>
                <button className="secondary" onClick={() => setStudent(c.student.id)}>{c.student.fullName}</button>
                <button className="icon-button" aria-label="Hủy liên kết" onClick={() => unlink.mutate(c.student.id)}>×</button>
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
            <Field label="Mã liên kết do con cung cấp" name="code" required />
            <button className="primary" disabled={link.isPending}>
              Liên kết
            </button>
          </form>
          <p className="tiny muted">
            Liên kết chỉ hiển thị tiến độ tổng hợp và hoạt động an toàn của con; không hiển thị đáp án, gợi ý hoặc trạng thái lab thô.
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
              Mở lớp học để xem phân tích từng học sinh →
            </Link>
          ) : (
            <Link to="/admin">Mở quản trị để xem người dùng →</Link>
          )}
        </Empty>
      ) : (
        <>
          <ErrorBox error={q.error} />
          {user.role === "PARENT" && student && (
            <section className="panel" aria-labelledby="parent-notices-title">
              <h2 id="parent-notices-title">Thông báo bài quá hạn</h2>
              <ErrorBox error={notices.error} />
              {notices.data?.length ? (
                notices.data.map((notice) => (
                  <div className="assignment-row" key={notice.id}>
                    <div>
                      <b>{notice.title}</b>
                      <small>
                        {notice.className} · Đã quá hạn {dateTime(notice.dueAt)}
                        {notice.extended ? " (hạn đã được dời)" : ""} · Con chưa nộp bài
                      </small>
                    </div>
                    <Badge tone="not_passed">Quá hạn</Badge>
                  </div>
                ))
              ) : notices.isLoading ? (
                <InlineLoader message="Đang tải thông báo…" />
              ) : (
                <Empty>Không có bài kiểm tra nào quá hạn.</Empty>
              )}
              <p className="tiny muted">Thông báo chỉ để phụ huynh nắm tình hình; quá hạn không tự bị chấm 0 điểm. Việc nộp bài và quyết định về bài trễ thuộc về học sinh và giáo viên.</p>
            </section>
          )}
          {q.data ? (
            <>
              <div className="progress-cards">
                {q.data.progress.map((p: any) => (
                  <div className="panel" key={p.contentId}>
                    <Badge>
                      {p.status === "completed" ? "Hoàn thành" : "Đang học"}
                    </Badge>
                    <h3>
                      {{
                        circuit: "Mạch điện",
                        eye: "Mắt người",
                        chemistry: "Phản ứng hóa học",
                      }[p.contentId as string] ?? p.contentId}
                    </h3>
                    <div className="progress-track">
                      <i style={{ width: p.score + "%" }} />
                    </div>
                    <p>
                      {Math.round(p.score)} điểm · {p.attemptsCount} lần thử
                    </p>
                    <small>Mức trợ giúp cao nhất: {p.lastHintLevel}/4</small>
                  </div>
                ))}
              </div>
              <section className="panel">
                <h2>Lịch sử thực hành</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Thử thách</th>
                        <th>Kết quả</th>
                        <th>Thời lượng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(q.data.attempts ?? []).map((a: any) => (
                        <tr key={a.id}>
                          <td>
                            {new Date(a.createdAt).toLocaleString("vi-VN")}
                          </td>
                          <td>{a.challengeId}</td>
                          <td>
                            <Badge tone={a.verdict}>
                              {verdictLabel(a.verdict)}
                            </Badge>
                          </td>
                          <td>{Math.round(a.durationMs / 1000)} giây</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!q.data.attempts?.length && (
                  <Empty>Chưa có lượt thực hành.</Empty>
                )}
              </section>
            </>
          ) : q.isLoading && student ? (
            <InlineLoader message="Đang phân tích tiến độ học tập…" />
          ) : (
            <Empty>
              {student ? "Chưa có dữ liệu tiến độ." : "Chọn học sinh để xem tiến độ."}
            </Empty>
          )}
        </>
      )}
    </>
  );
}
