import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, isApiError } from "../../lib/api";
import { Field, useAction } from "../../components/ui";
import { LESSON_STATUS, LoadMore, QueryState, ReasonDialog, SCOPE_LABEL, Status, rowsOf, usePaged } from "./admin-ui";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    effects: { quarantine: "Học sinh mất quyền mở bài ngay, kể cả bài đã bắt đầu; giáo viên không thể sửa hay giao lại cho tới khi gỡ cách ly. Kết quả học tập được giữ nguyên.", release: "Bài học trở lại trạng thái trước khi bị cách ly.", archive: "Bài không thể giao mới; học sinh đã bắt đầu vẫn tiếp tục được. Kết quả học tập được giữ nguyên.", reassign: "Quyền sửa và quản lý bài chuyển cho người nhận. Lịch sử học tập và bài giao không đổi." } as Record<string, string>,
    labels: { quarantine: "Cách ly", release: "Gỡ cách ly", archive: "Lưu trữ", reassign: "Chuyển chủ sở hữu" } as Record<string, string>,
    title: "Nội dung",
    note: "Quản trị viên kiểm tra, cách ly, lưu trữ hoặc chuyển chủ sở hữu, nhưng không sửa nội dung bài riêng và không tự duyệt chuyên môn. Bài dùng chung chỉ xuất bản khi đủ các lượt duyệt có tên.",
    filter: "Lọc nội dung",
    search: "Tìm theo tiêu đề",
    scope: "Phạm vi",
    all: "Tất cả",
    teacherPrivate: "Riêng của giáo viên",
    shared: "Thư viện chung",
    status: "Trạng thái",
    lesson: "Bài học",
    owner: "Chủ sở hữu",
    openAssignments: "Bài giao đang mở",
    actions: "Thao tác",
    blockers: (n: number) => `Còn thiếu ${n} điều kiện phát hành`,
    quarantineReason: "Lý do cách ly:",
    recipient: "Người nhận",
    chooseTeacher: "— Chọn giáo viên —",
    acknowledge: (n: number) => `Tôi hiểu ảnh hưởng tới ${n} bài giao đang mở`,
  },
  en: {
    effects: { quarantine: "Students lose access at once, even to lessons they started; teachers cannot edit or reassign it until it is released. Results are kept.", release: "The lesson returns to its state before quarantine.", archive: "The lesson cannot be newly assigned; students who started can continue. Results are kept.", reassign: "Editing and management move to the recipient. Learning history and assignments do not change." },
    labels: { quarantine: "Quarantine", release: "Release", archive: "Archive", reassign: "Change owner" },
    title: "Content",
    note: "Administrators inspect, quarantine, archive or change ownership, but never edit private lessons or approve subject content themselves. Shared lessons publish only with every named review.",
    filter: "Filter content",
    search: "Search by title",
    scope: "Scope",
    all: "All",
    teacherPrivate: "Teacher's private",
    shared: "Shared library",
    status: "Status",
    lesson: "Lesson",
    owner: "Owner",
    openAssignments: "Open assignments",
    actions: "Actions",
    blockers: (n: number) => `${n} release ${n === 1 ? "condition" : "conditions"} missing`,
    quarantineReason: "Quarantine reason:",
    recipient: "Recipient",
    chooseTeacher: "— Choose a teacher —",
    acknowledge: (n: number) => `I understand this affects ${n} open ${n === 1 ? "assignment" : "assignments"}`,
  },
});
const t = text();

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
  const effects: Record<string, string> = t.effects;
  const labels: Record<string, string> = t.labels;
  const warning = isApiError(act.error, "ACTIVE_ASSIGNMENTS_WARNING");
  return (
    <section className="panel table-wrap">
      <h2>{t.title}</h2>
      <p className="tiny muted">
        {t.note}
      </p>
      <form className="admin-filters" onSubmit={(e) => e.preventDefault()} aria-label={t.filter}>
        <Field label={t.search} value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <label className="field">
          <span>{t.scope}</span>
          <select value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}>
            <option value="">{t.all}</option>
            <option value="TEACHER_PRIVATE">{t.teacherPrivate}</option>
            <option value="SHARED_LIBRARY">{t.shared}</option>
          </select>
        </label>
        <label className="field">
          <span>{t.status}</span>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">{t.all}</option>
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
              <th>{t.lesson}</th>
              <th>{t.owner}</th>
              <th>{t.scope}</th>
              <th>{t.status}</th>
              <th>{t.openAssignments}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l: any) => (
              <tr key={l.id}>
                <td>
                  {l.title}
                  {l.releaseBlockers.length > 0 && (
                    <details className="tiny">
                      <summary>{t.blockers(l.releaseBlockers.length)}</summary>
                      <ul>
                        {l.releaseBlockers.map((b: string) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {l.quarantineReason && <p className="tiny muted">{t.quarantineReason} {l.quarantineReason}</p>}
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
              <span>{t.recipient}</span>
              <select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)} required>
                <option value="">{t.chooseTeacher}</option>
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
              <input type="checkbox" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} /> {t.acknowledge((act.error as any).details?.activeAssignments)}
            </label>
          )}
        </ReasonDialog>
      )}
    </section>
  );
}
