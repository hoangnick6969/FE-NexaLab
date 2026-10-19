import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { QueryState } from "./admin-ui";

// ───────────────────────── overview ─────────────────────────
export function Overview() {
  const q = useQuery({ queryKey: ["admin", "overview"], queryFn: () => api("/admin/overview") });
  const sum = (rows: any[] = [], pick: (r: any) => boolean) => rows.filter(pick).reduce((n, r) => n + r.count, 0);
  const d = q.data;
  const cards = d
    ? [
        ["Tài khoản đang hoạt động", sum(d.users, (r) => r.status === "active")],
        ["Tài khoản bị vô hiệu hóa", sum(d.users, (r) => r.status === "disabled")],
        ["Bài học đang cách ly", sum(d.lessons, (r) => r.status === "quarantined")],
        ["Tệp đang cách ly", sum(d.assets, (r) => r.status === "QUARANTINED")],
        ["Cấu hình mô phỏng đang dùng", sum(d.simulationVersions, (r) => r.status === "active")],
        ["Sự kiện kiểm toán 24 giờ", d.audit.last24h],
        ["Bị từ chối 24 giờ", d.audit.denied24h],
      ]
    : [];
  return (
    <section className="panel">
      <h2>Tổng quan</h2>
      <QueryState query={q}>
        <div className="admin-cards">
          {cards.map(([label, value]) => (
            <div className="admin-card" key={label as string}>
              <strong>{value as number}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="tiny muted">Quyền quản trị không thay thế duyệt chuyên môn, bản quyền hay khoa học.</p>
      </QueryState>
    </section>
  );
}
