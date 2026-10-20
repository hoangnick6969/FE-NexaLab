import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { QueryState } from "./admin-ui";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    activeAccounts: "Tài khoản đang hoạt động",
    disabledAccounts: "Tài khoản bị vô hiệu hóa",
    quarantinedLessons: "Bài học đang cách ly",
    quarantinedFiles: "Tệp đang cách ly",
    activeSims: "Cấu hình mô phỏng đang dùng",
    audit24: "Sự kiện kiểm toán 24 giờ",
    denied24: "Bị từ chối 24 giờ",
    title: "Tổng quan",
    note: "Quyền quản trị không thay thế duyệt chuyên môn, bản quyền hay khoa học.",
  },
  en: {
    activeAccounts: "Active accounts",
    disabledAccounts: "Disabled accounts",
    quarantinedLessons: "Quarantined lessons",
    quarantinedFiles: "Quarantined files",
    activeSims: "Active simulation configurations",
    audit24: "Audit events, 24 h",
    denied24: "Denied, 24 h",
    title: "Overview",
    note: "Admin rights do not replace subject, rights or scientific review.",
  },
});
const t = text();

// ───────────────────────── overview ─────────────────────────
export function Overview() {
  const q = useQuery({ queryKey: ["admin", "overview"], queryFn: () => api("/admin/overview") });
  const sum = (rows: any[] = [], pick: (r: any) => boolean) => rows.filter(pick).reduce((n, r) => n + r.count, 0);
  const d = q.data;
  const cards = d
    ? [
        [t.activeAccounts, sum(d.users, (r) => r.status === "active")],
        [t.disabledAccounts, sum(d.users, (r) => r.status === "disabled")],
        [t.quarantinedLessons, sum(d.lessons, (r) => r.status === "quarantined")],
        [t.quarantinedFiles, sum(d.assets, (r) => r.status === "QUARANTINED")],
        [t.activeSims, sum(d.simulationVersions, (r) => r.status === "active")],
        [t.audit24, d.audit.last24h],
        [t.denied24, d.audit.denied24h],
      ]
    : [];
  return (
    <section className="panel">
      <h2>{t.title}</h2>
      <QueryState query={q}>
        <div className="admin-cards">
          {cards.map(([label, value]) => (
            <div className="admin-card" key={label as string}>
              <strong>{value as number}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="tiny muted">{t.note}</p>
      </QueryState>
    </section>
  );
}
