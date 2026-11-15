/**
 * Stage 3 of the Explore-first flow, shared by every kit: optional observation prompts and challenges.
 * Never blocks the bench; answers stay on this device and are not scored.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLabPanelSections } from "./LabClassSection";
import "./LabIntro.css";

export type DrawerPrompt = {
  id: string;
  kind: "note" | "choice" | "free_text";
  textVi: string;
  challenge?: boolean;
  choices?: ReadonlyArray<{ id: string; labelVi: string }>;
  isNew: boolean;
  canFocus: boolean;
};
export type PromptAnswers = Record<string, string>;

export function ObservationDrawer({ open, onOpenChange, prompts, answers, onAnswer, onFocus, onSeen, afterChoiceVi, teacherSection }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompts: readonly DrawerPrompt[];
  answers: PromptAnswers;
  onAnswer: (promptId: string, value: string) => void;
  onFocus: (promptId: string) => void;
  onSeen: () => void;
  afterChoiceVi?: string;
  /** Class Lab teacher questions (teacher-graded flow) render here when present. */
  teacherSection?: ReactNode;
}) {
  const fresh = prompts.filter((prompt) => prompt.isNew).length;
  useEffect(() => { if (open) onSeen(); }, [open, onSeen, fresh]);
  // Class Lab teacher questions (when the Lab Space has them) join the drawer after the observation prompts.
  const { classSection, result } = useLabPanelSections();
  const toggle = useRef<HTMLButtonElement>(null);
  // Esc only acts while focus is inside the drawer (SPEC-lab-space-shared-ui §3): on the bench it releases the tool.
  const collapse = () => { onOpenChange(false); requestAnimationFrame(() => toggle.current?.focus({ preventScroll: true })); };
  return <>
    <button ref={toggle} type="button" className="observation-drawer-toggle" aria-expanded={open} aria-controls="observation-drawer" onClick={() => onOpenChange(!open)}>
      Gợi ý quan sát{fresh > 0 && <span className="observation-drawer-badge">{fresh} mới</span>}
    </button>
    <aside id="observation-drawer" className={`observation-drawer${open ? " is-open" : ""}`} aria-label="Gợi ý quan sát và thử thách" hidden={!open}
      onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); collapse(); } }}>
      <header><h2>Gợi ý quan sát</h2><button type="button" className="text-button" onClick={collapse}>Thu gọn</button></header>
      <p className="lab-intro-small">Không bắt buộc và không chấm điểm. Em vẫn thao tác trên bàn khi đang mở mục này.</p>
      <ol className="observation-prompts">{prompts.map((prompt) => <li key={prompt.id} className={prompt.challenge ? "is-challenge" : ""}>
        <div className="observation-prompt-head">
          {prompt.challenge && <span className="observation-tag">Thử thách</span>}
          {prompt.isNew && <span className="observation-tag is-new">Vừa liên quan</span>}
        </div>
        <p>{prompt.textVi}</p>
        {prompt.kind === "choice" && prompt.choices && <div className="observation-choices" role="radiogroup" aria-label="Lựa chọn của em">
          {prompt.choices.map((choice) => <button key={choice.id} type="button" role="radio" aria-checked={answers[prompt.id] === choice.id} className={answers[prompt.id] === choice.id ? "is-on" : ""} onClick={() => onAnswer(prompt.id, choice.id)}>{choice.labelVi}</button>)}
        </div>}
        {prompt.kind === "choice" && answers[prompt.id] && afterChoiceVi && <p className="lab-intro-small">{afterChoiceVi}</p>}
        {prompt.kind === "free_text" && <label className="observation-text">
          <span className="sr-only">Ghi chú của em</span>
          <textarea rows={3} maxLength={1000} placeholder="Ghi nhận xét của em…" value={answers[prompt.id] ?? ""} onChange={(event) => onAnswer(prompt.id, event.target.value)} />
        </label>}
        {prompt.canFocus && <button type="button" className="text-button" onClick={() => onFocus(prompt.id)}>Chỉ cho em trên bàn</button>}
      </li>)}</ol>
      {result}
      {teacherSection ?? classSection}
    </aside>
  </>;
}

/** Per-device prompt answers; storage failures fall back to memory. */
export function usePromptAnswers(storageKey: string) {
  const [answers, setAnswers] = useState<PromptAnswers>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "{}") as PromptAnswers; } catch { return {}; }
  });
  const update = (promptId: string, value: string) => setAnswers((current) => {
    const next = { ...current, [promptId]: value };
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* memory only */ }
    return next;
  });
  return [answers, update] as const;
}
