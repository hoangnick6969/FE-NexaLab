import { useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { LabHeaderActionsContext } from "../../../shared/LabSpace";
import { LabRendererToggle } from "../../../shared/LabRendererToggle";
import previewConfig from "./buoyancy-preview-config.json";
import { FluidKitLayoutShell } from "../kit";
import { BuoyancyRig3D } from "./BuoyancyRig3D";
import { Buoyancy2DStage } from "./Buoyancy2DStage";
import { BuoyancyHud } from "./BuoyancyHud";
import { BuoyancyStoreProvider, EXPLORATION_SPECIMENS, useBuoyancyStore } from "./useBuoyancyStore";
import { buoyancyPresentationSchema, defaultBuoyancyEvidence, type BuoyancyEvidence } from "./BuoyancyEvidence";
import "./buoyancy.css";

export function BuoyancyActivity({ state: evidence, onChange, resetKey = 0, runtimeConfig }: { state?: BuoyancyEvidence; onChange?: (next: BuoyancyEvidence) => void; resetKey?: number; runtimeConfig?: unknown }) {
  const [previewEvidence, setPreviewEvidence] = useState(defaultBuoyancyEvidence);
  const config = useMemo(() => buoyancyPresentationSchema.safeParse(onChange ? runtimeConfig : previewConfig), [runtimeConfig, onChange]);
  if (!config.success) return <div role="alert">Cấu hình FL-05 đã ghim không hợp lệ hoặc bị thiếu.</div>;
  return <BuoyancyStoreProvider key={resetKey} config={config.data} evidence={evidence ?? previewEvidence}>
    <BuoyancyScene evidence={evidence ?? previewEvidence} onChange={onChange ?? setPreviewEvidence} />
  </BuoyancyStoreProvider>;
}

function BuoyancyScene({ evidence, onChange }: { evidence: BuoyancyEvidence; onChange: (next: BuoyancyEvidence) => void }) {
  const state = useBuoyancyStore();
  const headerActions = useContext(LabHeaderActionsContext);
  const specimen = [...state.config.specimens, ...EXPLORATION_SPECIMENS].find((item) => item.id === state.specimenId)!;
  const graded = state.config.specimens.some(item => item.id === state.specimenId);
  const evidenceVolume = graded ? state.submergedVolumeMl : 0;
  const massG = specimen.massG;
  const weightN = massG / 1000 * state.config.gravity;
  useEffect(() => {
    if (evidence.specimenId !== state.specimenId || evidence.submergedVolumeMl !== evidenceVolume)
      onChange({ ...evidence, specimenId: state.specimenId, submergedVolumeMl: evidenceVolume, ...(evidence.specimenId !== state.specimenId ? { overflowMl: null, measuredBuoyantForceN: null } : {}) });
  }, [evidence, onChange, state.specimenId, evidenceVolume]);
  return <FluidKitLayoutShell mode={state.mode} ariaLabel="FL-05 Buoyancy">
    {headerActions ? createPortal(<LabRendererToggle mode={state.mode} onChange={state.setMode} />, headerActions) : <div className="buoyancy-view-toggle"><LabRendererToggle mode={state.mode} onChange={state.setMode} /></div>}
    <BuoyancyRig3D />
    <div className={`buoyancy-table${state.mode === "2d" ? " is-active" : ""}`} aria-hidden={state.mode !== "2d"}>
      <Buoyancy2DStage />
      <h2>Bảng số liệu FL-05</h2><table><thead><tr><th>Mẫu</th><th>P₀ (N)</th><th>F_lực kế (N)</th><th>F_A (N)</th><th>V tràn (mL)</th></tr></thead><tbody><tr><td>{specimen.label}</td><td>{weightN.toFixed(3)}</td><td>{state.springForceN.toFixed(3)}</td><td>{(state.config.fluidDensityKgM3 * state.config.gravity * state.submergedVolumeMl / 1e6).toFixed(3)}</td><td>{state.overflowMl.toFixed(1)}</td></tr>{state.records.map((row, i) => <tr key={i}><td>{row.specimenId} · lần {i + 1}</td><td>{row.weightN.toFixed(3)}</td><td>{row.springN.toFixed(3)}</td><td>{row.buoyantN.toFixed(3)}</td><td>{row.volumeMl.toFixed(1)}</td></tr>)}</tbody></table>
      <label>Thể tích nước tràn đo được (mL)<input disabled={!graded} data-testid="buoyancy-overflow-input" type="number" min="0" max="500" step="0.1" value={evidence.overflowMl ?? ""} onChange={(event) => onChange({ ...evidence, overflowMl: event.target.value === "" ? null : Number(event.target.value) })} /></label>
      <label>Lực đẩy tính từ số chỉ lực kế (N)<input disabled={!graded} data-testid="buoyancy-force-input" type="number" min="0" max="50" step="0.001" value={evidence.measuredBuoyantForceN ?? ""} onChange={(event) => onChange({ ...evidence, measuredBuoyantForceN: event.target.value === "" ? null : Number(event.target.value) })} /></label>
    </div>
    <BuoyancyHud />
  </FluidKitLayoutShell>;
}
