/**
 * "Dụng cụ theo bộ Kit" on /labs: every apparatus, instrument and reagent of the published Explore benches, grouped by Kit,
 * with a picture, what it is for, and which Labs use it. Admins (or ?debug=1) also see the ids behind each entry.
 */
import { Beaker, Box, Cylinder, Droplet, FileText, Flame, FlaskConical, Gauge, Glasses, Grid3X3, Hand, Pipette, Scale, Scissors, Shirt, TestTube, TestTubes, Trash2, type LucideIcon, FlaskRound, Ruler, Shovel, Minus, Timer, Thermometer, TableProperties } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, useAuth } from "../../../lib/api";
import { defineText } from "../../../i18n";
import { Empty } from "../../../components/ui";
import { LoadError } from "../../classes/class-ui";
import { HAZARD_LEVEL_VI, HAZARD_TAG_VI } from "../shared/LabIntroOverlay";
import { collectKitCatalogs, type CatalogEntry, type KitCatalog, type KitGroup } from "./kit-catalog";
import { kitThumbnail } from "./kit-thumbnails";
import "./kit-components.css";

const text = defineText({
  vi: {
    heading: "Dụng cụ theo bộ Kit",
    intro: "Những dụng cụ và hoá chất có trong các bài thí nghiệm tự do đã phát hành. Mở một bài để thao tác với chúng.",
    kits: { chemistry: "Kit Hóa học", physics: "Kit Vật lý", biology: "Kit Sinh học", "explore-support": "Kit Bổ trợ Explore" } as Record<KitGroup, string>,
    sections: { apparatus: "Dụng cụ", instruments: "Dụng cụ đo", materials: "Hoá chất và vật liệu" },
    labsCount: (n: number) => `${n} bài`, usedIn: "Dùng ở", shared: "Dùng chung giữa các bàn", inKit: "Dùng chung trong Kit",
    loading: "Đang tải danh mục dụng cụ…", empty: "Chưa có dụng cụ từ các bài Explore đã phát hành.",
    debug: "Gỡ lỗi", renderer: "renderer", sharedItem: "item chung", benches: "bàn", own: "riêng của bàn",
  },
  en: {
    heading: "Apparatus by Kit",
    intro: "The apparatus and reagents of the published free-exploration labs. Open a lab to use them.",
    kits: { chemistry: "Chemistry Kit", physics: "Physics Kit", biology: "Biology Kit", "explore-support": "Explore support Kit" } as Record<KitGroup, string>,
    sections: { apparatus: "Apparatus", instruments: "Instruments", materials: "Reagents and materials" },
    labsCount: (n: number) => `${n} ${n === 1 ? "lab" : "labs"}`, usedIn: "Used in", shared: "Shared across benches", inKit: "Shared within this Kit",
    loading: "Loading apparatus…", empty: "No apparatus from published Explore labs yet.",
    debug: "Debug", renderer: "renderer", sharedItem: "shared item", benches: "benches", own: "bench-owned",
  },
});

export const kitText = text;

const ICONS: Record<string, LucideIcon> = {
  test_tube: TestTube, test_tube_rack_6: TestTubes, beaker_100ml: Beaker, waste_beaker: Trash2, erlenmeyer_flask_100ml: FlaskConical,
  dropper_pipette: Pipette, litmus_strip_dispenser: FileText, digital_ph_meter: Gauge, tongs: Scissors, stopper: Cylinder, electronic_scale: Scale, stopwatch: Timer, thermometer: Thermometer,
  graduated_cylinder_100ml: Ruler, volumetric_flask_100ml: FlaskRound, spatula: Shovel, glass_rod: Minus,
  safety_goggles: Glasses, protective_gloves: Hand, lab_coat: Shirt, test_tube_holder: Scissors, alcohol_lamp: Flame,
  table: TableProperties, speed: Gauge, lens_grid: Grid3X3,
};
export const iconFor = (entry: Pick<CatalogEntry, "key" | "category">): LucideIcon => (entry.category === "material" ? Droplet : ICONS[entry.key] ?? Box);

