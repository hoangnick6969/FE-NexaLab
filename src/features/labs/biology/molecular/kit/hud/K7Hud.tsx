import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { LabQuestionPanel, StationTabs } from "../../../../shared/question-panel/LabQuestionPanel";
import { defineText } from "../../../../../../i18n";
import "../k7.css";

const text = defineText({
  vi: { step: (current: number, total: number) => `Bước ${current} trên ${total}`, show: "Hướng dẫn", hide: "Thu gọn hướng dẫn", readout: "Đang quan sát" },
  en: { step: (current: number, total: number) => `Step ${current} of ${total}`, show: "Guide", hide: "Collapse guide", readout: "Now observing" },
});

/** `done` is shown with an icon and a text alternative, never by colour alone. */
export type K7Station = { id: string; label: string; done?: boolean; doneLabel?: string };

/**
 * Guide panel for K7 scene-first Labs on the Lab Space question panel (layout A): station tabs, the instruction, a
 * live readout of what the scene shows, the station's actions and its notebook. Holds no science.
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
  return <LabQuestionPanel id="k7-hud-body" prefix="k7" className="k7-hud" ariaLabel={title} open={open} onOpenChange={setOpen}
    badgeLabel={`${t.show} · ${step.index + 1}/${step.total}`} stepLabel={t.step(step.index + 1, step.total)}
    progress={{ count: step.total, current: step.index + 1 }} heading={title} closeLabel={t.hide}>
    <StationTabs label={title} stations={stations} current={current} onSelect={onSelect} className="k7-stations" />
    <p className="lqp-instruction k7-instruction" aria-live="polite">{instruction}</p>
    {readout && <div className="k7-readout" role="status" aria-label={t.readout}>{readout}</div>}
    {actions && <div className="k7-actions">{actions}</div>}
    {children}
    {notice && <p className="k7-notice"><Info size={15} aria-hidden="true" /><span>{notice}</span></p>}
  </LabQuestionPanel>;
}
