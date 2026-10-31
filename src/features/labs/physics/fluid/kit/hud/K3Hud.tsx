import { useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { defineText } from "../../../../../../i18n";
import "../k3.css";

const text = defineText({
  vi: { step: (current: number, total: number) => `Bước ${current} trên ${total}`, show: "Mở hướng dẫn", hide: "Thu gọn hướng dẫn", readout: "Số đọc trên dụng cụ" },
  en: { step: (current: number, total: number) => `Step ${current} of ${total}`, show: "Show guide", hide: "Collapse guide", readout: "Instrument reading" },
});

export type K3Station = { id: string; label: string };

/**
 * Guide frame shared by K3 Labs: station tabs, the current instruction,
 * a live instrument readout and the station's actions. It holds no science;
 * the Lab passes copy, readings and buttons that map to semantic events.
 */
export function K3Hud({ title, stations, current, onSelect, step, instruction, readout, actions, notice, children }: {
  title: string;
  stations: readonly K3Station[];
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
  const toggle = useRef<HTMLButtonElement>(null);
  return <aside className={`k3-hud ${open ? "is-open" : "is-closed"}`} aria-label={title}>
    <header className="k3-hud-header">
      <h2>{title}</h2>
      <button ref={toggle} type="button" className="k3-icon-button" aria-expanded={open} aria-controls="k3-hud-body" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
        <span className="sr-only">{open ? t.hide : t.show}</span>
      </button>
    </header>
    <div id="k3-hud-body" className="k3-hud-body" hidden={!open}>
      <div className="k3-stations" role="tablist" aria-label={title}>
        {stations.map((station) => <button
          key={station.id}
          type="button"
          role="tab"
          aria-selected={station.id === current}
          className="k3-station"
          onClick={() => onSelect?.(station.id)}
        >{station.label}</button>)}
      </div>
      <p className="k3-step">{t.step(step.index + 1, step.total)}</p>
      <p className="k3-instruction" aria-live="polite">{instruction}</p>
      {readout && <div className="k3-readout" role="status" aria-label={t.readout}>{readout}</div>}
      {children}
      {actions && <div className="k3-actions">{actions}</div>}
      {notice && <p className="k3-notice"><Info size={15} aria-hidden="true" /><span>{notice}</span></p>}
    </div>
  </aside>;
}
