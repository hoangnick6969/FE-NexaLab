import { useRef, useState, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Check, ChevronDown, ChevronUp, Info, Camera } from "lucide-react";
import { defineText } from "../../../../../../i18n";
import "../k3.css";

const text = defineText({
  vi: { step: (current: number, total: number) => `Bước ${current} trên ${total}`, show: "Mở hướng dẫn", hide: "Thu gọn hướng dẫn", readout: "Số đọc trên dụng cụ" },
  en: { step: (current: number, total: number) => `Step ${current} of ${total}`, show: "Show guide", hide: "Collapse guide", readout: "Instrument reading" },
});

/** `done` is shown with an icon and a text alternative, never by colour alone. */
export type K3Station = { id: string; label: string; done?: boolean; doneLabel?: string };
export type K3CameraPreset = "overview" | "meniscus" | "dynamometer";

/**
 * Guide frame shared by K3 Labs: station tabs, the current instruction,
 * a live instrument readout and the station's actions. It holds no science;
 * the Lab passes copy, readings and buttons that map to semantic events.
 */
export function K3Hud({ title, stations, current, onSelect, step, instruction, question, readout, actions, notice, children, cameraPreset, onCameraPresetChange, telemetry, formula, formulaLatex }: {
  title: string;
  stations: readonly K3Station[];
  current: string;
  onSelect?: (stationId: string) => void;
  step: { index: number; total: number };
  instruction: string;
  question?: ReactNode;
  readout?: ReactNode;
  actions?: ReactNode;
  notice?: string;
  children?: ReactNode;
  cameraPreset?: K3CameraPreset;
  onCameraPresetChange?: (preset: K3CameraPreset) => void;
  telemetry?: ReactNode;
  formula?: ReactNode;
  formulaLatex?: string;
}) {
  const t = text();
  const [open, setOpen] = useState(true);
  const toggle = useRef<HTMLButtonElement>(null);
  return <aside className={`k3-hud k3-hud-glass ${open ? "is-open" : "is-closed"}`} aria-label={title}>
    <header className="k3-hud-header">
      <h2>{title}</h2>
      <button ref={toggle} type="button" className="k3-icon-button" aria-expanded={open} aria-controls="k3-hud-body" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
        <span className="sr-only">{open ? t.hide : t.show}</span>
      </button>
    </header>
    <div id="k3-hud-body" className="k3-hud-body" hidden={!open}>
      {onCameraPresetChange && <nav className="k3-camera-presets" aria-label="Camera views">
        {(["overview", "meniscus", "dynamometer"] as const).map((preset) => <button key={preset} type="button" className="secondary" aria-pressed={cameraPreset === preset ? "true" : "false"} onClick={() => onCameraPresetChange(preset)}>
          <Camera size={15} aria-hidden="true" />{preset === "overview" ? "Overview" : preset === "meniscus" ? "Eye-level Meniscus" : "Dynamometer Close-up"}
        </button>)}
      </nav>}
      <div className="k3-stations" role="tablist" aria-label={title}>
        {stations.map((station) => <button
          key={station.id}
          type="button"
          role="tab"
          aria-selected={station.id === current}
          className="k3-station"
          onClick={() => onSelect?.(station.id)}
        >
          {station.label}
          {station.done && <><Check size={14} aria-hidden="true" /><span className="sr-only">{station.doneLabel}</span></>}
        </button>)}
      </div>
      <p className="k3-step">{t.step(step.index + 1, step.total)}</p>
      <p className="k3-instruction" aria-live="polite">{instruction}</p>
      {question}
      {readout && <div className="k3-readout" role="status" aria-label={t.readout}>{readout}</div>}
      {telemetry && <div className="k3-telemetry" aria-live="polite">{telemetry}</div>}
      {(formula || formulaLatex) && <div className="k3-formula" aria-label="Formula preview">
        {formulaLatex && <span className="k3-formula-math" dangerouslySetInnerHTML={{ __html: katex.renderToString(formulaLatex, { throwOnError: false, displayMode: false, strict: "ignore" }) }} />}
        {formula}
      </div>}
      {actions && <div className="k3-actions">{actions}</div>}
      {children}
      {notice && <p className="k3-notice"><Info size={15} aria-hidden="true" /><span>{notice}</span></p>}
    </div>
  </aside>;
}
