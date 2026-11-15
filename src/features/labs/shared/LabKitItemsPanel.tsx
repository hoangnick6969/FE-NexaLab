/**
 * "Dụng cụ và thành phần" panel (P0 C2.2, pilot K2 step A): every Explore bench shows the items of the
 * config it is running, read from the bench's `listKitItems`. Bench-agnostic; display only.
 */
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { KitItem } from "../runtime/explore-registry";
import { HAZARD_LEVEL_VI, HAZARD_TAG_VI } from "./LabIntroOverlay";
import "./LabIntro.css";

const GROUPS: ReadonlyArray<{ category: KitItem["category"]; title: string }> = [
  { category: "apparatus", title: "Dụng cụ" },
  { category: "instrument", title: "Dụng cụ đo" },
  { category: "part", title: "Bộ phận" },
  { category: "material", title: "Hoá chất và vật liệu" },
];

export function LabKitItemsToggle({ open, onOpenChange, count }: { open: boolean; onOpenChange: (open: boolean) => void; count: number }) {
  return <button type="button" className="secondary" aria-expanded={open} aria-controls="lab-kit-items" onClick={() => onOpenChange(!open)}>
    Dụng cụ và thành phần ({count})
  </button>;
}

export function LabKitItemsPanel({ items, open, onOpenChange }: { items: readonly KitItem[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const panel = useRef<HTMLElement>(null);
  const top = useBelowLabHeader(panel, open);
  const close = () => {
    onOpenChange(false);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-controls="lab-kit-items"]')?.focus({ preventScroll: true }));
  };
  return <aside id="lab-kit-items" ref={panel} className="lab-kit-items" aria-label="Dụng cụ và thành phần" hidden={!open}
    style={top === null ? undefined : { top, maxHeight: `max(160px, calc(54dvh - ${top + 24}px))` }}
    onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
    <header><h2>Dụng cụ và thành phần</h2><button type="button" className="text-button" onClick={close}>Thu gọn</button></header>
    <p className="lab-intro-small">Những gì có trên bàn của bài này. Số đo do mô phỏng tính, không ghi ở đây.</p>
    {GROUPS.map(({ category, title }) => {
      const group = items.filter((item) => item.category === category);
      if (!group.length) return null;
      return <section key={category} aria-label={title}>
        <h3>{title}</h3>
        <ul>{group.map((item) => <li key={item.id}>
          <b>{item.labelVi}</b>
          {item.purposeVi && <span>{item.purposeVi}</span>}
          {item.safety && item.safety.level !== "none" && <span className={`lab-intro-hazard is-${item.safety.level}`}>
            {[HAZARD_LEVEL_VI[item.safety.level], ...item.safety.tags.map((tag) => HAZARD_TAG_VI[tag] ?? tag)].filter(Boolean).join(" · ")}
          </span>}
          {item.safety?.noteSim && <small>Trong mô phỏng: {item.safety.noteSim}</small>}
          {item.safety?.noteReal && <small>Khi làm thật: {item.safety.noteReal}</small>}
        </li>)}</ul>
      </section>;
    })}
  </aside>;
}

/** The Lab Space header wraps to more rows when a bench adds actions; keep the panel just below it. */
function useBelowLabHeader(panel: RefObject<HTMLElement | null>, open: boolean) {
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".lab-space-header");
    const parent = panel.current?.offsetParent as HTMLElement | null | undefined;
    if (!open || !header || !parent) return;
    const place = () => setTop(Math.round(header.getBoundingClientRect().bottom - parent.getBoundingClientRect().top + 12));
    place();
    const observer = new ResizeObserver(place);
    observer.observe(header);
    window.addEventListener("resize", place);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); };
  }, [panel, open]);
  return top;
}
