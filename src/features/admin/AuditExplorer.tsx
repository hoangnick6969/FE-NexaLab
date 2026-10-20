import { useState } from "react";
import { Field } from "../../components/ui";
import { LoadMore, QueryState, ROLE_LABEL, Status, rowsOf, usePaged, when } from "./admin-ui";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    title: "Nhật ký kiểm toán",
    note: "Mỗi lần xem nhật ký cũng được ghi lại. Mật khẩu, mã, đáp án và nội dung gợi ý không bao giờ được lưu hay hiển thị.",
    filter: "Lọc nhật ký",
    action: "Hành động (tiền tố)",
    targetType: "Loại đối tượng",
    targetId: "Mã đối tượng",
    actorId: "Mã người thực hiện",
    result: "Kết quả",
    all: "Tất cả",
    success: "Thành công",
    denied: "Bị từ chối",
    failure: "Thất bại",
    from: "Từ",
    to: "Đến",
    apply: "Lọc",
    time: "Thời điểm",
    actor: "Người thực hiện",
    actionHead: "Hành động",
    target: "Đối tượng",
    reason: "Lý do",
    changes: "Thay đổi",
    system: "Hệ thống",
  },
  en: {
    title: "Audit log",
    note: "Every view of the log is recorded too. Passwords, codes, answers and hint content are never stored or shown.",
    filter: "Filter the log",
    action: "Action (prefix)",
    targetType: "Target type",
    targetId: "Target id",
    actorId: "Actor id",
    result: "Result",
    all: "All",
    success: "Succeeded",
    denied: "Denied",
    failure: "Failed",
    from: "From",
    to: "To",
    apply: "Filter",
    time: "Time",
    actor: "Actor",
    actionHead: "Action",
    target: "Target",
    reason: "Reason",
    changes: "Changes",
    system: "System",
  },
});
const t = text();

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
      <h2>{t.title}</h2>
      <p className="tiny muted">
        {t.note}
      </p>
      <form
        className="admin-filters"
        aria-label={t.filter}
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
        }}
      >
        <Field
          label={t.action}
          placeholder="user."
          value={draft.action}
          onChange={(e) => setDraft({ ...draft, action: e.target.value })}
        />
        <Field
          label={t.targetType}
          placeholder="User"
          value={draft.targetType}
          onChange={(e) => setDraft({ ...draft, targetType: e.target.value })}
        />
        <Field label={t.targetId} value={draft.targetId} onChange={(e) => setDraft({ ...draft, targetId: e.target.value })} />
        <Field label={t.actorId} value={draft.actorId} onChange={(e) => setDraft({ ...draft, actorId: e.target.value })} />
        <label className="field">
          <span>{t.result}</span>
          <select value={draft.outcome} onChange={(e) => setDraft({ ...draft, outcome: e.target.value })}>
            <option value="">{t.all}</option>
            <option value="success">{t.success}</option>
            <option value="denied">{t.denied}</option>
            <option value="failure">{t.failure}</option>
          </select>
        </label>
        <Field label={t.from} type="datetime-local" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        <Field label={t.to} type="datetime-local" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        <button className="secondary">{t.apply}</button>
      </form>
      <QueryState query={q} empty={!q.isLoading && rows.length === 0}>
        <table>
          <thead>
            <tr>
              <th>{t.time}</th>
              <th>{t.actor}</th>
              <th>{t.actionHead}</th>
              <th>{t.target}</th>
              <th>{t.result}</th>
              <th>{t.reason}</th>
              <th>{t.changes}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="tiny">{when(r.createdAt)}</td>
                <td>{r.actor ? `${r.actor.fullName} (${ROLE_LABEL[r.actor.role] ?? r.actor.role})` : (r.actorRole ?? t.system)}</td>
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
