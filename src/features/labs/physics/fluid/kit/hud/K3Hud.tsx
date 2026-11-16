import { useState, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Info, Camera } from "lucide-react";
import { LabQuestionPanel, StationTabs } from "../../../../shared/question-panel/LabQuestionPanel";
import { defineText } from "../../../../../../i18n";
import "../k3.css";

const text = defineText({
  vi: { step: (current: number, total: number) => `Bước ${current} trên ${total}`, show: "Hướng dẫn", hide: "Thu gọn hướng dẫn", readout: "Số đọc trên dụng cụ" },
  en: { step: (current: number, total: number) => `Step ${current} of ${total}`, show: "Guide", hide: "Collapse guide", readout: "Instrument reading" },
});

/** `done` is shown with an icon and a text alternative, never by colour alone. */
export type K3Station = { id: string; label: string; done?: boolean; doneLabel?: string };
export type K3CameraPreset = "overview" | "meniscus" | "dynamometer";

/**
 * Guide frame shared by K3 Labs (density, buoyancy) on the Lab Space question panel (layout A): station tabs, the
 * current instruction, a live instrument readout and the station's actions; the run result and teacher prompts join
 * it as its last sections. It holds no science; the Lab passes copy, readings and buttons that map to semantic events.
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
  return <LabQuestionPanel id="k3-hud-body" prefix="k3" className="k3-hud" ariaLabel={title} open={open} onOpenChange={setOpen}
    badgeLabel={`${t.show} · ${step.index + 1}/${step.total}`} stepLabel={t.step(step.index + 1, step.total)}
    progress={{ count: step.total, current: step.index + 1 }} heading={title} closeLabel={t.hide}>
    {onCameraPresetChange && <nav className="k3-camera-presets" aria-label="Camera views">
      {(["overview", "meniscus", "dynamometer"] as const).map((preset) => <button key={preset} type="button" className="secondary" aria-pressed={cameraPreset === preset ? "true" : "false"} onClick={() => onCameraPresetChange(preset)}>
        <Camera size={15} aria-hidden="true" />{preset === "overview" ? "Overview" : preset === "meniscus" ? "Eye-level Meniscus" : "Dynamometer Close-up"}
      </button>)}
    </nav>}
    <StationTabs label={title} stations={stations} current={current} onSelect={onSelect} className="k3-stations" />
    <p className="lqp-instruction k3-instruction" aria-live="polite">{instruction}</p>
    {question}
    {readout && <div className="k3-readout" role="status" aria-label={t.readout}>{readout}</div>}
    {telemetry && <div className="k3-telemetry" aria-live="polite">{telemetry}</div>}
    {(formula || formulaLatex) && <div className="k3-formula" aria-label="Formula preview">
      {formulaLatex && <span className="k3-formula-math" dangerouslySetInnerHTML={{ __html: katex.renderToString(formulaLatex, { throwOnError: false, displayMode: false, strict: "ignore", trust: false }) }} />}
      {formula}
    </div>}
    {actions && <div className="k3-actions">{actions}</div>}
    {children}
    {notice && <p className="k3-notice"><Info size={15} aria-hidden="true" /><span>{notice}</span></p>}
  </LabQuestionPanel>;
}
