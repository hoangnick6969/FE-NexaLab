import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Field, useAction } from "../../components/ui";
import { LICENSE_LABEL, LoadMore, QueryState, ROLE_LABEL, ReasonDialog, SCOPE_LABEL, Status, rowsOf, usePaged } from "./admin-ui";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    labels: { quarantine: "Cách ly", release: "Gỡ cách ly", reassign: "Chuyển chủ sở hữu", share: "Đưa vào thư viện chung", delete: "Xóa" } as Record<string, string>,
    effects: { quarantine: "Không ai ngoài quản trị viên mở được tệp, kể cả trong bài đã xuất bản, cho tới khi gỡ cách ly.", release: "Tệp được phục vụ lại như trước.", reassign: "Quyền quản lý tệp chuyển cho người nhận; các bài đang tham chiếu không đổi.", share: "Mọi giáo viên dùng được tệp. Phải ghi rõ giấy phép và nguồn; đây không phải duyệt chuyên môn.", delete: "Tệp bị xóa vĩnh viễn. Máy chủ từ chối nếu còn bài học hay phòng thực hành tham chiếu." } as Record<string, string>,
    title: "Tệp và nguồn",
    note: "Kiểm tra theo cấu hình: chữ ký tệp, đuôi, MIME, kích thước và SHA-256. Hạn mức production chờ Q-DATA-01/Q-C2-03. Lưu trữ R2 và danh mục nguồn (SourceRegistry) chờ Content Foundation.",
    filter: "Lọc tệp",
    status: "Trạng thái",
    all: "Tất cả",
    ready: "Sẵn sàng",
    quarantined: "Đang cách ly",
    scope: "Phạm vi",
    teacherPrivate: "Riêng của giáo viên",
    shared: "Thư viện chung",
    file: "Tệp",
    owner: "Chủ sở hữu",
    scopeLicence: "Phạm vi / giấy phép",
    references: "Tham chiếu",
    actions: "Thao tác",
    noChecksum: "chưa có checksum",
    refCounts: (lessons: number, labs: number) => `${lessons} bài, ${labs} phòng`,
    none: "Không",
    inUse: "Đang được tham chiếu; không thể xóa",
    delete: "Xóa",
    recipient: "Người nhận",
    choose: "— Chọn —",
    licence: "Giấy phép",
    source: "Nguồn / ghi công",
  },
  en: {
    labels: { quarantine: "Quarantine", release: "Release", reassign: "Change owner", share: "Add to the shared library", delete: "Delete" },
    effects: { quarantine: "Only administrators can open the file, even in published lessons, until it is released.", release: "The file is served again as before.", reassign: "Management of the file moves to the recipient; lessons that use it do not change.", share: "Every teacher can use the file. A licence and source are required; this is not a subject review.", delete: "The file is deleted permanently. The server refuses if a lesson or lab still uses it." },
    title: "Files and sources",
    note: "Checked against the configuration: file signature, extension, MIME type, size and SHA-256. Production limits await Q-DATA-01/Q-C2-03. R2 storage and the source registry await Content Foundation.",
    filter: "Filter files",
    status: "Status",
    all: "All",
    ready: "Ready",
    quarantined: "Quarantined",
    scope: "Scope",
    teacherPrivate: "Teacher's private",
    shared: "Shared library",
    file: "File",
    owner: "Owner",
    scopeLicence: "Scope / licence",
    references: "References",
    actions: "Actions",
    noChecksum: "no checksum yet",
    refCounts: (lessons: number, labs: number) => `${lessons} lessons, ${labs} labs`,
    none: "None",
    inUse: "In use; cannot be deleted",
    delete: "Delete",
    recipient: "Recipient",
    choose: "— Choose —",
    licence: "Licence",
    source: "Source / attribution",
  },
});
const t = text();

