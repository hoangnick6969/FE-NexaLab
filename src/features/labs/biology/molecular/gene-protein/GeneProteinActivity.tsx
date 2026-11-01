import { createPortal } from "react-dom";
import { useContext, useEffect, useState } from "react";
import { LabHeaderActionsContext } from "../../../shared/LabSpace";
import { LabRendererToggle, useLabRendererMode } from "../../../shared/LabRendererToggle";
import { BasePicker, CODON_MEANINGS, DNA_BASES, ELEMENT_COLORS, GeneLabBench3D, K7Hud, RNA_BASES, SequenceTrack, type Base, type CodonMeaning, type DnaBase, type RnaBase } from "../kit";
import { fl27GeneConfig as config } from "./fl27-gene.config";
import { geneText } from "./gene-copy";
import { STATION_IDS, applyRunPins, chosenChain, defaultGeneEvidence, filledCount, geneEvidenceFrom, geneEvidenceReady, geneMolecules, stationDone, type GeneEvidence, type StationId } from "./gene-evidence";
import { initialGeneBench, type GeneBench } from "./gene-bench";
import { GeneProtein3DStage } from "./GeneProtein3DStage";
import { GeneProtein2DStage } from "./GeneProtein2DStage";
import { GeneNotebook } from "./GeneNotebook";

export { defaultGeneEvidence, geneEvidenceReady };

/** Places `base` at the active slot (or the first empty one) and moves on to the next empty slot. */
function place<T extends Base>(values: readonly (T | null)[], active: number | null, base: T): { values: (T | null)[]; next: number | null } {
  const index = active ?? values.indexOf(null);
  if (index < 0) return { values: [...values], next: null };
  const updated = [...values];
  updated[index] = base;
  const after = updated.indexOf(null, index + 1);
  const next = after >= 0 ? after : updated.indexOf(null);
  return { values: updated, next: next >= 0 ? next : null };
}

/** Clears the active slot, or the last filled one when none is selected. */
function erase<T>(values: readonly (T | null)[], active: number | null): { values: (T | null)[]; next: number | null } {
  const filled = values.map((value, index) => (value === null ? -1 : index)).filter((index) => index >= 0);
  const index = active ?? filled[filled.length - 1];
  if (index === undefined || index < 0) return { values: [...values], next: active };
  const updated = [...values];
  updated[index] = null;
  return { values: updated, next: index };
}

/**
 * FL-27 "Từ gene đến protein": six textbook stations on the K7 molecular
 * scene, with an equivalent 2D read view. The learner's answers live in a
 * local draft until submitted; the server recomputes the gene's sequences and
 * marks the rubric (`gene-protein-stations@1`).
 */