/** The picture of one apparatus or reagent, or its icon when it has no picture (or the picture fails to load). */
export function KitThumb({ entry, group, size }: { entry: CatalogEntry; group: KitGroup; size: number }) {
  const Icon = iconFor(entry);
  const [failedImage, setFailedImage] = useState<string>();
  const image = kitThumbnail(group, entry.category === "material" ? `reagent-${entry.key}` : entry.key);
  return image && image !== failedImage
    ? <img src={image} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailedImage(image)} />
    : <Icon size={Math.round(size * 0.4)} />;
}

export function KitCard({ entry, group, debug }: { entry: CatalogEntry; group: KitGroup; debug: boolean }) {
  const t = text();
  const sharing = entry.sharedItemId ? t.shared : entry.category !== "material" && entry.usedIn.length > 1 ? t.inKit : null;
  const hazard = entry.safety && entry.safety.level !== "none"
    ? [HAZARD_LEVEL_VI[entry.safety.level], ...entry.safety.tags.map((tag) => HAZARD_TAG_VI[tag] ?? tag)].filter(Boolean).join(" · ") : "";
  return <li className="kit-card" data-testid="kit-card" data-key={entry.key}>
    <span className={`kit-card-icon${entry.safety && entry.safety.level !== "none" ? ` is-${entry.safety.level}` : ""}`} aria-hidden="true">
      <KitThumb entry={entry} group={group} size={64} />
    </span>
    <div className="kit-card-body">
      <strong>{entry.label}</strong>
      {entry.purpose && <span className="kit-card-purpose">{entry.purpose}</span>}
      <span className="kit-card-tags">
        {sharing && <span className="kit-tag">{sharing}</span>}
        {hazard && <span className={`lab-intro-hazard is-${entry.safety!.level}`}>{hazard}</span>}
      </span>
      <span className="kit-card-used">{t.usedIn}: {entry.usedIn.map((lab, index) => <span key={lab.id}>{index > 0 && " · "}<Link to={`/labs/${encodeURIComponent(lab.id)}`} title={lab.title}>{lab.catalogId}</Link></span>)}</span>
      {debug && <code className="kit-card-debug" data-testid="kit-debug">{t.renderer}: {entry.key} · {entry.sharedItemId ? `${t.sharedItem}: ${entry.sharedItemId}` : t.own}</code>}
    </div>
  </li>;
}

export function Kit({ catalog, debug, heading = true }: { catalog: KitCatalog; debug: boolean; heading?: boolean }) {
  const t = text();
  const sections = [["apparatus", catalog.apparatus], ["instruments", catalog.instruments], ["materials", catalog.materials]] as const;
  return <section className="kit-group" aria-label={t.kits[catalog.group]} data-testid="kit-group" data-group={catalog.group}>
    {heading && <header>
      <h3>{t.kits[catalog.group]}</h3>
      <span className="tiny muted">{t.labsCount(catalog.labs.length)}{debug && ` · ${t.benches}: ${catalog.benches.join(", ")}`}</span>
    </header>}
    {sections.map(([name, entries]) => entries.length > 0 && <div key={name}>
      <h4>{t.sections[name]} <span className="tiny muted">({entries.length})</span></h4>
      <ul className="kit-grid">{entries.map((entry) => <KitCard key={`${entry.category}:${entry.key}`} entry={entry} group={catalog.group} debug={debug} />)}</ul>
    </div>)}
  </section>;
}

export function KitComponents({ standalone = false }: { standalone?: boolean }) {
  const t = text();
  const role = useAuth((s) => s.user?.role);
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => api<any[]>("/labs"), enabled: role === "STUDENT" || role === "TEACHER" || role === "ADMIN" });
  const catalogs = collectKitCatalogs(labs.data ?? []);
  if (!catalogs.length && !standalone) return null;
  // Ids behind each entry: for admins, and for anyone who adds ?debug=1 to the address.
  const debug = role === "ADMIN" || new URLSearchParams(window.location.search).get("debug") === "1";
  return <section className="kit-components" aria-label={t.heading} data-testid="kit-components">
    {!standalone && <h2>{t.heading}</h2>}
    {standalone && <LoadError query={labs} what={t.heading} />}
    {standalone && labs.isLoading && <p role="status" className="muted">{t.loading}</p>}
    {standalone && labs.isSuccess && !catalogs.length && <Empty>{t.empty}</Empty>}
    {catalogs.length > 0 && <p className="muted">{t.intro}</p>}
    {catalogs.map((catalog) => <Kit key={catalog.group} catalog={catalog} debug={debug} />)}
  </section>;
}