// ───────────────────────── assets ─────────────────────────
export function Assets() {
  const [filters, setFilters] = useState({ status: "", scope: "" });
  const q = usePaged(["admin", "assets"], "/admin/assets", filters);
  const rows = rowsOf(q);
  const [op, setOp] = useState<any>(null);
  const act = useAction(({ path, method = "POST", body }: any) => api(path, method, body));
  const staff = useQuery({
    queryKey: ["admin", "staff-assets"],
    queryFn: async () => [
      ...(await api("/admin/users?role=TEACHER&status=active&limit=100")).items,
      ...(await api("/admin/users?role=ADMIN&status=active&limit=100")).items,
    ],
    enabled: op?.action === "reassign",
  });
  const [extra, setExtra] = useState<any>({});
  const labels: Record<string, string> = t.labels;
  const effects: Record<string, string> = t.effects;
  const refs = (a: any) => a.references.lessons.length + a.references.labs.length;
  return (
    <section className="panel table-wrap">
      <h2>{t.title}</h2>
      <p className="tiny muted">
        {t.note}
      </p>
      <form className="admin-filters" onSubmit={(e) => e.preventDefault()} aria-label={t.filter}>
        <label className="field">
          <span>{t.status}</span>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">{t.all}</option>
            <option value="READY">{t.ready}</option>
            <option value="QUARANTINED">{t.quarantined}</option>
          </select>
        </label>
        <label className="field">
          <span>{t.scope}</span>
          <select value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}>
            <option value="">{t.all}</option>
            <option value="TEACHER_PRIVATE">{t.teacherPrivate}</option>
            <option value="SHARED_LIBRARY">{t.shared}</option>
          </select>
        </label>
      </form>
      <QueryState query={q} empty={!q.isLoading && rows.length === 0}>
        <table>
          <thead>
            <tr>
              <th>{t.file}</th>
              <th>{t.owner}</th>
              <th>{t.scopeLicence}</th>
              <th>{t.status}</th>
              <th>{t.references}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a: any) => (
              <tr key={a.id}>
                <td>
                  {a.name}
                  <p className="tiny muted">
                    {a.mime} · {Math.ceil(a.size / 1024)} KB · {a.sha256 ? `SHA-256 ${a.sha256.slice(0, 12)}…` : t.noChecksum}
                  </p>
                </td>
                <td>{a.owner?.fullName ?? a.ownerId}</td>
                <td>
                  {SCOPE_LABEL[a.scope] ?? a.scope}
                  {a.license && (
                    <p className="tiny muted">
                      {LICENSE_LABEL[a.license] ?? a.license} · {a.source}
                    </p>
                  )}
                </td>
                <td>
                  <Status value={a.status} />
                </td>
                <td>{refs(a) ? t.refCounts(a.references.lessons.length, a.references.labs.length) : t.none}</td>
                <td className="admin-row-actions">
                  {(a.status === "QUARANTINED"
                    ? ["release", "reassign"]
                    : ["quarantine", "reassign", ...(a.scope === "SHARED_LIBRARY" ? [] : ["share"])]
                  ).map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={action === "quarantine" ? "danger-text" : "text-button"}
                      onClick={() => {
                        act.reset();
                        setExtra({});
                        setOp({ asset: a, action });
                      }}
                    >
                      {labels[action]}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="danger-text"
                    disabled={refs(a) > 0}
                    title={refs(a) ? t.inUse : ""}
                    onClick={() => {
                      act.reset();
                      setOp({ asset: a, action: "delete" });
                    }}
                  >
                    {t.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <LoadMore query={q} />
      </QueryState>
      {op && (
        <ReasonDialog
          title={`${labels[op.action]}: ${op.asset.name}`}
          effect={effects[op.action]}
          confirmLabel={labels[op.action]}
          danger={op.action === "quarantine" || op.action === "delete"}
          pending={
            act.isPending || (op.action === "reassign" && !extra.newOwnerId) || (op.action === "share" && (!extra.license || !extra.source))
          }
          error={act.error}
          onClose={() => setOp(null)}
          onSubmit={(reason) =>
            act.mutate(
              op.action === "delete"
                ? { path: `/admin/assets/${op.asset.id}`, method: "DELETE", body: { reason, confirm: true } }
                : { path: `/admin/assets/${op.asset.id}/operations`, body: { action: op.action, reason, ...extra } },
              { onSuccess: () => setOp(null) },
            )
          }
        >
          {op.action === "reassign" && (
            <label className="field">
              <span>{t.recipient}</span>
              <select value={extra.newOwnerId ?? ""} onChange={(e) => setExtra({ newOwnerId: e.target.value })}>
                <option value="">{t.choose}</option>
                {(staff.data ?? [])
                  .filter((u: any) => u.id !== op.asset.ownerId)
                  .map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({ROLE_LABEL[u.role]})
                    </option>
                  ))}
              </select>
            </label>
          )}
          {op.action === "share" && (
            <>
              <label className="field">
                <span>{t.licence}</span>
                <select value={extra.license ?? ""} onChange={(e) => setExtra({ ...extra, license: e.target.value })}>
                  <option value="">{t.choose}</option>
                  {Object.entries(LICENSE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <Field label={t.source} value={extra.source ?? ""} onChange={(e) => setExtra({ ...extra, source: e.target.value })} />
            </>
          )}
        </ReasonDialog>
      )}
    </section>
  );
}
