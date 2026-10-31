import { useCallback, useMemo } from "react";
import * as THREE from "three";
import {
  AngstromRuler3D, CLOSED, DnaDuplex3D, Enzyme3D, Follow, MolecularStage, NucleotideStrand3D, Polypeptide3D, Ribosome3D, TextLabel, Trna3D,
  axisX, duplexPose, helixSpec, makePoses, pairDna, parseDna, toRna, useEasedLayout,
  type AminoAcid, type DnaBase, type MolecularView, type NucleotidePose, type OpenSpan, type RnaBase,
} from "../kit";
import { fl27GeneConfig as config } from "./fl27-gene.config";
import { chosenChain, filledCount, geneMolecules, type GeneEvidence, type StationId } from "./gene-evidence";
import type { GeneBench } from "./gene-bench";
import { geneText } from "./gene-copy";

const spec = helixSpec(config.structure);
const RISE = spec.rise;
const CHORD = 2 * spec.radius * Math.sin(spec.groove / 2);
const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);

const VIEWS: Record<StationId, MolecularView> = {
  structure: { position: [1.2, 1.2, 11], target: [0, 0, 0], fitWidth: 4.2, fitHeight: 7.8, minDistance: 3, maxDistance: 36 },
  replication: { position: [0.4, 1.2, 12.5], target: [0, 0, 0], fitWidth: 7, minDistance: 5, maxDistance: 36 },
  transcription: { position: [0, 1.5, 13.5], target: [0, 0.7, 0], fitWidth: 8.4, minDistance: 5, maxDistance: 36 },
  translation: { position: [0, 2.8, 14.5], target: [0, 2.2, 0], fitWidth: 8, minDistance: 5, maxDistance: 36 },
  mutation: { position: [0, 1.2, 13], target: [0, -0.4, 0], fitWidth: 8.4, minDistance: 5, maxDistance: 36 },
  conclusion: { position: [0, 2.6, 23], target: [0, 0.6, 0], fitWidth: 21, minDistance: 8, maxDistance: 56 },
};

/** Free nucleotides around the scene where the station builds a strand from them. */
const POOLS: Record<StationId, "dna" | "rna" | null> = { structure: null, replication: "dna", transcription: "rna", translation: null, mutation: null, conclusion: null };

const RNA_PAIR: Record<RnaBase, RnaBase> = { A: "U", U: "A", G: "C", C: "G" };
const ENZYME = { helicase: "#7fc3dc", polymerase: "#f1b37c", rnaPolymerase: "#7db6e6" } as const;

/** 5'/3' tags at both ends of a closed duplex, placed where each strand actually ends. */
function DuplexEnds({ count, upper = ["5'", "3'"], lower = ["3'", "5'"] }: { count: number; upper?: readonly [string, string]; lower?: readonly [string, string] }) {
  const tags = useMemo(() => {
    const a = makePoses(1)[0], b = makePoses(1)[0];
    return [0, count - 1].flatMap((index, end) => {
      duplexPose(index, count, spec, CLOSED, a, b);
      const shift = end === 0 ? -0.55 : 0.55;
      return [
        { text: upper[end], position: [a.p.x + shift, a.p.y, a.p.z] as const },
        { text: lower[end], position: [b.p.x + shift, b.p.y, b.p.z] as const },
      ];
    });
  }, [count, upper, lower]);
  return <>{tags.map((tag, index) => <TextLabel key={index} text={tag.text} height={0.24} position={tag.position} />)}</>;
}

function StructureScene({ bench, flankCoding }: { bench: GeneBench; flankCoding: DnaBase[] }) {
  const lower = useMemo(() => flankCoding.map(pairDna), [flankCoding]);
  const spinning = bench.spin && !bench.ruler;
  // Upright helix (axis vertical, 5' end of the coding strand at the bottom), as in textbook figures.
  return <group rotation={[0, 0, Math.PI / 2]}>
    <DnaDuplex3D structure={config.structure} upper={flankCoding} lower={lower} labels={bench.labels} spin={spinning} representation={bench.representation} />
    {!spinning && <DuplexEnds count={flankCoding.length} />}
    {bench.ruler && <AngstromRuler3D structure={config.structure} count={flankCoding.length} />}
  </group>;
}

