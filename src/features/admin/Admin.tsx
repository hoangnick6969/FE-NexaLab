import { useSearchParams } from "react-router-dom";
import { PageHeading } from "../../components/PageHeading";
import { Overview } from "./Overview";
import { Users } from "./Users";
import { Taxonomy } from "./Taxonomy";
import { Content } from "./Content";
import { Simulations } from "./Simulations";
import { LabReleases } from "./LabReleases";
import { Assets } from "./Assets";
import { AuditExplorer } from "./AuditExplorer";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    overview: "Tổng quan",
    users: "Người dùng",
    taxonomy: "Phân loại",
    content: "Nội dung",
    simulations: "Mô phỏng",
    releases: "Duyệt Lab",
    assets: "Tệp",
    audit: "Nhật ký",
    eyebrow: "VẬN HÀNH NEXALAB",
    title: "Quản trị hệ thống",
    areas: "Khu vực quản trị",
  },
  en: {
    overview: "Overview",
    users: "Users",
    taxonomy: "Taxonomy",
    content: "Content",
    simulations: "Simulations",
    releases: "Lab releases",
    assets: "Files",
    audit: "Audit log",
    eyebrow: "NEXALAB OPERATIONS",
    title: "System administration",
    areas: "Administration areas",
  },
});
const t = text();

/**
 * Epic C2 admin console. Every screen reads the real `/admin/*` API; every
 * destructive or privilege-sensitive action asks for a reason in a dialog that
 * names its effect on access and history. Status is always text + icon.
 */
type Tab = "overview" | "users" | "taxonomy" | "content" | "simulations" | "releases" | "assets" | "audit";

const TABS: Array<[Tab, string]> = [
  ["overview", t.overview],
  ["users", t.users],
  ["taxonomy", t.taxonomy],
  ["content", t.content],
  ["simulations", t.simulations],
  ["releases", t.releases],
  ["assets", t.assets],
  ["audit", t.audit],
];

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TABS.find(([id]) => id === requested)?.[0] ?? "overview";
  const setTab = (id: Tab) => setParams((previous) => { previous.set("tab", id); return previous; });
  return (
    <>
      <PageHeading eyebrow={t.eyebrow} title={t.title} />
      <div className="tabs admin-tabs" role="tablist" aria-label={t.areas}>
        {TABS.map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "users" && <Users />}
      {tab === "taxonomy" && <Taxonomy />}
      {tab === "content" && <Content />}
      {tab === "simulations" && <Simulations />}
      {tab === "releases" && <LabReleases />}
      {tab === "assets" && <Assets />}
      {tab === "audit" && <AuditExplorer />}
    </>
  );
}
