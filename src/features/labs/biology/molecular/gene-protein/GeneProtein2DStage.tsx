import { useMemo } from "react";
import { SequenceDiagram2D, pairDna, parseDna, toRna, type AminoAcid, type DiagramBox, type DiagramBracket, type DiagramChain, type DiagramPairing, type DiagramTrack, type RnaBase } from "../kit";
import { fl27GeneConfig as config } from "./fl27-gene.config";
import { chosenChain, filledCount, geneMolecules, type GeneEvidence, type StationId } from "./gene-evidence";
import type { GeneBench } from "./gene-bench";
import { geneText } from "./gene-copy";

const RNA_PAIR: Record<RnaBase, RnaBase> = { A: "U", U: "A", G: "C", C: "G" };

/**
 * FL-27 read view (Dual-View "Đọc"): the same station state as the 3D scene
 * as a labelled sequence diagram. Nothing here is drawn by the learner.
 */
export function GeneProtein2DStage({ station, evidence, bench }: { station: StationId; evidence: GeneEvidence; bench: GeneBench }) {
  const t = geneText();
  const molecules = useMemo(() => geneMolecules(evidence.variantId), [evidence.variantId]);
  const { coding, template } = molecules;
  const diagram = useMemo(() => {
    const tracks: DiagramTrack[] = [];
    const pairings: DiagramPairing[] = [];
    const boxes: DiagramBox[] = [];
    const brackets: DiagramBracket[] = [];
    const chains: DiagramChain[] = [];
    let slots = coding.length, rows = 4;

    if (station === "structure") {
      const upper = [...coding, ...parseDna(config.helixFlank)];
      slots = upper.length; rows = 3;
      tracks.push({ id: "coding", row: 0, bases: upper, tint: "parent", ends: ["5'", "3'"], label: t.coding });
      tracks.push({ id: "template", row: 2, bases: upper.map(pairDna), tint: "parent", ends: ["3'", "5'"], label: t.template });
      pairings.push({ upper: "coding", lower: "template", from: 0, to: upper.length - 1 });
    }

    if (station === "replication") {
      const { length, forkAt, fillFrom, fillCount } = config.replication;
      const upper = coding.slice(0, length), lower = template.slice(0, length);
      const learner = lower.map((_, index) => (index >= fillFrom && index < fillFrom + fillCount ? evidence.replication.newStrand[index - fillFrom] : null));
      const active = bench.replicationPhase >= 1 && bench.replicationPhase < 3 ? fillFrom + (bench.activeSlot ?? filledCount(evidence.replication.newStrand)) : null;
      slots = length; rows = 5;
      if (bench.replicationPhase === 0) {
        rows = 3;
        tracks.push({ id: "up", row: 0, bases: upper, tint: "parent", ends: ["5'", "3'"], label: t.coding });
        tracks.push({ id: "low", row: 2, bases: lower, tint: "parent", ends: ["3'", "5'"], label: t.template });
        pairings.push({ upper: "up", lower: "low", from: 0, to: length - 1 });
      } else if (bench.replicationPhase === 3) {
        const newUpper = upper.map((base, index) => learner[index] ?? base);
        tracks.push({ id: "a-up", row: 0, bases: upper, tint: "parent", ends: ["5'", "3'"] });
        tracks.push({ id: "a-low", row: 1.3, bases: lower, tint: "new", ends: ["3'", "5'"] });
        tracks.push({ id: "b-up", row: 2.9, bases: newUpper, tint: "new", ends: ["5'", "3'"] });
        tracks.push({ id: "b-low", row: 4.2, bases: lower, tint: "parent", ends: ["3'", "5'"] });
        pairings.push({ upper: "a-up", lower: "a-low", from: 0, to: length - 1 }, { upper: "b-up", lower: "b-low", from: 0, to: length - 1 });
      } else {
        tracks.push({ id: "closed-up", row: 1.5, bases: upper.slice(0, forkAt + 1), tint: "parent", ends: ["5'", ""] });
        tracks.push({ id: "closed-low", row: 2.5, bases: lower.slice(0, forkAt + 1), tint: "parent", ends: ["3'", ""] });
        tracks.push({ id: "open-up", row: 0, start: forkAt + 1, bases: upper.slice(forkAt + 1), tint: "parent", ends: ["", "3'"], label: t.coding });
        tracks.push({ id: "twin", row: 1, start: forkAt + 1, bases: learner.slice(forkAt + 1).map((base, index) => (base ? pairDna(upper[forkAt + 1 + index]) : null)), tint: "new" });
        tracks.push({ id: "learner", row: 3, start: forkAt + 1, bases: learner.slice(forkAt + 1), tint: "new", active: active === null ? null : active - forkAt - 1, label: t.newStrand });
        tracks.push({ id: "open-low", row: 4, start: forkAt + 1, bases: lower.slice(forkAt + 1), tint: "parent", ends: ["", "5'"], label: t.parentStrand });
        pairings.push({ upper: "closed-up", lower: "closed-low", from: 0, to: forkAt });
        pairings.push({ upper: "open-up", lower: "twin", from: forkAt + 1, to: length - 1 }, { upper: "learner", lower: "open-low", from: forkAt + 1, to: length - 1 });
        boxes.push({ from: forkAt, to: forkAt, rowTop: 1.5, rowBottom: 2.5, label: t.helicase, tone: "enzyme" });
        const at = Math.min(fillFrom + filledCount(evidence.replication.newStrand), length - 1);
        boxes.push({ from: at, to: at, rowTop: 3, rowBottom: 4, label: t.polymerase, tone: "enzyme" });
      }
    }

    if (station === "transcription") {
      const mrna = evidence.transcription.mrna;
      const progress = filledCount(mrna);
      const active = progress >= mrna.length ? null : bench.activeSlot ?? progress;
      tracks.push({ id: "coding", row: 0, bases: coding, tint: "parent", ends: ["5'", "3'"], label: t.coding });
      tracks.push({ id: "mrna", row: 2, bases: mrna, tint: "rna", ends: ["5'", "3'"], label: t.mrna, active });
      tracks.push({ id: "template", row: 3, bases: template, tint: "parent", ends: ["3'", "5'"], label: t.template });
      pairings.push({ upper: "mrna", lower: "template", from: 0, to: mrna.length - 1 });
      if (progress < mrna.length) boxes.push({ from: Math.max(0, progress - 1), to: Math.min(mrna.length - 1, progress + 1), rowTop: 2, rowBottom: 3, label: t.rnaPolymerase, tone: "enzyme" });
    }

    if (station === "translation") {
      const mrna = evidence.transcription.mrna;
      const chain = chosenChain(evidence);
      const done = chain[chain.length - 1] === "Stop";
      const k = chain.length;
      const pSite = Math.max(0, Math.min(k - 1, mrna.length / 3 - 1));
      rows = 5.2;
      tracks.push({ id: "mrna", row: 4, bases: mrna, tint: "rna", ends: ["5'", "3'"], label: t.mrna });
      if (k >= 1 && !done && mrna.every((base) => base)) {
        const codon = mrna.slice(pSite * 3, pSite * 3 + 3) as RnaBase[];
        tracks.push({ id: "anticodon", row: 3, start: pSite * 3, bases: codon.map((base) => RNA_PAIR[base]), tint: "rna" });
        pairings.push({ upper: "anticodon", lower: "mrna", from: pSite * 3, to: pSite * 3 + 2 });
        boxes.push({ from: Math.max(0, pSite * 3 - 3), to: Math.min(mrna.length - 1, pSite * 3 + 5), rowTop: 2.6, rowBottom: 4.2, label: t.ribosome, tone: "ribosome" });
      }
      if (!done && k < mrna.length / 3) brackets.push({ track: "mrna", from: k * 3, to: k * 3 + 2, label: t.codonLabel(k + 1) });
      const residues = chain.filter((meaning): meaning is AminoAcid => meaning !== "Stop");
      if (residues.length) chains.push({ slot: pSite * 3 + 1, row: 2.2, residues });
    }

    if (station === "mutation") {
      const upper = bench.mutated ? molecules.mutated : coding;
      const position = molecules.variant.mutation.position;
      const mrna = bench.mutated ? molecules.mutatedMrna : coding.map(toRna);
      tracks.push({ id: "coding", row: 0, bases: upper, tint: "parent", ends: ["5'", "3'"], label: t.coding, marks: [position] });
      tracks.push({ id: "template", row: 1.4, bases: upper.map(pairDna), tint: "parent", ends: ["3'", "5'"], marks: [position] });
      tracks.push({ id: "mrna", row: 3, bases: mrna, tint: "rna", ends: ["5'", "3'"], label: bench.mutated ? t.mutatedMrna : t.mrna, marks: [position] });
      pairings.push({ upper: "coding", lower: "template", from: 0, to: upper.length - 1 });
      brackets.push({ track: "mrna", from: molecules.mutatedCodonIndex * 3, to: molecules.mutatedCodonIndex * 3 + 2, label: t.codonLabel(molecules.mutatedCodonIndex + 1) });
    }

    if (station === "conclusion") {
      const mrna = evidence.transcription.mrna.some((base) => base) ? evidence.transcription.mrna : coding.map(toRna);
      rows = 5.4;
      tracks.push({ id: "coding", row: 0, bases: coding, tint: "parent", ends: ["5'", "3'"], label: `${t.flowNames.dna}: ${t.coding}` });
      tracks.push({ id: "template", row: 1.2, bases: template, tint: "parent", ends: ["3'", "5'"] });
      tracks.push({ id: "mrna", row: 2.8, bases: mrna, tint: "rna", ends: ["5'", "3'"], label: t.flowNames.mrna });
      pairings.push({ upper: "coding", lower: "template", from: 0, to: coding.length - 1 });
      const residues = chosenChain(evidence).filter((meaning): meaning is AminoAcid => meaning !== "Stop");
      if (residues.length) chains.push({ slot: coding.length - 1, row: 4.6, residues });
    }
    return { tracks, pairings, boxes, brackets, chains, slots, rows };
  }, [station, evidence, bench, coding, template, molecules, t]);

  return <div className="k7-2d-panel">
    <SequenceDiagram2D title={t.diagram[station]} {...diagram} />
  </div>;
}
