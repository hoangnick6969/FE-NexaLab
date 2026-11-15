/**
 * K2 Explore-first Lab: Stage 1 intro & safety → Stage 2 free workbench → Stage 3 optional prompts.
 * Unscored and client-only: no LabRun, no attempt, no evidence.
 */
import { useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { LabHeaderActionsContext, LabSpace } from "../../../shared/LabSpace";
import { LabIntroOverlay } from "../../../shared/LabIntroOverlay";
import { ObservationDrawer, usePromptAnswers } from "../../../shared/ObservationDrawer";
import { observationLogKey } from "../../../shared/explore/observation-log";
import { listWetBenchKitItems } from "./kit-items";
import { benchReducer, initialBenchState } from "./bench-reducer";
import { BenchHud } from "./BenchHud";
import { loadObservationLog, saveObservationLog } from "./observation-log";
import { ObservationLogPanel } from "./ObservationLogPanel";
import { WetBenchKitStage } from "./WetBenchKitStage";
import "./kit.css";

const ackKey = (storageKey: string) => `nexalab:k2-safety-ack:${storageKey}`;
const readAck = (storageKey: string) => { try { return localStorage.getItem(ackKey(storageKey)) === "1"; } catch { return false; } };

type BenchProps = {
  config: ChemistryLabConfig; headerExtra?: ReactNode; draftNotice?: string; configSource?: "database" | "bundled";
  /** Key for the local notebook, safety ack and answers: `/labs/:id` passes `labId@activity.id` (P0 C1.2); the dev route keeps `labId@configVersion`. */
  storageKey?: string;
};

export function ExploreBench({ onExit, exitTo, ...props }: BenchProps & { onExit: () => void; exitTo?: string }) {
  return <LabSpace title={props.config.title} onExit={onExit} exitTo={exitTo}>
    <ExploreBenchBody {...props} />
  </LabSpace>;
}

function ExploreBenchBody({ config, headerExtra, draftNotice, configSource, storageKey = observationLogKey(config.labId, config.configVersion) }: BenchProps) {
  const [state, dispatch] = useReducer(benchReducer, config, initialBenchState);
  const [introOpen, setIntroOpen] = useState(true);
  const [reopened, setReopened] = useState(false);
  const [acknowledged, setAcknowledged] = useState(() => readAck(storageKey));
  const [hovered, setHovered] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewReset, setViewReset] = useState(0);
  const [answers, setAnswer] = usePromptAnswers(`nexalab:k2-prompts:${storageKey}`);
  const [seenPrompts, setSeenPrompts] = useState<string[]>([]);
  const headerActions = useContext(LabHeaderActionsContext);
  const kitItems = useMemo(() => listWetBenchKitItems(config), [config]);
  const [loadedLogKey, setLoadedLogKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadObservationLog(storageKey).then((entries) => {
      if (!active) return;
      if (entries.length) dispatch({ type: "load_log", entries });
      setLoadedLogKey(storageKey);
    });
    return () => { active = false; };
  }, [storageKey]);
  useEffect(() => {
    if (loadedLogKey !== storageKey) return;
    const timer = window.setTimeout(() => void saveObservationLog(storageKey, state.log), 300);
    return () => window.clearTimeout(timer);
  }, [loadedLogKey, storageKey, state.log]);

  useEffect(() => {
    if (introOpen) return;
    const key = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
      if (event.key === "Escape" && state.held && !typing) { event.preventDefault(); dispatch({ type: "release" }); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !typing) { event.preventDefault(); dispatch({ type: "undo", now: Date.now() }); }
    };
    // Right-click puts whatever is in hand back where it was, instead of opening the browser menu.
    const rightClick = (event: MouseEvent) => {
      if (!state.held) return;
      event.preventDefault();
      dispatch({ type: "release" });
    };
    window.addEventListener("keydown", key);
    window.addEventListener("contextmenu", rightClick, true);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("contextmenu", rightClick, true); };
  }, [introOpen, state.held]);

  const prompts = useMemo(() => (config.pedagogy.observationPrompts ?? []).map((prompt) => {
    const when = prompt.highlightWhen;
    const triggered = Boolean(when && ((when.reaction && state.seen.reactions.includes(when.reaction)) || (when.measurement && state.seen.measurements.includes(when.measurement))));
    return { ...prompt, isNew: triggered && !seenPrompts.includes(prompt.id), canFocus: Boolean(prompt.focus?.apparatusId || prompt.focus?.reagentId) };
  }), [config, state.seen, seenPrompts]);
  const markSeen = useCallback(() => setSeenPrompts((current) => {
    const fresh = prompts.filter((prompt) => prompt.isNew).map((prompt) => prompt.id);
    return fresh.length ? [...current, ...fresh] : current;
  }), [prompts]);
  const focusPrompt = (promptId: string) => {
    const focus = config.pedagogy.observationPrompts?.find((prompt) => prompt.id === promptId)?.focus;
    const id = focus?.apparatusId ? `apparatus:${focus.apparatusId}` : focus?.reagentId ? `reagent:${focus.reagentId}` : null;
    if (!id) return;
    setHovered(id);
    window.setTimeout(() => setHovered((current) => (current === id ? null : current)), 3500);
  };

  const enter = () => {
    if (config.safetyBriefing.acknowledgeRequired) { try { localStorage.setItem(ackKey(storageKey), "1"); } catch { /* per-session only */ } setAcknowledged(true); }
    setIntroOpen(false);
    setReopened(false);
  };
  const lastEntry = state.log.at(-1);
  const announce = lastEntry ? `${lastEntry.locationVi}: ${lastEntry.actionVi}. ${lastEntry.phenomenaVi.join(". ")}${lastEntry.readings.ph ? `. pH ${lastEntry.readings.ph}` : ""}` : "";

  const actions = <div className="k2-header-actions">
    <span className="k2-mode-badge" title={configSource === "bundled" ? "Cấu hình lấy từ bộ Kit trong ứng dụng" : configSource === "database" ? "Cấu hình lấy từ cơ sở dữ liệu" : undefined}>Khám phá tự do · không chấm điểm</span>
    <button type="button" className="secondary" onClick={() => { setReopened(true); setIntroOpen(true); }}>Giới thiệu & an toàn</button>
    <button type="button" className="secondary" disabled={!state.history.length} onClick={() => dispatch({ type: "undo", now: Date.now() })}>↶ Hoàn tác</button>
    <button type="button" className="secondary" onClick={() => { if (window.confirm("Làm mới bàn thí nghiệm? Các vật chứa trở về trạng thái ban đầu; nhật ký vẫn được giữ.")) { dispatch({ type: "reset", now: Date.now() }); setViewReset((value) => value + 1); } }}>Làm mới</button>
    {headerExtra}
  </div>;

  return <>
    {headerActions && createPortal(actions, headerActions)}
    <WetBenchKitStage state={state} dispatch={dispatch} hovered={hovered} onHover={setHovered} viewResetSignal={viewReset} />
    <div className="k2-layout" aria-hidden={introOpen}>
      <BenchHud state={state} dispatch={dispatch} />
      <ObservationLogPanel config={config} entries={state.log} dispatch={dispatch} />
    </div>
    {!introOpen && <ObservationDrawer open={drawerOpen} onOpenChange={setDrawerOpen} prompts={prompts} answers={answers} onAnswer={setAnswer} onFocus={focusPrompt} onSeen={markSeen}
      afterChoiceVi="Hãy kiểm chứng trên bàn: nhỏ từng giọt, theo dõi màu dung dịch và số đo pH, rồi so với lựa chọn của em." />}
    <p className="sr-only" aria-live="polite">{announce}</p>
    {introOpen && <LabIntroOverlay
      title={config.title}
      contextLabel={config.contextLabel}
      outcomes={config.outcomeSummary}
      safety={config.safetyBriefing}
      limitations={config.limitations}
      acknowledgeRequired={config.safetyBriefing.acknowledgeRequired}
      acknowledged={acknowledged}
      draftNotice={draftNotice}
      apparatus={kitItems.filter((item) => item.category !== "material").map((item) => ({ id: item.id, label: item.labelVi, purpose: item.purposeVi }))}
      materials={kitItems.filter((item) => item.category === "material").map((item) => ({
        id: item.id, label: item.labelVi, hazardLevel: item.safety?.level ?? "none", hazardTags: item.safety?.tags ?? [], noteSim: item.safety?.noteSim, noteReal: item.safety?.noteReal,
      }))}
      onEnter={enter}
      onClose={reopened ? () => { setIntroOpen(false); setReopened(false); } : undefined}
    />}
  </>;
}
