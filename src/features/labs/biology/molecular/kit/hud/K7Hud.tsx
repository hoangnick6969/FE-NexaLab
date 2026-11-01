import { useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp, Info } from "lucide-react";
import { defineText } from "../../../../../../i18n";
import "../k7.css";

const text = defineText({
  vi: { step: (current: number, total: number) => `Bước ${current} trên ${total}`, show: "Mở hướng dẫn", hide: "Thu gọn hướng dẫn", readout: "Đang quan sát" },
  en: { step: (current: number, total: number) => `Step ${current} of ${total}`, show: "Show guide", hide: "Collapse guide", readout: "Now observing" },
});

/** `done` is shown with an icon and a text alternative, never by colour alone. */
export type K7Station = { id: string; label: string; done?: boolean; doneLabel?: string };

/**
 * Guide panel for K7 scene-first Labs: station tabs, the instruction, a live
 * readout of what the scene shows, the station's actions and its notebook.
 * Holds no science; the Lab passes copy and controls.
 */
export function K7Hud({ title, stations, current, onSelect, step, instruction, readout, actions, notice, children }: {
  title: string;
  stations: readonly K7Station[];
  current: string;
  onSelect?: (stationId: string) => void;
  step: { index: number; total: number };
  instruction: string;
  readout?: ReactNode;
  actions?: ReactNode;
  notice?: string;
  children?: ReactNode;
}) {
  const t = text();
  const [open, setOpen] = useState(true);
  return <aside className={`k7-hud ${open ? "is-open" : "is-closed"}`} aria-label={title}>
    <header className="k7-hud-header">
      <h2>{title}</h2>
      <button type="button" className="k7-icon-button" aria-expanded={open} aria-controls="k7-hud-body" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
        <span className="sr-only">{open ? t.hide : t.show}</span>
      </button>
    </header>
    <div id="k7-hud-body" className="k7-hud-body" hidden={!open}>
      <div className="k7-stations" role="tablist" aria-label={title}>
        {stations.map((station) => <button
          key={station.id}
          type="button"
          role="tab"
          aria-selected={station.id === current}
          className="k7-station"
          onClick={() => onSelect?.(station.id)}
        >
          {station.label}
          {station.done && <><Check size={14} aria-hidden="true" /><span className="sr-only">{station.doneLabel}</span></>}
        </button>)}
      </div>
      <p className="k7-step">{t.step(step.index + 1, step.total)}</p>
      <p className="k7-instruction" aria-live="polite">{instruction}</p>
      {readout && <div className="k7-readout" role="status" aria-label={t.readout}>{readout}</div>}
      {actions && <div className="k7-actions">{actions}</div>}
      {children}
      {notice && <p className="k7-notice"><Info size={15} aria-hidden="true" /><span>{notice}</span></p>}
    </div>
  </aside>;
}
