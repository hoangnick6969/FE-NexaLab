import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, isApiError } from "../../lib/api";
import { Field, useAction } from "../../components/ui";
import { LESSON_STATUS, LoadMore, QueryState, ReasonDialog, SCOPE_LABEL, Status, rowsOf, usePaged } from "./admin-ui";

// ───────────────────────── content ─────────────────────────
export function Content() {
  const [filters, setFilters] = useState({ q: "", scope: "", status: "" });
  const q = usePaged(["admin", "content"], "/admin/content", filters);
  const rows = rowsOf(q);
  const [op, setOp] = useState<any>(null);
  const [acknowledge, setAcknowledge] = useState(false);
  const act = useAction(({ id, body }: any) => api(`/admin/content/${id}/operations`, "POST", body));
  const staff = useQuery({
    queryKey: ["admin", "teachers"],
    queryFn: () => api("/admin/users?role=TEACHER&status=active&limit=100"),
    enabled: op?.action === "reassign",
  });
  const [newOwnerId, setNewOwnerId] = useState("");
  const effects: Record<string, string> = {
    quarantine:
      "Học sinh mất quyền mở bài ngay, kể cả bài đã bắt đầu; giáo viên không thể sửa hay giao lại cho tới khi gỡ cách ly. Kết quả học tập được giữ nguyên.",
    release: "Bài học trở lại trạng thái trước khi bị cách ly.",
    archive: "Bài không thể giao mới; học sinh đã bắt đầu vẫn tiếp tục được. Kết quả học tập được giữ nguyên.",
    reassign: "Quyền sửa và quản lý bài chuyển cho người nhận. Lịch sử học tập và bài giao không đổi.",
  };
  const labels: Record<string, string> = {
    quarantine: "Cách ly",
    release: "Gỡ cách ly",
    archive: "Lưu trữ",
    reassign: "Chuyển chủ sở hữu",
  };
  const warning = isApiError(act.error, "ACTIVE_ASSIGNMENTS_WARNING");
  return (
    <section className="panel table-wrap">
      <h2>Nội dung</h2>
      <p className="tiny muted">
        Quản trị viên kiểm tra, cách ly, lưu trữ hoặc chuyển chủ sở hữu, nhưng không sửa nội dung bài riêng và không tự duyệt chuyên môn.
        Bài dùng chung chỉ xuất bản khi đủ các lượt duyệt có tên.
      </p>
      <form className="admin-filters" onSubmit={(e) => e.preventDefault()} aria-label="Lọc nội dung">
        <Field label="Tìm theo tiêu đề" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <label className="field">
          <span>Phạm vi</span>
          <select value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="TEACHER_PRIVATE">Riêng của giáo viên</option>
            <option value="SHARED_LIBRARY">Thư viện chung</option>
          </select>
        </label>
        <label className="field">
          <span>Trạng thái</span>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Tất cả</option>
            {Object.entries(LESSON_STATUS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </form>
      <QueryState query={q} empty={!q.isLoading && rows.length === 0}>
        <table>
          <thead>
            <tr>
              <th>Bài học</th>
              <th>Chủ sở hữu</th>
              <th>Phạm vi</th>
              <th>Trạng thái</th>
              <th>Bài giao đang mở</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l: any) => (
              <tr key={l.id}>
                <td>
                  {l.title}
                  {l.releaseBlockers.length > 0 && (
                    <details className="tiny">
                      <summary>Còn thiếu {l.releaseBlockers.length} điều kiện phát hành</summary>
                      <ul>
                        {l.releaseBlockers.map((b: string) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {l.quarantineReason && <p className="tiny muted">Lý do cách ly: {l.quarantineReason}</p>}
                </td>
                <td>{l.author?.fullName ?? "—"}</td>
                <td>{SCOPE_LABEL[l.scope] ?? l.scope}</td>
                <td>
                  <Status value={l.status} />
                </td>
                <td>{l.activeAssignments}</td>
                <td className="admin-row-actions">
                  {(l.status === "quarantined"
                    ? ["release", "archive", "reassign"]
                    : l.status === "archived"
                      ? ["quarantine", "reassign"]
                      : ["quarantine", "archive", "reassign"]
                  ).map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={action === "release" || action === "reassign" ? "text-button" : "danger-text"}
                      onClick={() => {
                        act.reset();
                        setAcknowledge(false);
                        setNewOwnerId("");
                        setOp({ lesson: l, action });
                      }}
                    >
                      {labels[action]}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <LoadMore query={q} />
      </QueryState>
      {op && (
        <ReasonDialog
          title={`${labels[op.action]}: ${op.lesson.title}`}
          effect={effects[op.action]}
          confirmLabel={labels[op.action]}
          danger={op.action === "quarantine" || op.action === "archive"}
          pending={act.isPending || (op.action === "reassign" && !newOwnerId) || (warning && !acknowledge)}
          error={act.error}
          onClose={() => setOp(null)}
          onSubmit={(reason) =>
            act.mutate(
              {
                id: op.lesson.id,
                body: {
                  action: op.action,
                  reason,
                  ...(op.action === "reassign" ? { newOwnerId } : {}),
                  ...(acknowledge ? { acknowledgeActiveAssignments: true } : {}),
                },
              },
              { onSuccess: () => setOp(null) },
            )
          }
        >
          {op.action === "reassign" && (
            <label className="field">
              <span>Người nhận</span>
              <select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)} required>
                <option value="">— Chọn giáo viên —</option>
                {(staff.data?.items ?? [])
                  .filter((u: any) => u.id !== op.lesson.author?.id)
                  .map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {warning && (
            <label className="admin-ack">
              <input type="checkbox" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} /> Tôi hiểu ảnh hưởng tới{" "}
              {(act.error as any).details?.activeAssignments} bài giao đang mở
            </label>
          )}
        </ReasonDialog>
      )}
    </section>
  );
}