function ReplicationScene({ evidence, bench, coding, template }: { evidence: GeneEvidence; bench: GeneBench; coding: DnaBase[]; template: DnaBase[] }) {
  const { length, forkAt, fillFrom, fillCount } = config.replication;
  const parentUpper = coding.slice(0, length), parentLower = template.slice(0, length);
  const phase = bench.replicationPhase;
  const upperY = 2.35, lowerY = -2.35;
  const span: OpenSpan = phase >= 1 ? { from: forkAt, to: length + 6, amount: 1, upper: upperY, lower: lowerY } : CLOSED;
  // New strand on the lower template holds the learner's bases; its twin on the upper template mirrors progress.
  const learnerNew = useMemo(() => parentLower.map((_, index) => (index >= fillFrom && index < fillFrom + fillCount ? evidence.replication.newStrand[index - fillFrom] : null)), [parentLower, evidence.replication.newStrand, fillFrom, fillCount]);
  const twinNew = useMemo(() => learnerNew.map((base, index) => (base ? pairDna(parentUpper[index]) : null)), [learnerNew, parentUpper]);
  const lowerLayout = useEasedLayout(useCallback((index: number, out: NucleotidePose) => { out.p.set(axisX(index, length, spec), lowerY + CHORD, 0); out.d.copy(DOWN); }, [length]));
  const upperLayout = useEasedLayout(useCallback((index: number, out: NucleotidePose) => { out.p.set(axisX(index, length, spec), upperY - CHORD, 0); out.d.copy(UP); }, [length]));
  const spawnBelow = useCallback((index: number, out: THREE.Vector3) => { out.set(axisX(index, length, spec) + 1.6, lowerY - 2.8, 2.6); }, [length]);
  const spawnAbove = useCallback((index: number, out: THREE.Vector3) => { out.set(axisX(index, length, spec) + 1.6, upperY + 2.8, 2.6); }, [length]);
  const placed = filledCount(evidence.replication.newStrand);
  const polymeraseX = axisX(Math.min(fillFrom + placed, length - 1), length, spec);
  const forkX = axisX(forkAt, length, spec) - 0.15;

  if (phase === 3) {
    // Daughter B keeps the learner's bases in the filled stretch; the enzymes complete the rest.
    const newUpper = parentUpper.map((base, index) => (index >= fillFrom && index < fillFrom + fillCount ? evidence.replication.newStrand[index - fillFrom] ?? base : base));
    return <group>
      <Follow from={[0, 1.2, 0]} position={[0, 2.7, -0.4]} lambda={2.4}>
        <DnaDuplex3D structure={config.structure} upper={parentUpper} lower={parentLower} tints={["parent", "new"]} labels={bench.labels} />
      </Follow>
      <Follow from={[0, -1.2, 0]} position={[0, -2.7, 0.4]} lambda={2.4}>
        <DnaDuplex3D structure={config.structure} upper={newUpper} lower={parentLower} tints={["new", "parent"]} labels={bench.labels} />
      </Follow>
    </group>;
  }
  return <group>
    <DnaDuplex3D structure={config.structure} upper={parentUpper} lower={parentLower} span={span} labels={bench.labels} />
    {phase === 0 && <DuplexEnds count={length} />}
    {phase >= 1 && <>
      <NucleotideStrand3D bases={learnerNew} tint="new" labels={bench.labels} layout={lowerLayout} spawn={spawnBelow} />
      <NucleotideStrand3D bases={twinNew} tint="new" labels={bench.labels} layout={upperLayout} spawn={spawnAbove} />
      <Follow from={[forkX - 3, 0, 0]} position={[forkX, 0, 0]}>
        <Enzyme3D seed={21} radius={0.95} stretch={[0.72, 1.3, 1.3]} color={ENZYME.helicase} opacity={0.5} />
      </Follow>
      <Follow from={[polymeraseX + 2, lowerY - 2, 1]} position={[polymeraseX, lowerY + CHORD / 2 - 0.15, 0.2]}>
        <Enzyme3D seed={44} radius={0.82} stretch={[1.15, 0.95, 1]} color={ENZYME.polymerase} opacity={0.42} groove={0.18} />
      </Follow>
      <Follow from={[polymeraseX + 2, upperY + 2, 1]} position={[polymeraseX, upperY - CHORD / 2 + 0.15, 0.2]}>
        <Enzyme3D seed={45} radius={0.82} stretch={[1.15, 0.95, 1]} color={ENZYME.polymerase} opacity={0.42} groove={0.18} />
      </Follow>
    </>}
  </group>;
}

