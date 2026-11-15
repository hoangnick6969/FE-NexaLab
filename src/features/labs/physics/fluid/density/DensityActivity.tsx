import { LabHeaderSlot } from "../../../shared/LabSpace";
import { useEffect, useState } from "react";
import { getLocale } from "../../../../../i18n";
import { K3Hud, formatReading, k3Material, k3Specimen } from "../kit";
import { fl03DensityConfig as config } from "./fl03-density.config";
import { densityText } from "./density-copy";
import { BLOCK_IDS, EXPLORE_IDS, PEBBLE_IDS, STATION_IDS, applyRunPins, defaultDensityEvidence, densityEvidenceFrom, densityEvidenceReady, stationDone, type DensityEvidence, type StationId } from "./density-evidence";
import { LabRendererToggle, useLabRendererMode } from "../../../shared/LabRendererToggle";
import { Density2DStage, balanceReadingG, cylinderVolumeMl, initialBench, stationSpecimenId, type Bench } from "./Density2DStage";
import { Density3DStage } from "./Density3DStage";
import { DensityNotebook } from "./DensityNotebook";
import { FluidKitLayoutShell } from "../kit";
import "./density.css";

export { defaultDensityEvidence, densityEvidenceReady };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const SPECIMEN_OPTIONS = { explore: EXPLORE_IDS, block: BLOCK_IDS, pebble: PEBBLE_IDS } as const;

/**
 * FL-03 density, 2D pilot. The learner works through the textbook stations on the
 * bench and records readings in the notebook; the draft is local until submitted and
 * the server recomputes every reading and the rubric (`density-stations@1`).
 */
