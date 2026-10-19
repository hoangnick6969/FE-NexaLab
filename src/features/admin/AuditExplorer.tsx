import { useState } from "react";
import { Field } from "../../components/ui";
import { LoadMore, QueryState, ROLE_LABEL, Status, rowsOf, usePaged, when } from "./admin-ui";

// ───────────────────────── audit ─────────────────────────
export function AuditExplorer() {
  const [draft, setDraft] = useState({ action: "", targetType: "", targetId: "", actorId: "", outcome: "", from: "", to: "" });
  const [filters, setFilters] = useState(draft);
  const q = usePaged(["admin", "audit"], "/admin/audit", {
    ...filters,
    from: filters.from ? new Date(filters.from).toISOString() : "",
    to: filters.to ? new Date(filters.to).toISOString() : "",
  });
  const rows = rowsOf(q);
  const diff = (before: any, after: any) =>
    [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].map(
      (k) => `${k}: ${JSON.stringify(before?.[k] ?? null)} → ${JSON.stringify(after?.[k] ?? null)}`,
    );
  return (
    <section className="panel table-wrap">
      <h2>Nhật ký kiểm toán</h2>
      <p className="tiny muted">
        Mỗi lần xem nhật ký cũng được ghi lại. Mật khẩu, mã, đáp án và nội dung gợi ý không bao giờ được lưu hay hiển thị.
      </p>
      <form
        className="admin-filters"
        aria-label="Lọc nhật ký"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
        }}
      >
        <Field
          label="Hành động (tiền tố)"
          placeholder="user."
          value={draft.action}
          onChange={(e) => setDraft({ ...draft, action: e.target.value })}
        />
        <Field
          label="Loại đối tượng"
          placeholder="User"
          value={draft.targetType}
          onChange={(e) => setDraft({ ...draft, targetType: e.target.value })}
        />
        <Field label="Mã đối tượng" value={draft.targetId} onChange={(e) => setDraft({ ...draft, targetId: e.target.value })} />
        <Field label="Mã người thực hiện" value={draft.actorId} onChange={(e) => setDraft({ ...draft, actorId: e.target.value })} />
        <label className="field">
          <span>Kết quả</span>
          <select value={draft.outcome} onChange={(e) => setDraft({ ...draft, outcome: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="success">Thành công</option>
            <option value="denied">Bị từ chối</option>
            <option value="failure">Thất bại</option>
          </select>
        </label>
        <Field label="Từ" type="datetime-local" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        <Field label="Đến" type="datetime-local" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        <button className="secondary">Lọc</button>
      </form>
      <QueryState query={q} empty={!q.isLoading && rows.length === 0}>
        <table>
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Người thực hiện</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Kết quả</th>
              <th>Lý do</th>
              <th>Thay đổi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="tiny">{when(r.createdAt)}</td>
                <td>{r.actor ? `${r.actor.fullName} (${ROLE_LABEL[r.actor.role] ?? r.actor.role})` : (r.actorRole ?? "Hệ thống")}</td>
                <td>
                  <code>{r.action}</code>
                </td>
                <td className="tiny">
                  {r.targetType}
                  {r.targetId ? ` · ${r.targetId}` : ""}
                </td>
                <td>
                  <Status value={r.outcome} />
                </td>
                <td className="tiny">{r.reason ?? "—"}</td>
                <td className="tiny">
                  {diff(r.before, r.after).map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <LoadMore query={q} />
      </QueryState>
    </section>
  );
}
