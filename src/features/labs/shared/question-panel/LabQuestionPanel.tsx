/**
 * Shared question panel of the Lab Space (SPEC-lab-space-shared-ui). The look comes from the K8 ecology panels
 * (FL-20, FL-21); the activity keeps every state, checkpoint and submit rule and only passes content and callbacks.
 * Placement on small screens stays with the activity: it targets `${prefix}-panel` / `${prefix}-question-badge`.
 */
import { Check, CircleHelp, X } from "lucide-react";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useLabPanelSections } from "../LabClassSection";
import "./LabQuestionPanel.css";

export function LabQuestionPanel({ id, prefix, open, onOpenChange, badgeLabel, eyebrow, stepLabel, progress, heading, closeLabel, className, ariaLabel, children }: {
  id: string;
  /** Activity class prefix kept on the badge, panel and step for its own layout rules and existing tests. */
  prefix: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badgeLabel: ReactNode;
  eyebrow?: ReactNode;
  stepLabel?: ReactNode;
  progress?: { count: number; current: number };
  heading?: ReactNode;
  closeLabel: string;
  /** Extra classes on the panel, kept for an activity's existing selectors. */
  className?: string;
  /** Names the panel as a landmark (role complementary) when set. */
  ariaLabel?: string;
  children?: ReactNode;
}) {
  // The run result and the Class Lab teacher content join this panel as its last sections instead of floating
  // over the scene: questions, results and teacher prompts all live on the right.
  const { classSection, result } = useLabPanelSections();
  const badge = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  // Focus moves only after the student opens or closes the panel, never on mount.
  const moveFocus = useRef(false);
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (open ? close : badge).current?.focus({ preventScroll: true });
  }, [open]);
  const toggle = (next: boolean) => { moveFocus.current = true; onOpenChange(next); };
  return <>
    <button ref={badge} type="button" className={`lqp-badge ${prefix}-question-badge`} aria-expanded={open} aria-controls={id} onClick={() => toggle(!open)}>
      <CircleHelp size={16} aria-hidden="true" /><span>{badgeLabel}</span>
    </button>
    <div id={id} className={["lqp-panel", `${prefix}-panel`, className].filter(Boolean).join(" ")} data-open={open} role={ariaLabel ? "complementary" : undefined} aria-label={ariaLabel} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); toggle(false); } }}>
      <div className="lqp-header">
        <div>
          {eyebrow != null && <p className="lqp-eyebrow">{eyebrow}</p>}
          {stepLabel != null && <p className={`lqp-step ${prefix}-step`}>{stepLabel}</p>}
        </div>
        <button ref={close} type="button" className="lqp-close" aria-label={closeLabel} title={closeLabel} onClick={() => toggle(false)}><X size={15} aria-hidden="true" /></button>
      </div>
      {progress && <div className="lqp-progress" aria-hidden="true" style={{ "--lqp-steps": progress.count } as CSSProperties}>
        {Array.from({ length: progress.count }, (_, i) => <span key={i} data-state={i + 1 < progress.current ? "done" : i + 1 === progress.current ? "current" : "todo"} />)}
      </div>}
      {heading != null && <h3 className="lqp-heading" aria-live="polite">{heading}</h3>}
      {children}
      {result && <div className="lqp-result" data-testid="lab-panel-result">{result}</div>}
      {classSection && <div className="lqp-class" data-testid="lab-class-section">{classSection}</div>}
    </div>
  </>;
}

/**
 * Scrolls the question panel (never the Lab Space behind it) so `el` sits under the sticky panel header, and keeps it
 * there while the activity is still adding content above it (up to 1.5 s); any scroll by the learner stops it.
 */
export function revealInPanel(el: HTMLElement | null): () => void {
  const panel = el?.closest<HTMLElement>(".lqp-panel");
  if (!el || !panel) return () => undefined;
  const header = panel.querySelector<HTMLElement>(".lqp-header")?.offsetHeight ?? 0;
  const pin = () => { panel.scrollTop += el.getBoundingClientRect().top - panel.getBoundingClientRect().top - header - 12; };
  pin();
  const observer = new MutationObserver(() => requestAnimationFrame(pin));
  observer.observe(panel, { childList: true, subtree: true });
  const stop = () => { observer.disconnect(); window.clearTimeout(timer); };
  const timer = window.setTimeout(stop, 1500);
  for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) panel.addEventListener(type, stop, { once: true, passive: true });
  return stop;
}

export type LabStation = { id: string; label: ReactNode; done?: boolean; doneLabel?: string; disabled?: boolean };

/** Station tabs of a station Lab (density, buoyancy, gene, eye), in the panel's chip style; done is icon + text. */
export function StationTabs({ label, stations, current, onSelect, className }: { label: string; stations: readonly LabStation[]; current: string; onSelect?: (id: string) => void; className?: string }) {
  return <div className={["lqp-stations", className].filter(Boolean).join(" ")} role="tablist" aria-label={label}>
    {stations.map((station) => <button key={station.id} type="button" role="tab" aria-selected={station.id === current} className="lqp-station" disabled={station.disabled} onClick={() => onSelect?.(station.id)}>
      {station.label}
      {station.done && <><Check size={14} aria-hidden="true" /><span className="sr-only">{station.doneLabel}</span></>}
    </button>)}
  </div>;
}

export type ChoiceOption<T extends string> = { value: T; label: ReactNode; letter?: string; result?: boolean };

/** Native radio group (or checkboxes with `multiple`) in the ecology choice style; `segment` lays options in a row. */
export function ChoiceGroup<T extends string>(props: {
  legend: ReactNode;
  name: string;
  options: ReadonlyArray<ChoiceOption<T>>;
  variant?: "list" | "segment";
  testId?: string;
  className?: string;
  disabled?: boolean;
} & ({ multiple?: false; value: T | null | undefined; onChange: (value: T) => void } | { multiple: true; value: readonly T[]; onChange: (value: T[]) => void })) {
  const segment = props.variant === "segment";
  const checked = (value: T) => props.multiple ? props.value.includes(value) : props.value === value;
  const change = (value: T) => {
    if (props.multiple) props.onChange(props.value.includes(value) ? props.value.filter((item) => item !== value) : [...props.value, value]);
    else props.onChange(value);
  };
  return <fieldset className={[segment ? "lqp-segment" : "lqp-choices", props.className].filter(Boolean).join(" ")} data-testid={props.testId} disabled={props.disabled}>
    <legend>{props.legend}</legend>
    {props.options.map((option) => <label key={option.value} className={segment ? "lqp-segment-option" : "lqp-choice"} data-result={option.result === undefined ? undefined : String(option.result)}>
      <input type={props.multiple ? "checkbox" : "radio"} name={props.name} value={option.value} checked={checked(option.value)} onChange={() => change(option.value)} />
      {option.letter && <span className="lqp-letter">{option.letter}</span>}
      <span>{option.label}</span>
    </label>)}
  </fieldset>;
}
