import { useState } from "react";
import { PageHeading } from "../../components/PageHeading";
import { Overview } from "./Overview";
import { Users } from "./Users";
import { Taxonomy } from "./Taxonomy";
import { Content } from "./Content";
import { Simulations } from "./Simulations";
import { Assets } from "./Assets";
import { AuditExplorer } from "./AuditExplorer";

/**
 * Epic C2 admin console. Every screen reads the real `/admin/*` API; every
 * destructive or privilege-sensitive action asks for a reason in a dialog that
 * names its effect on access and history. Status is always text + icon.
 */
type Tab = "overview" | "users" | "taxonomy" | "content" | "simulations" | "assets" | "audit";

const TABS: Array<[Tab, string]> = [
  ["overview", "Tổng quan"],
  ["users", "Người dùng"],
  ["taxonomy", "Phân loại"],
  ["content", "Nội dung"],
  ["simulations", "Mô phỏng"],
  ["assets", "Tệp"],
  ["audit", "Nhật ký"],
];

export default function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <>
      <PageHeading eyebrow="VẬN HÀNH NEXALAB" title="Quản trị hệ thống" />
      <div className="tabs admin-tabs" role="tablist" aria-label="Khu vực quản trị">
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
      {tab === "assets" && <Assets />}
      {tab === "audit" && <AuditExplorer />}
    </>
  );
}