export function DensityActivity({ state, onChange, resetKey, runtimeParams = null }: { state: unknown; onChange: (next: DensityEvidence) => void; resetKey: number; runtimeParams?: Record<string, string | number> | null }) {
  const t = densityText();
  const locale = getLocale();
  // Server-chosen specimens win over the local state; the preview has no run, so it keeps its own.
  const evidence = applyRunPins(densityEvidenceFrom(state), runtimeParams);
  const [station, setStation] = useState<StationId>("explore");
  const [bench, setBench] = useState<Bench>(initialBench);
  const [viewMode, setViewMode] = useLabRendererMode("nexalab:lab-view:density-bench");
  useEffect(() => { setStation("explore"); setBench(initialBench()); }, [resetKey]);

  const patchBench = (change: Partial<Bench>) => setBench((current) => ({ ...current, ...change }));
  const selectStation = (id: string) => { setStation(id as StationId); setBench((current) => ({ ...initialBench(), exploreId: current.exploreId })); };
  const specimenId = stationSpecimenId(station, evidence, bench);
  const reading = balanceReadingG(station, evidence, bench);
  const cylinderMl = cylinderVolumeMl(station, evidence, bench);

  const chooseSpecimen = (id: string) => {
    if (station === "explore") patchBench({ exploreId: id as Bench["exploreId"], onPan: false });
    else if (station === "block") {
      onChange({ ...evidence, block: { ...evidence.block, specimenId: id as DensityEvidence["block"]["specimenId"] } });
      patchBench({ onPan: false });
    } else if (station === "pebble") {
      onChange({ ...evidence, pebble: { ...evidence.pebble, specimenId: id as DensityEvidence["pebble"]["specimenId"] } });
      patchBench({ onPan: false, dropped: false });
    }
  };
  const pour = (delta: number) => onChange({ ...evidence, water: { ...evidence.water, pouredMl: clamp(evidence.water.pouredMl + delta, 10, 90) } });
  const setInitial = (delta: number) => onChange({ ...evidence, pebble: { ...evidence.pebble, initialMl: clamp(evidence.pebble.initialMl + delta, 20, 80) } });

  const specimenOptions = station in SPECIMEN_OPTIONS ? SPECIMEN_OPTIONS[station as keyof typeof SPECIMEN_OPTIONS] : null;
  const specimenName = (id: string) => {
    if (station === "explore") return t.bars[id as keyof typeof t.bars];
    const specimen = k3Specimen(config, id);
    return `${k3Material(config, specimen.materialId).label[locale]} ${id.endsWith("a") ? "A" : "B"}`;
  };

  const balanceButton = (label: string, offLabel: string, disabled = false) => (
    <button type="button" className="secondary" aria-pressed={bench.onPan} disabled={disabled} onClick={() => patchBench({ onPan: !bench.onPan })} data-testid="density-balance-toggle">
      {bench.onPan ? offLabel : label}
    </button>
  );

  const actions = <>
    {specimenOptions && <label className="fl03-field fl03-select">
      <span className="fl03-field-label">{t.specimen}</span>
      <select value={specimenId} onChange={(event) => chooseSpecimen(event.target.value)} data-testid="density-specimen">
        {specimenOptions.map((id) => <option key={id} value={id}>{specimenName(id)}</option>)}
      </select>
    </label>}
    {station === "explore" && balanceButton(t.putOnBalance, t.takeOffBalance)}
    {station === "block" && <>
      <div className="fl03-segment" role="group" aria-label={t.edge}>
        {(["a", "b", "c"] as const).map((edge) => (
          <button key={edge} type="button" className="secondary" aria-pressed={bench.edge === edge} onClick={() => patchBench({ edge })}>
            {{ a: t.edgeA, b: t.edgeB, c: t.edgeC }[edge]}
          </button>
        ))}
      </div>
      {balanceButton(t.putOnBalance, t.takeOffBalance)}
    </>}
    {station === "water" && <>
      <p className="fl03-line">{t.waterInCylinder(bench.transferred ? 0 : evidence.water.pouredMl)}</p>
      <div className="fl03-segment" role="group" aria-label={t.cylinder}>
        <button type="button" className="secondary" disabled={bench.transferred} onClick={() => pour(-5)}>{t.pourLess(5)}</button>
        <button type="button" className="secondary" disabled={bench.transferred} onClick={() => pour(-1)}>{t.pourLess(1)}</button>
        <button type="button" className="secondary" disabled={bench.transferred} onClick={() => pour(1)}>{t.pourMore(1)}</button>
        <button type="button" className="secondary" disabled={bench.transferred} onClick={() => pour(5)}>{t.pourMore(5)}</button>
      </div>
      {balanceButton(t.putCupOnBalance, t.takeCupOff)}
      <button type="button" className="secondary" onClick={() => patchBench({ transferred: !bench.transferred })} data-testid="density-transfer">
        {bench.transferred ? t.undoTransfer : t.transfer}
      </button>
    </>}
    {station === "pebble" && <>
      <p className="fl03-line">{t.initialLevel(evidence.pebble.initialMl)}</p>
      <div className="fl03-segment" role="group" aria-label={t.cylinder}>
        <button type="button" className="secondary" disabled={bench.dropped} onClick={() => setInitial(-1)}>{t.lessWater}</button>
        <button type="button" className="secondary" disabled={bench.dropped} onClick={() => setInitial(1)}>{t.moreWater}</button>
      </div>
      {balanceButton(t.putOnBalance, t.takeOffBalance, bench.dropped)}
      <button type="button" className="secondary" onClick={() => patchBench({ dropped: !bench.dropped, onPan: false })} data-testid="density-drop">
        {bench.dropped ? t.takePebbleOut : t.dropPebble}
      </button>
    </>}
  </>;

  const measured = STATION_IDS.slice(0, 4).every((other) => stationDone(evidence, other));
  return <FluidKitLayoutShell className="density-activity" mode={viewMode} testId="density-activity" ariaLabel={t.title}>
    <LabHeaderSlot><LabRendererToggle mode={viewMode} onChange={setViewMode} /></LabHeaderSlot>
    <div className={`fluid-kit-renderer fluid-kit-renderer-3d${viewMode === "3d" ? " is-active" : ""}`} aria-hidden={viewMode !== "3d"}>
      <Density3DStage station={station} evidence={evidence} bench={bench} active={viewMode === "3d"} />
    </div>
    <div className={`fluid-kit-renderer fluid-kit-renderer-2d${viewMode === "2d" ? " is-active" : ""}`} aria-hidden={viewMode !== "2d"}>
      <Density2DStage station={station} evidence={evidence} bench={bench} />
    </div>
    <K3Hud
      title={t.title}
      stations={STATION_IDS.map((id) => ({
        id, label: t.stations[id], doneLabel: t.stationDone,
        done: stationDone(evidence, id) && (id !== "conclusion" || measured),
      }))}
      current={station}
      onSelect={selectStation}
      step={{ index: STATION_IDS.indexOf(station), total: STATION_IDS.length }}
      instruction={t.instruction[station]}
      readout={station === "conclusion" ? undefined : <>
        {t.readoutBalance(formatReading(reading, config.instruments.balance.resolutionG, locale))}
        {station === "explore" || station === "block" ? "" : `, ${t.readoutCylinder(cylinderMl)}`}
      </>}
      actions={station === "conclusion" ? undefined : actions}
      notice={`${t.notice} ${config.reviewStatus === "PROPOSED_UNAPPROVED" ? t.unreviewed : ""}`.trim()}
    >
      <DensityNotebook station={station} evidence={evidence} onChange={onChange} />
    </K3Hud>
  </FluidKitLayoutShell>;
}
