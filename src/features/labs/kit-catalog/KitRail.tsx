/**
 * "Dụng cụ theo bộ Kit" at the top of /labs. A student chooses a Lab by what they can do with it, so the apparatus
 * has to be seen before the cards, not after forty of them:
 *
 *   rail    one button per Kit, with a few of its pictures and a count
 *   peek    the Kit's full list in a panel under the rail: opens on hover (mouse only, after a short delay so passing
 *           over the rail does nothing), on click or tap, and on Enter or Space, and closes on Escape, a click outside,
 *           or when the pointer leaves. Hover is only a shortcut; every action also works by click and keyboard.
 *
 * The panel follows its button in the DOM, so Tab walks from a Kit straight into its items.
 */
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { api, useAuth } from "../../../lib/api";
import { defineText } from "../../../i18n";
import { Bar, SkeletonRegion } from "../../../components/skeletons";
import { collectKitCatalogs, type KitCatalog, type KitGroup } from "./kit-catalog";
import { Kit, KitThumb, kitText } from "./KitComponents";
import "./kit-components.css";

const text = defineText({
  vi: {
    hint: "Chọn một bộ Kit để xem các dụng cụ và hoá chất bên trong.",
    items: (n: number) => `${n} dụng cụ`,
    thumbs: "Một số dụng cụ trong bộ",
    loading: "Đang tải danh mục dụng cụ…",
    close: "Đóng danh sách dụng cụ",
  },
  en: {
    hint: "Pick a Kit to see the apparatus and reagents inside it.",
    items: (n: number) => `${n} ${n === 1 ? "item" : "items"}`,
    thumbs: "Some of the items in this Kit",
    loading: "Loading apparatus…",
    close: "Close the apparatus list",
  },
});

const HOVER_OPEN_MS = 140;
const HOVER_CLOSE_MS = 220;

const total = (catalog: KitCatalog) => catalog.apparatus.length + catalog.instruments.length + catalog.materials.length;
const preview = (catalog: KitCatalog) => [...catalog.apparatus, ...catalog.instruments, ...catalog.materials].slice(0, 3);

/** Same footprint as the loaded rail, so the cards below do not move when the Kits arrive. */
export function KitRailSkeleton() {
  const t = text();
  return <SkeletonRegion label={t.loading} className="kit-rail kit-rail-loading">
    <div className="kit-rail-head" aria-hidden="true"><Bar w="190px" h={20} /><Bar w="min(320px, 50%)" h={14} /></div>
    <div className="kit-rail-list" aria-hidden="true">
      {[0, 1, 2].map((i) => <div key={i} className="kit-rail-btn sk-card">
        <span className="kit-rail-thumbs"><Bar w="36px" h={36} className="sk-tile" /><Bar w="36px" h={36} className="sk-tile" /><Bar w="36px" h={36} className="sk-tile" /></span>
        <span className="kit-rail-name"><Bar w="96px" h={15} /><Bar w="64px" h={12} /></span>
      </div>)}
    </div>
  </SkeletonRegion>;
}

export function KitRail() {
  const t = text();
  const kt = kitText();
  const role = useAuth((s) => s.user?.role);
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => api<any[]>("/labs"), enabled: role === "STUDENT" || role === "TEACHER" || role === "ADMIN" });
  const catalogs = collectKitCatalogs(labs.data ?? []);
  const [open, setOpen] = useState<KitGroup | null>(null);
  const [pinned, setPinned] = useState(false);
  const root = useRef<HTMLElement>(null);
  const timer = useRef<number>();
  const panelId = useId();

  const clear = () => window.clearTimeout(timer.current);
  const close = useCallback((restoreFocus = false) => {
    window.clearTimeout(timer.current);
    if (restoreFocus) root.current?.querySelector<HTMLElement>('.kit-rail-btn[aria-expanded="true"]')?.focus();
    setOpen(null);
    setPinned(false);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // A pinned panel closes on a click or tap anywhere outside the rail.
  useEffect(() => {
    if (!pinned) return;
    const onDown = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [pinned, close]);

  if (labs.isLoading) return <KitRailSkeleton />;
  if (!catalogs.length) return null;
  const debug = role === "ADMIN" || new URLSearchParams(window.location.search).get("debug") === "1";
  const active = catalogs.find((catalog) => catalog.group === open);

  const hoverOpen = (group: KitGroup) => (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse" || pinned) return;
    clear();
    timer.current = window.setTimeout(() => setOpen(group), open ? 0 : HOVER_OPEN_MS);
  };
  const hoverLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse" || pinned) return;
    clear();
    timer.current = window.setTimeout(() => setOpen(null), HOVER_CLOSE_MS);
  };
  const toggle = (group: KitGroup) => {
    clear();
    if (open === group && pinned) return close();
    setOpen(group);
    setPinned(true);
  };

  return <section
    ref={root}
    className="kit-rail"
    aria-label={kt.heading}
    data-testid="kit-components"
    onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); close(true); } }}
  >
    <div className="kit-rail-head">
      <h2>{kt.heading}</h2>
      <p className="muted">{t.hint}</p>
    </div>
    <div className="kit-rail-list" onPointerLeave={hoverLeave}>
      {catalogs.map((catalog) => {
        const isOpen = open === catalog.group;
        return <button
          key={catalog.group}
          type="button"
          className={`kit-rail-btn${isOpen ? " is-open" : ""}`}
          aria-expanded={isOpen}
          aria-controls={panelId}
          data-group={catalog.group}
          data-active={isOpen}
          onPointerEnter={hoverOpen(catalog.group)}
          onClick={() => toggle(catalog.group)}
        >
          <span className="kit-rail-thumbs" role="img" aria-label={t.thumbs}>
            {preview(catalog).map((entry) => <span key={`${entry.category}:${entry.key}`} className="kit-rail-thumb"><KitThumb entry={entry} group={catalog.group} size={36} /></span>)}
          </span>
          <span className="kit-rail-name">
            <strong>{kt.kits[catalog.group]}</strong>
            <span>{t.items(total(catalog))}</span>
          </span>
          <ChevronDown size={16} aria-hidden="true" className="kit-rail-chevron" />
        </button>;
      })}
    </div>
    <div
      id={panelId}
      className="kit-rail-panel"
      hidden={!active}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") clear(); }}
      onPointerLeave={hoverLeave}
    >
      {active && <Kit catalog={active} debug={debug} heading={debug} />}
    </div>
  </section>;
}