export function GeneProteinActivity({ state, onChange, resetKey, runtimeParams = null }: { state: unknown; onChange: (next: GeneEvidence) => void; resetKey: number; runtimeParams?: Record<string, string | number> | null }) {
  const t = geneText();
  const headerActions = useContext(LabHeaderActionsContext);
  const evidence = applyRunPins(geneEvidenceFrom(state), runtimeParams);
  const [station, setStation] = useState<StationId>("structure");
  const [bench, setBench] = useState<GeneBench>(() => initialGeneBench());
  const [viewMode, setViewMode] = useLabRendererMode("nexalab:lab-view:gene-expression");
  const [pendingAmino, setPendingAmino] = useState<CodonMeaning | "">("");
  // 3D opens in the lab room; the microscope is the way into the molecular view (presentation only).
  const [scene, setScene] = useState<"bench" | "zooming" | "molecule">("bench");
  useEffect(() => { setStation("structure"); setBench(initialGeneBench()); setScene("bench"); }, [resetKey]);

  const patch = (change: (current: GeneEvidence) => GeneEvidence) => onChange(change(evidence));
  const patchBench = (change: Partial<GeneBench>) => setBench((current) => ({ ...current, ...change }));
  const selectStation = (id: string) => {
    const next = id as StationId;
    setStation(next);
    setBench((current) => ({ ...initialGeneBench(next), labels: current.labels, replicationPhase: next === "replication" && current.replicationPhase > 0 ? current.replicationPhase : next === "replication" && evidence.replication.newStrand.some((base) => base) ? 2 : 0 }));
  };

  const molecules = geneMolecules(evidence.variantId);
  const { fillFrom, fillCount } = config.replication;
  const chain = chosenChain(evidence);
  const translationDone = chain[chain.length - 1] === "Stop";
  const mrna = evidence.transcription.mrna;
  const mrnaComplete = mrna.every((base) => base !== null);
  const codonIndex = chain.length;
  const codonInFocus = station === "translation" && mrnaComplete && !translationDone && codonIndex < mrna.length / 3 ? mrna.slice(codonIndex * 3, codonIndex * 3 + 3).join("") : null;

  const pickDna = (base: Base) => {
    const { values, next } = place(evidence.replication.newStrand, bench.activeSlot, base as DnaBase);
    patch((current) => ({ ...current, replication: { ...current.replication, newStrand: values } }));
    patchBench({ activeSlot: next, replicationPhase: 2 });
  };
  const eraseDna = () => {
    const { values, next } = erase(evidence.replication.newStrand, bench.activeSlot);
    patch((current) => ({ ...current, replication: { ...current.replication, newStrand: values } }));
    patchBench({ activeSlot: next });
  };
  const pickRna = (base: Base) => {
    const { values, next } = place(mrna, bench.activeSlot, base as RnaBase);
    patch((current) => ({ ...current, transcription: { mrna: values } }));
    patchBench({ activeSlot: next });
  };
  const eraseRna = () => {
    const { values, next } = erase(mrna, bench.activeSlot);
    patch((current) => ({ ...current, transcription: { mrna: values } }));
    patchBench({ activeSlot: next });
  };
  const attachAmino = () => {
    if (!pendingAmino || translationDone || codonIndex >= mrna.length / 3) return;
    const aminoAcids = [...evidence.translation.aminoAcids];
    aminoAcids[codonIndex] = pendingAmino;
    patch((current) => ({ ...current, translation: { ...current.translation, aminoAcids } }));
    setPendingAmino("");
  };
  const detachAmino = () => {
    if (!chain.length) return;
    const aminoAcids = evidence.translation.aminoAcids.map((value, index) => (index >= chain.length - 1 ? null : value));
    patch((current) => ({ ...current, translation: { ...current.translation, aminoAcids } }));
  };

  const templateSegment = molecules.template.slice(fillFrom, fillFrom + fillCount);
  const actions = (() => {
    switch (station) {
      case "structure": return <>
        <div className="k7-segment" role="group" aria-label={t.representation}>
          {(["schematic", "atomic"] as const).map((kind) => <button key={kind} type="button" className="secondary" aria-pressed={bench.representation === kind} onClick={() => patchBench({ representation: kind })} data-testid={`gene-model-${kind}`}>{t[kind]}</button>)}
        </div>
        <button type="button" className="secondary" aria-pressed={bench.ruler} onClick={() => patchBench({ ruler: !bench.ruler })} data-testid="gene-ruler">{bench.ruler ? t.rulerOn : t.ruler}</button>
        <button type="button" className="secondary" aria-pressed={bench.labels} onClick={() => patchBench({ labels: !bench.labels })}>{bench.labels ? t.labelsOff : t.labels}</button>
        <button type="button" className="secondary" aria-pressed={bench.spin} disabled={bench.ruler} onClick={() => patchBench({ spin: !bench.spin })}>{bench.spin ? t.spinOff : t.spin}</button>
        <button type="button" className="secondary" onClick={() => patchBench({ viewReset: bench.viewReset + 1 })}>{t.resetView}</button>
      </>;
      case "replication": return <>
        <div className="k7-actions">
          <button type="button" className="secondary" disabled={bench.replicationPhase !== 0} onClick={() => patchBench({ replicationPhase: 1 })} data-testid="gene-unwind">{t.unwind}</button>
          {bench.replicationPhase === 3
            ? <button type="button" className="secondary" onClick={() => patchBench({ replicationPhase: 2 })}>{t.restart}</button>
            : <button type="button" className="secondary" disabled={!evidence.replication.newStrand.every((base) => base)} onClick={() => patchBench({ replicationPhase: 3, activeSlot: null })} data-testid="gene-complete">{t.complete}</button>}
        </div>
        <SequenceTrack
          rows={[
            { id: "template", label: t.parentStrand, bases: templateSegment },
            { id: "new", label: t.newStrand, bases: evidence.replication.newStrand, editable: bench.replicationPhase === 1 || bench.replicationPhase === 2 },
          ]}
          active={bench.activeSlot ?? filledCount(evidence.replication.newStrand)}
          onSelectSlot={(index) => patchBench({ activeSlot: index })}
        />
        <BasePicker label={t.pickDna} bases={DNA_BASES} onPick={pickDna} onErase={eraseDna} disabled={bench.replicationPhase === 0 || bench.replicationPhase === 3} />
      </>;
      case "transcription": return <>
        <SequenceTrack
          codons
          rows={[
            { id: "template", label: t.template, bases: molecules.template, ends: ["3'", "5'"] },
            { id: "mrna", label: t.mrna, bases: mrna, editable: true, ends: ["5'", "3'"] },
          ]}
          active={bench.activeSlot ?? (mrnaComplete ? null : filledCount(mrna))}
          onSelectSlot={(index) => patchBench({ activeSlot: index })}
        />
        <BasePicker label={t.pickRna} bases={RNA_BASES} onPick={pickRna} onErase={eraseRna} disabled={mrnaComplete && bench.activeSlot === null} />
      </>;
      case "translation":
        if (!mrnaComplete) return <p className="k7-status">{t.needMrna}</p>;
        return <>
          <SequenceTrack codons rows={[{ id: "mrna", label: t.mrna, bases: mrna, ends: ["5'", "3'"] }]} highlight={codonInFocus ? [codonIndex * 3, codonIndex * 3 + 1, codonIndex * 3 + 2] : []} />
          {translationDone ? <p className="k7-status">{t.translationDone}</p> : <label className="k7-field">
            <span>{t.currentCodon(codonIndex + 1, codonInFocus ?? "")}</span>
            <select value={pendingAmino} onChange={(event) => setPendingAmino(event.target.value as CodonMeaning | "")} aria-label={t.chooseAmino} data-testid="gene-amino-select">
              <option value="">{t.notChosen}</option>
              {CODON_MEANINGS.map((meaning) => <option key={meaning} value={meaning}>{meaning === "Stop" ? t.stop : meaning}</option>)}
            </select>
          </label>}
          <div className="k7-actions">
            {!translationDone && <button type="button" className="secondary" disabled={!pendingAmino} onClick={attachAmino} data-testid="gene-attach">{t.attach}</button>}
            <button type="button" className="secondary" disabled={!chain.length} onClick={detachAmino}>{t.detach}</button>
          </div>
        </>;
      case "mutation": return <button type="button" className="secondary" aria-pressed={bench.mutated} onClick={() => patchBench({ mutated: !bench.mutated })} data-testid="gene-mutate">{bench.mutated ? t.unmutate : t.mutate}</button>;
      default: return undefined;
    }
  })();

  const atBench = viewMode === "3d" && scene !== "molecule";
  const sceneActions = atBench
    ? <button type="button" className="primary" disabled={scene === "zooming"} onClick={() => setScene("zooming")} data-testid="gene-open-microscope">{t.openMicroscope}</button>
    : viewMode === "3d" ? <>
      <button type="button" className="secondary" onClick={() => setScene("bench")} data-testid="gene-back-to-bench">{t.backToBench}</button>
      {actions}
    </> : actions;

  const readout = (() => {
    if (atBench) return t.readBench;
    switch (station) {
      case "structure": return bench.representation === "atomic" && viewMode === "3d" ? <>
        {t.readStructure(molecules.coding.length + config.helixFlank.length)}
        <span className="k7-legend" data-testid="gene-atom-legend">
          <span>{t.atomLegend}</span>
          {(["C", "N", "O", "P"] as const).map((element) => <span key={element} className="k7-legend-item"><span className="k7-legend-dot" style={{ background: ELEMENT_COLORS[element] }} aria-hidden="true" />{t.elements[element]}</span>)}
          <span className="k7-legend-item"><span className="k7-legend-dot is-ribbon" aria-hidden="true" />{t.ribbon}</span>
        </span>
      </> : t.readStructure(molecules.coding.length + config.helixFlank.length);
      case "replication": return t.readReplication(t.phases[bench.replicationPhase], filledCount(evidence.replication.newStrand), fillCount);
      case "transcription": return t.readTranscription(mrna.filter((base) => base).length, mrna.length);
      case "translation": return t.readTranslation(chain.filter((meaning) => meaning !== "Stop").length);
      case "mutation": return t.readMutation(bench.mutated, molecules.variant.mutation.position + 1, molecules.coding[molecules.variant.mutation.position], molecules.variant.mutation.to);
      default: return undefined;
    }
  })();

  return <section className="gene-activity" data-testid="gene-activity" aria-label={t.title}>
    {headerActions && createPortal(<LabRendererToggle mode={viewMode} onChange={setViewMode} />, headerActions)}
    {viewMode === "3d"
      ? atBench
        ? <GeneLabBench3D onOpenMicroscope={() => setScene("zooming")} zooming={scene === "zooming"} onZoomArrive={() => setScene("molecule")} microscopeLabel={t.microscopeLabel} />
        : <GeneProtein3DStage station={station} evidence={evidence} bench={bench} entering />
      : <GeneProtein2DStage station={station} evidence={evidence} bench={bench} />}
    <K7Hud
      title={t.title}
      stations={STATION_IDS.map((id) => ({ id, label: t.stations[id], done: stationDone(evidence, id), doneLabel: t.stationDone }))}
      current={station}
      onSelect={selectStation}
      step={{ index: STATION_IDS.indexOf(station), total: STATION_IDS.length }}
      instruction={atBench ? t.benchInstruction : t.instruction[station]}
      readout={readout}
      actions={sceneActions}
      notice={`${t.notice} ${config.reviewStatus === "PROPOSED_UNAPPROVED" ? t.unreviewed : ""}`.trim()}
    >
      <GeneNotebook station={station} evidence={evidence} patch={patch} codonInFocus={codonInFocus} />
    </K7Hud>
  </section>;
}