function TranscriptionScene({ evidence, bench, coding, template }: { evidence: GeneEvidence; bench: GeneBench; coding: DnaBase[]; template: DnaBase[] }) {
  const count = coding.length;
  const mrna = evidence.transcription.mrna;
  const progress = filledCount(mrna);
  const done = progress >= count;
  const upperY = 2.9, lowerY = -1.6, hybridY = lowerY + CHORD;
  const span: OpenSpan = done ? CLOSED : progress === 0
    ? { from: 0, to: 3, amount: 0.75, upper: upperY, lower: lowerY }
    : { from: Math.max(0, progress - 6), to: Math.min(count - 1, progress + 1), amount: 1, upper: upperY, lower: lowerY };
  const exit = Math.max(0, progress - 6);
  const layout = useEasedLayout(useCallback((index: number, out: NucleotidePose) => {
    if (done) { out.p.set(axisX(index, count, spec), 3.9, 0.6); out.d.copy(DOWN); return; }
    if (index >= exit) { out.p.set(axisX(index, count, spec), hybridY, 0); out.d.copy(DOWN); return; }
    // Behind the polymerase the transcript peels away from the template.
    const k = exit - index;
    out.p.set(axisX(exit, count, spec) - 0.26 * k, hybridY + 0.5 * Math.pow(k, 0.92), 0.45 + 0.16 * k);
    out.d.set(0, -0.75, 0.66).normalize();
  }, [done, exit, count, hybridY]), 3.2);
  const spawn = useCallback((index: number, out: THREE.Vector3) => { out.set(axisX(index, count, spec) + 2.2, hybridY - 3.2, 2.8); }, [count, hybridY]);
  const polymeraseX = axisX(Math.min(progress, count - 1), count, spec) + 0.2;
  return <group>
    <DnaDuplex3D structure={config.structure} upper={coding} lower={template} span={span} labels={bench.labels} />
    <DuplexEnds count={count} />
    <NucleotideStrand3D bases={mrna} tint="rna" labels={bench.labels} layout={layout} spawn={spawn} />
    <Follow from={[polymeraseX - 3, -2.4, 1.4]} position={done ? [axisX(count - 1, count, spec) + 3.6, -2.8, -1.2] : [polymeraseX, -0.25, 0.05]} scale={done ? 0.8 : 1} lambda={3}>
      <Enzyme3D seed={7} radius={1.3} stretch={[1.35, 1.05, 1]} color={ENZYME.rnaPolymerase} opacity={0.45} groove={0.26} />
    </Follow>
  </group>;
}

