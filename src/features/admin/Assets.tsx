import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Field, useAction } from "../../components/ui";
import { LICENSE_LABEL, LoadMore, QueryState, ROLE_LABEL, ReasonDialog, SCOPE_LABEL, Status, rowsOf, usePaged } from "./admin-ui";

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
  const labels: Record<string, string> = {
    quarantine: "Cách ly",
    release: "Gỡ cách ly",
    reassign: "Chuyển chủ sở hữu",
    share: "Đưa vào thư viện chung",
    delete: "Xóa",
  };
  const effects: Record<string, string> = {
    quarantine: "Không ai ngoài quản trị viên mở được tệp, kể cả trong bài đã xuất bản, cho tới khi gỡ cách ly.",
    release: "Tệp được phục vụ lại như trước.",
    reassign: "Quyền quản lý tệp chuyển cho người nhận; các bài đang tham chiếu không đổi.",
    share: "Mọi giáo viên dùng được tệp. Phải ghi rõ giấy phép và nguồn; đây không phải duyệt chuyên môn.",
    delete: "Tệp bị xóa vĩnh viễn. Máy chủ từ chối nếu còn bài học hay phòng thực hành tham chiếu.",
  };
  const refs = (a: any) => a.references.lessons.length + a.references.labs.length;
  return (
    <section className="panel table-wrap">
      <h2>Tệp và nguồn</h2>
      <p className="tiny muted">
        Quản lý tệp, nguồn và quyền sử dụng. Dung lượng và mã kiểm tra toàn vẹn được lấy từ phiên bản sẵn sàng mới nhất.
      </p>
      <form className="admin-filters" onSubmit={(e) => e.preventDefault()} aria-label="Lọc tệp">
        <label className="field">
          <span>Trạng thái</span>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="QUARANTINED">Đang cách ly</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </select>
        </label>
        <label className="field">
          <span>Phạm vi</span>
          <select value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}>
            <option value="">Tất cả</option>
            <option value="TEACHER_PRIVATE">Riêng của giáo viên</option>
            <option value="SHARED_LIBRARY">Thư viện chung</option>
          </select>
        </label>
      </form>
      <QueryState query={q} empty={!q.isLoading && rows.length === 0}>
        <table>
          <thead>
            <tr>
              <th>Tệp</th>
              <th>Chủ sở hữu</th>
              <th>Phạm vi / giấy phép</th>
              <th>Trạng thái</th>
              <th>Tham chiếu</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a: any) => {
              const ready = [...(a.versions ?? [])].sort((left: any, right: any) => right.version - left.version).find((v: any) => v.status === "READY");
              return (
              <tr key={a.id}>
                <td>
                  {a.title}
                  <p className="tiny muted">
                    {ready ? `${ready.mime ?? "Chưa có loại tệp"} · ${ready.bytes == null ? "Chưa có dung lượng" : `${Math.ceil(ready.bytes / 1024)} KB`} · ${ready.sha256 ? `SHA-256 ${ready.sha256.slice(0, 12)}…` : "Chưa có mã kiểm tra toàn vẹn"}` : "Chưa có phiên bản sẵn sàng"}
                  </p>
                  <details><summary>Phiên bản ({a.versions?.length ?? 0})</summary>{a.versions?.map((version: any) => <p key={version.id} className="tiny">Bản {version.version} · {version.status === "READY" ? "Sẵn sàng" : version.status === "FAILED" ? "Không thành công" : "Đang xử lý"}{version.failureReason ? ` · ${version.failureReason}` : ""}</p>)}</details>
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
                <td>{refs(a) ? `${a.references.lessons.length} bài, ${a.references.labs.length} phòng` : "Không"}</td>
                <td className="admin-row-actions">
                  {(a.status === "QUARANTINED"
                    ? ["release", "reassign"]
                    : a.status === "ACTIVE" ? ["quarantine", "reassign", ...(a.scope === "SHARED_LIBRARY" ? [] : ["share"])] : []
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
                    title={refs(a) ? "Đang được tham chiếu; không thể xóa" : ""}
                    onClick={() => {
                      act.reset();
                      setOp({ asset: a, action: "delete" });
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ); })}
          </tbody>
        </table>
        <LoadMore query={q} />
      </QueryState>
      {op && (
        <ReasonDialog
          title={`${labels[op.action]}: ${op.asset.title}`}
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
              <span>Người nhận</span>
              <select value={extra.newOwnerId ?? ""} onChange={(e) => setExtra({ newOwnerId: e.target.value })}>
                <option value="">— Chọn —</option>
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
                <span>Giấy phép</span>
                <select value={extra.license ?? ""} onChange={(e) => setExtra({ ...extra, license: e.target.value })}>
                  <option value="">— Chọn —</option>
                  {Object.entries(LICENSE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Nguồn / ghi công" value={extra.source ?? ""} onChange={(e) => setExtra({ ...extra, source: e.target.value })} />
            </>
          )}
        </ReasonDialog>
      )}
    </section>
  );
}
