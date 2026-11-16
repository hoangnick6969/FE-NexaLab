/**
 * Shell of the Sinh học Explore benches (FL-26, FL-20, FL-21, FL-27, FL-16), built from the same parts as the K2
 * Explore bench: `LabSpace` header (mode and review badges, intro & safety, kit items toggle, 2D/3D toggle from the
 * page via `LabHeaderSlot`); the bench scene; a right column (`.lab-aside`, which every 3D framing keeps clear of)
 * with the control panel, the model readout and the shared journal; the observation prompts drawer; and the intro
 * overlay before the bench opens. Unscored: no LabRun, no attempt.
 */
import { useContext, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { KitItem } from "../../runtime/explore-registry";
import { LabHeaderActionsContext, LabSpace } from "../LabSpace";
import { LabIntroOverlay } from "../LabIntroOverlay";
import { LabKitItemsPanel, LabKitItemsToggle } from "../LabKitItemsPanel";
import { ObservationDrawer, usePromptAnswers } from "../ObservationDrawer";
import { ExploreJournal } from "./ExploreJournal";
import "./explore-bench.css";

/** The envelope fields the shell reads (every Sinh học bench config carries them). */
export type ExploreShellConfig = {
  title: string;
  kit: string;
  engine: string;
  contextLabel?: string;
  outcomeSummary: readonly string[];
  safetyBriefing: { simulation: readonly string[]; realLab: readonly string[]; acknowledgeRequired: boolean };
  limitations: readonly string[];
  pedagogy: { observationPrompts?: ReadonlyArray<{ id: string; kind: "note" | "choice" | "free_text"; textVi: string; challenge?: boolean; choices?: ReadonlyArray<{ id: string; labelVi: string }> }> };
  review: { status: "draft" | "reviewed" };
};

export const DRAFT_NOTICE_VI = "Dữ liệu khoa học của bài này là bản nháp, đang chờ giáo viên bộ môn duyệt.";

export type ExploreBenchShellProps = {
  labId: string;
  activityId: string;
  title: string;
  config: ExploreShellConfig;
  kitItems: readonly KitItem[];
  /** What the bench shows. A 3D stage portals itself behind the panels; a 2D scene sits in the bench card. */
  scene: ReactNode;
  /** Parameters the student changes (selects, sliders, chips). */
  controls: ReactNode;
  /** Values the model gives for the current state; shown under the controls. */
  readout?: ReactNode;
  journalSummary: string;
  canSave: boolean;
  /** Shown under the journal buttons while `canSave` is false. */
  saveHint?: string;
  draftNoticeVi?: string;
  /** `card`: a framed 2D bench left of the right column. `full`: a full-bleed 3D stage, cards float over it. */
  sceneKind?: "card" | "full";
  testId?: string;
};

export function ExploreBenchShell(props: ExploreBenchShellProps) {
  return <LabSpace title={props.title} exitTo="/labs"><ExploreBenchBody {...props} /></LabSpace>;
}

function ExploreBenchBody({ labId, activityId, title, config, kitItems, scene, controls, readout, journalSummary, canSave, saveHint, draftNoticeVi = DRAFT_NOTICE_VI, sceneKind = "card", testId }: ExploreBenchShellProps) {
  const headerActions = useContext(LabHeaderActionsContext);
  const [introOpen, setIntroOpen] = useState(true);
  const [reopened, setReopened] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const storageKey = `${labId}@${activityId}`;
  const [answers, setAnswer] = usePromptAnswers(`nexalab:explore-prompts:${storageKey}`);
  const draft = config.review.status !== "reviewed";
  const prompts = useMemo(() => (config.pedagogy.observationPrompts ?? []).map((prompt) => ({ ...prompt, isNew: false, canFocus: false })), [config]);

  const actions = <div className="explore-header-actions">
    <span className="explore-mode-badge">Khám phá tự do · không chấm điểm</span>
    {draft && <span className="explore-draft-badge" role="note" title={draftNoticeVi} aria-label={`Bản nháp, chờ duyệt. ${draftNoticeVi}`} data-testid="explore-draft-badge">Bản nháp · chờ duyệt</span>}
    <button type="button" className="secondary" onClick={() => { setReopened(true); setIntroOpen(true); }}>Giới thiệu & an toàn</button>
    <LabKitItemsToggle open={kitOpen} onOpenChange={setKitOpen} count={kitItems.length} />
  </div>;

  return <>
    {headerActions && createPortal(actions, headerActions)}
    <div className={`explore-bench explore-bench-${sceneKind}`} data-testid={testId ?? "explore-bench"} data-lab={labId} data-activity={activityId} aria-hidden={introOpen || undefined}>
      <div className="explore-scene" data-testid="explore-scene">{scene}</div>
      <aside className="lab-aside explore-aside" aria-label={`Bảng điều khiển: ${title}`}>
        <section className="explore-card" aria-labelledby="explore-controls-title">
          <h2 id="explore-controls-title" className="explore-card-title">Bảng điều khiển</h2>
          <div className="explore-controls">{controls}</div>
          {readout && <div className="explore-readout" aria-live="polite">
            <p className="explore-readout-title">Kết quả từ mô hình</p>
            {readout}
          </div>}
        </section>
        <ExploreJournal labId={labId} activityId={activityId} kit={config.kit} engine={config.engine} summary={journalSummary} canSave={canSave} saveHint={saveHint} />
      </aside>
      <LabKitItemsPanel items={kitItems} open={kitOpen} onOpenChange={setKitOpen} />
    </div>
    {!introOpen && prompts.length > 0 && <ObservationDrawer open={drawerOpen} onOpenChange={setDrawerOpen} prompts={prompts} answers={answers} onAnswer={setAnswer}
      onFocus={() => undefined} onSeen={() => undefined} afterChoiceVi="Hãy kiểm chứng trên bàn rồi so với lựa chọn của em." />}
    {introOpen && <LabIntroOverlay
      title={config.title}
      contextLabel={config.contextLabel}
      outcomes={config.outcomeSummary}
      safety={config.safetyBriefing}
      limitations={config.limitations}
      acknowledgeRequired={config.safetyBriefing.acknowledgeRequired}
      acknowledged={false}
      draftNotice={draft ? draftNoticeVi : undefined}
      apparatus={kitItems.map((item) => ({ id: item.id, label: item.labelVi, purpose: item.purposeVi }))}
      materials={[]}
      onEnter={() => { setIntroOpen(false); setReopened(false); }}
      onClose={reopened ? () => { setIntroOpen(false); setReopened(false); } : undefined}
    />}
  </>;
}

/** Shared check for a WebGL context, so a bench starts in 3D only where it can draw it. */
export function canUseWebgl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