function TranslationScene({ evidence, bench }: { evidence: GeneEvidence; bench: GeneBench }) {
  const mrna = evidence.transcription.mrna;
  const count = mrna.length;
  const complete = mrna.every((base) => base !== null);
  const chain = chosenChain(evidence);
  const done = chain[chain.length - 1] === "Stop";
  const residues = chain.filter((meaning): meaning is AminoAcid => meaning !== "Stop");
  const k = chain.length;
  const codonX = (codon: number) => axisX(codon * 3 + 1, count, spec);
  const codonOf = (codon: number) => mrna.slice(codon * 3, codon * 3 + 3) as RnaBase[];
  const pSite = Math.max(0, Math.min(k - 1, count / 3 - 1));
  const ribosomeX = codonX(done ? k - 1 : pSite);
  const layout = useEasedLayout(useCallback((index: number, out: NucleotidePose) => { out.p.set(axisX(index, count, spec), 0, 0); out.d.copy(UP); }, [count]));
  const trnaY = 0.2 + 0.72 + 0.42;
  const anchor: [number, number, number] = [ribosomeX + 0.95, trnaY + 2.43, 0];
  return <group>
    <NucleotideStrand3D bases={mrna} tint="rna" labels={bench.labels} layout={layout} />
    <TextLabel text="5'" height={0.24} position={[axisX(0, count, spec) - 0.55, 0, 0]} />
    <TextLabel text="3'" height={0.24} position={[axisX(count - 1, count, spec) + 0.55, 0, 0]} />
    {complete && <>
      <Follow position={[ribosomeX, 0, 0]} lambda={2.8}>
        <Ribosome3D codonLength={RISE * 3} assembled={k >= 1 && !done} showSites={bench.labels} />
      </Follow>
      {!done && k < count / 3 && <mesh position={[codonX(k), 0.55, -0.3]}>
        <boxGeometry args={[RISE * 3 - 0.06, 1.25, 0.04]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
      </mesh>}
      {k >= 1 && !done && <Follow key={`p-${pSite}`} from={[codonX(pSite) + 2.6, 5.2, 2.6]} position={[codonX(pSite), trnaY, 0]} scale={0.85} lambda={3.2}>
        <Trna3D anticodon={codonOf(pSite).map((base) => RNA_PAIR[base])} aminoAcid={null} rise={RISE / 0.85} labels={bench.labels} />
      </Follow>}
      {k >= 2 && <Follow key={`e-${k - 2}`} from={[codonX(k - 2), trnaY, 0]} position={[codonX(k - 2) - 2.4, trnaY + 3.6, -2.2]} scale={0.02} lambda={1.6}>
        <Trna3D anticodon={codonOf(k - 2).map((base) => RNA_PAIR[base])} aminoAcid={null} rise={RISE / 0.85} labels={false} />
      </Follow>}
      {residues.length > 0 && <Follow position={done ? [anchor[0] + 1.2, anchor[1] + 2.2, 0.6] : anchor} lambda={done ? 1.4 : 2.8}>
        <Polypeptide3D chain={residues} labels={bench.labels} />
      </Follow>}
    </>}
  </group>;
}

function MutationScene({ bench, molecules }: { bench: GeneBench; molecules: ReturnType<typeof geneMolecules> }) {
  const upper = bench.mutated ? molecules.mutated : molecules.coding;
  const lower = bench.mutated ? molecules.mutatedTemplate : molecules.template;
  const mrna = bench.mutated ? molecules.mutatedMrna : molecules.coding.map(toRna);
  const count = upper.length;
  const position = molecules.variant.mutation.position;
  const layout = useEasedLayout(useCallback((index: number, out: NucleotidePose) => { out.p.set(axisX(index, count, spec), -2.9, 0); out.d.copy(UP); }, [count]));
  const codonCentre = axisX(molecules.mutatedCodonIndex * 3 + 1, count, spec);
  return <group>
    <group position={[0, 1.5, 0]}>
      <DnaDuplex3D structure={config.structure} upper={upper} lower={lower} labels={bench.labels} highlight={{ strand: "upper", index: position, color: "#ff9a4d" }} />
      <DuplexEnds count={count} />
    </group>
    <NucleotideStrand3D bases={mrna} tint="rna" labels={bench.labels} layout={layout} />
    <mesh position={[codonCentre, -2.35, -0.3]}>
      <boxGeometry args={[RISE * 3 - 0.06, 1.25, 0.04]} />
      <meshBasicMaterial color="#ff9a4d" transparent opacity={bench.mutated ? 0.32 : 0.14} depthWrite={false} toneMapped={false} />
    </mesh>
    <TextLabel text="mRNA" height={0.26} position={[axisX(0, count, spec) - 1.1, -2.9, 0]} />
  </group>;
}

function Arrow({ from, to }: { from: number; to: number }) {
  const length = to - from;
  return <group position={[from, 0, 0]}>
    <mesh position={[length / 2 - 0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, length - 0.4, 12]} /><meshStandardMaterial color="#d7e7ee" roughness={0.4} /></mesh>
    <mesh position={[length - 0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.22, 0.45, 18]} /><meshStandardMaterial color="#d7e7ee" roughness={0.4} /></mesh>
  </group>;
}

function ConclusionScene({ evidence, molecules }: { evidence: GeneEvidence; molecules: ReturnType<typeof geneMolecules> }) {
  const t = geneText();
  const count = molecules.coding.length;
  const mrna = evidence.transcription.mrna.some((base) => base) ? evidence.transcription.mrna : molecules.coding.map(toRna);
  const layout = useEasedLayout(useCallback((index: number, out: NucleotidePose) => { out.p.set(axisX(index, count, spec), 0, 0); out.d.copy(UP); }, [count]));
  const residues = chosenChain(evidence).filter((meaning): meaning is AminoAcid => meaning !== "Stop");
  return <group>
    <group position={[-8.2, 0, 0]} scale={0.8}>
      <DnaDuplex3D structure={config.structure} upper={molecules.coding} lower={molecules.template} />
      <TextLabel text={t.flowNames.dna} height={0.5} position={[0, 2.6, 0]} />
    </group>
    <Arrow from={-5.1} to={-3.2} />
    <group scale={0.8}>
      <NucleotideStrand3D bases={mrna} tint="rna" layout={layout} />
      <TextLabel text={t.flowNames.mrna} height={0.5} position={[0, 2.6, 0]} />
    </group>
    <Arrow from={3.2} to={5.1} />
    <group position={[7.6, -1.2, 0]}>
      {residues.length > 0 && <group position={[-0.6, 0, 0]}><Polypeptide3D chain={residues} labels={false} /></group>}
      <group position={[0.9, 1.4, -0.6]}><Enzyme3D seed={503} radius={1.25} color="#e8b45a" opacity={0.7} /></group>
      <TextLabel text={t.flowNames.protein} height={0.5} position={[0.4, 3.8, 0]} />
    </group>
  </group>;
}

/**
 * FL-27 molecular scene: the same station state as the 2D diagram, shown with
 * K7 molecules. Motion only presents what the learner has already chosen or
 * the pinned gene; no answer is checked here.
 */
export function GeneProtein3DStage({ station, evidence, bench, entering = false }: { station: StationId; evidence: GeneEvidence; bench: GeneBench; entering?: boolean }) {
  const molecules = useMemo(() => geneMolecules(evidence.variantId), [evidence.variantId]);
  const flankCoding = useMemo(() => [...molecules.coding, ...parseDna(config.helixFlank)], [molecules]);
  const building = station === "replication"
    ? bench.replicationPhase > 0 && bench.replicationPhase < 3
    : station === "transcription" && evidence.transcription.mrna.some((base) => base === null);
  return <MolecularStage view={VIEWS[station]} ambient={station === "structure" && bench.spin && !bench.ruler} viewResetSignal={bench.viewReset} entering={entering} pool={building ? POOLS[station] : null}>
    {station === "structure" && <StructureScene bench={bench} flankCoding={flankCoding} />}
    {station === "replication" && <ReplicationScene evidence={evidence} bench={bench} coding={molecules.coding} template={molecules.template} />}
    {station === "transcription" && <TranscriptionScene evidence={evidence} bench={bench} coding={molecules.coding} template={molecules.template} />}
    {station === "translation" && <TranslationScene evidence={evidence} bench={bench} />}
    {station === "mutation" && <MutationScene bench={bench} molecules={molecules} />}
    {station === "conclusion" && <ConclusionScene evidence={evidence} molecules={molecules} />}
  </MolecularStage>;
}
