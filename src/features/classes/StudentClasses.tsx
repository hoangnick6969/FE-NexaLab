import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, idempotencyKey, isApiError } from "../../lib/api";
import { Badge, CardSkeleton, Empty, ErrorBox, Field, Modal } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { StudentClassResources } from "./ClassSpaceResources";
import { type StudentClass } from "./class-types";
import { LoadError, dueLabel, useMutate } from "./class-ui";

export function StudentClasses() {
  const [joining, setJoining] = useState(false);
  const [result, setResult] = useState<{ message: string; pending: boolean } | null>(null);
  const key = useRef(idempotencyKey());
  const list = useQuery<StudentClass[]>({ queryKey: ["classes"], queryFn: () => api("/classes") });
  const join = useMutate<{ enrollmentStatus: string; message: string; class: { name: string } }>();
  const joinError = join.error
    ? isApiError(join.error, "JOIN_RATE_LIMITED")
      ? "Bạn đã thử quá nhiều lần. Hãy thử lại sau 15 phút."
      : isApiError(join.error, "JOIN_CODE_INVALID")
        ? "Mã lớp không hợp lệ. Hãy kiểm tra lại với giáo viên."
        : join.error
    : null;
  return (
    <>
      <PageHeading
        eyebrow="CLASS SPACE"
        title="Class Space của em"
        description="Xem các lớp em tham gia, trạng thái thành viên và bài được giao."
        action={
          <button
            className="primary"
            onClick={() => {
              key.current = idempotencyKey();
              join.reset();
              setResult(null);
              setJoining(true);
            }}
          >
            Tham gia bằng mã
          </button>
        }
      />
      {result && (
        <p className="notice" role="status">
          {result.message}
        </p>
      )}
      <LoadError query={list} what="danh sách lớp" />
      {list.isLoading && <CardSkeleton count={2} />}
      {list.data && list.data.length === 0 && <Empty>Em chưa tham gia lớp nào. Hãy nhập mã lớp thầy cô gửi.</Empty>}
      {list.data?.map((c) => (
        <section className="panel" key={c.id}>
          <div className="section-heading">
            <h2>{c.name}</h2>
            <Badge tone={c.enrollmentStatus === "approved" ? "" : "outline"}>
              {c.status === "ARCHIVED" ? "Lớp đã lưu trữ" : c.enrollmentStatus === "approved" ? "Đã vào lớp" : "Chờ giáo viên duyệt"}
            </Badge>
          </div>
          {c.enrollmentStatus === "pending" && <p className="muted">Yêu cầu của em đang chờ giáo viên duyệt.</p>}
          {c.enrollmentStatus === "approved" && c.assignments.length === 0 && <p className="muted">Hiện chưa có bài được giao.</p>}
          {c.assignments.map((a) => (
            <div className="assignment-row" key={a.id}>
              <div>
                <b>{a.title}</b>
                <small>
                  {dueLabel(a.dueDate)}
                  {a.overdue && (a.contentType === "test" ? " · Đã quá hạn" : " · Đã quá hạn, vẫn có thể học")}
                </small>
              </div>
              <Link to={"/assignments/" + a.id}>Mở bài →</Link>
            </div>
          ))}
          {c.enrollmentStatus === "approved" && c.status === "ACTIVE" && <StudentClassResources classId={c.id} />}
        </section>
      ))}
      {joining && (
        <Modal title="Tham gia lớp" onClose={() => setJoining(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const code = String(new FormData(e.currentTarget).get("code") ?? "");
              join.mutate(
                { path: "/classes/join", key: key.current, body: { code } },
                {
                  onSuccess: (data) => {
                    setResult({ message: `${data.class.name}: ${data.message}`, pending: data.enrollmentStatus === "pending" });
                    setJoining(false);
                  },
                },
              );
            }}
          >
            <Field
              label="Mã tham gia lớp"
              name="code"
              required
              autoComplete="off"
              placeholder="NL-XXXXXX-XXXXXXXXXX"
              maxLength={40}
              onChange={() => {
                // A new code is a new request; retries of the same code keep the key.
                key.current = idempotencyKey();
              }}
            />
            <ErrorBox error={joinError} />
            <button className="primary wide" disabled={join.isPending}>
              {join.isPending ? "Đang gửi…" : "Tham gia"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
