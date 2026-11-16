/**
 * `/labs/:id` page of kit `k7-molecular` (FL-27). The student picks a released gene variant; the bench shows the
 * mutated gene as DNA → mRNA → polypeptide, in 3D with the K7 molecules (`MolecularStage`, `DnaDuplex3D`,
 * `NucleotideStrand3D`, `Polypeptide3D`, as in the Guided conclusion station) or as the K7 2D sequence diagram
 * (`SequenceDiagram2D`). Every base, codon and amino acid comes from `gene-expression@1.0.0`. Explore only.
 */
import { useCallback, useMemo, useState } from "react";
import * as THREE from "three";
import type { MolecularExploreConfig } from "@nexalab/sim/explore-kits";
import { fl27VariantResult } from "@nexalab/sim/explore-kits";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabHeaderSlot } from "../../shared/LabSpace";
import { LabRendererToggle } from "../../shared/LabRendererToggle";
import { ExploreBenchShell, canUseWebgl } from "../../shared/explore/ExploreBenchShell";
import {
  DnaDuplex3D, MolecularStage, NucleotideStrand3D, Polypeptide3D, SequenceDiagram2D, TextLabel, axisX, helixSpec, parseDna, toRna, useEasedLayout,
  type AminoAcid, type DiagramBracket, type DiagramTrack, type DnaBase, type MolecularView, type NucleotidePose, type RnaBase,
} from "./kit";
import { fl27GeneConfig } from "./gene-protein/fl27-gene.config";
import { molecularBench, molecularSummary } from "./molecular-bench";
import "./kit/k7.css";
import "./molecular-explore.css";

const EFFECT_VI = { SILENT: "đột biến im lặng", MISSENSE: "đột biến sai nghĩa", NONSENSE: "đột biến vô nghĩa" } as const;
const EFFECT_TONE = { SILENT: "ok", MISSENSE: "info", NONSENSE: "warn" } as const;
const spec = helixSpec(fl27GeneConfig.structure);
const UP = new THREE.Vector3(0, 1, 0);
/** MolecularStage pulls back from here only as far as the subject (DNA → mRNA → chain, ~19 nm) needs beside the right column. */
const VIEW: MolecularView = { position: [0, 1.4, 10], target: [0, 0.3, 0], fitWidth: 23, minDistance: 6, maxDistance: 56 };
const MUTATION_COLOR = "#ef4444";

type Molecules = { coding: DnaBase[]; template: DnaBase[]; mrna: RnaBase[]; chain: AminoAcid[] };

/** The mutated gene after the variant's substitution, as the base arrays the K7 molecules draw. */
function mutatedMolecules(result: ReturnType<typeof fl27VariantResult>): Molecules {
  const coding = parseDna(result.gene.coding).map((base, index) => (index === result.mutation.position ? result.mutation.to : base)) as DnaBase[];
  const template = coding.map((base) => ({ A: "T", T: "A", G: "C", C: "G" } as const)[base]);
  const mrna = coding.map(toRna);
  const chain: AminoAcid[] = [];
  for (let index = 0; index + 3 <= mrna.length; index += 3) {
    const meaning = index / 3 === result.mutation.codonIndex ? result.mutation.aminoAcid : result.aminoAcids[index / 3];
    if (meaning === "Stop") break;
    chain.push(meaning as AminoAcid);
  }
  return { coding, template, mrna, chain };
}

function Arrow({ from, to }: { from: number; to: number }) {
  const length = to - from;
  return <group position={[from, 0, 0]}>
    <mesh position={[length / 2 - 0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, length - 0.4, 12]} /><meshStandardMaterial color="#d7e7ee" roughness={0.4} /></mesh>
    <mesh position={[length - 0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.22, 0.45, 18]} /><meshStandardMaterial color="#d7e7ee" roughness={0.4} /></mesh>
  </group>;
}

/** DNA → mRNA → polypeptide of the mutated gene; the substituted base glows on the DNA. */
function GeneFlow3D({ molecules, position }: { molecules: Molecules; position: number }) {
  const count = molecules.mrna.length;
  const layout = useEasedLayout(useCallback((index: number, out: NucleotidePose) => { out.p.set(axisX(index, count, spec), 0, 0); out.d.copy(UP); }, [count]));
  return <MolecularStage view={VIEW}>
    <group>
      <group position={[-8.2, 0, 0]} scale={0.8}>
        <DnaDuplex3D structure={fl27GeneConfig.structure} upper={molecules.coding} lower={molecules.template} highlight={{ strand: "upper", index: position, color: MUTATION_COLOR }} />
        <TextLabel text="DNA (gene sau đột biến)" height={0.5} position={[0, 2.6, 0]} />
      </group>
      <Arrow from={-5.1} to={-3.2} />
      <group scale={0.8}>
        <NucleotideStrand3D bases={molecules.mrna} tint="rna" labels layout={layout} />
        <TextLabel text="mRNA" height={0.5} position={[0, 2.6, 0]} />
      </group>
      <Arrow from={3.2} to={5.1} />
      <group position={[7.6, -1.2, 0]}>
        {molecules.chain.length > 0 && <group position={[-0.6, 0, 0]}><Polypeptide3D chain={molecules.chain} labels /></group>}
        <TextLabel text="Chuỗi polypeptide" height={0.5} position={[0.4, 3.8, 0]} />
      </group>
    </group>
  </MolecularStage>;
}

function GeneDiagram2D({ result, molecules }: { result: ReturnType<typeof fl27VariantResult>; molecules: Molecules }) {
  const { position, codonIndex } = result.mutation;
  const tracks: DiagramTrack[] = [
    { id: "coding", row: 0, bases: molecules.coding, tint: "parent", ends: ["5'", "3'"], label: "Mạch bổ sung", marks: [position] },
    { id: "template", row: 2, bases: molecules.template, tint: "parent", ends: ["3'", "5'"], label: "Mạch khuôn", marks: [position] },
    { id: "mrna", row: 3.9, bases: molecules.mrna, tint: "rna", ends: ["5'", "3'"], label: "mRNA", marks: [position] },
  ];
  const brackets: DiagramBracket[] = Array.from({ length: molecules.mrna.length / 3 }, (_, index) => ({
    track: "mrna", from: index * 3, to: index * 3 + 2,
    label: index === codonIndex ? `${result.mutation.aminoAcid} (đột biến)` : String(result.aminoAcids[index]),
  }));
  return <SequenceDiagram2D title={`Gene ${result.variantId} sau đột biến: DNA, mRNA và chuỗi axit amin`} slots={molecules.coding.length} rows={6.6}
    tracks={tracks} pairings={[{ upper: "coding", lower: "template", from: 0, to: molecules.coding.length - 1 }]}
    brackets={brackets} chains={[{ slot: 0, row: 5.6, residues: molecules.chain }]} />;
}

export default function MolecularExplorePage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as MolecularExploreConfig;
  const variants = config.spec.allowedVariants;
  const [variant, setVariant] = useState<string>(variants[0]);
  const [can3d] = useState(canUseWebgl);
  const [view, setView] = useState<"3d" | "2d">(can3d ? "3d" : "2d");
  const result = fl27VariantResult(variant);
  const { mutation } = result;
  const molecules = useMemo(() => mutatedMolecules(result), [variant]);
  const shown = can3d ? view : "2d";
  const toggle = can3d ? <LabHeaderSlot><LabRendererToggle mode={shown} onChange={setView} /></LabHeaderSlot> : null;
  const variantLabel = (id: string) => {
    const item = fl27VariantResult(id);
    return `Gene ${id.startsWith("gene-a") ? "A" : "B"} · vị trí ${item.mutation.position + 1}: ${item.mutation.from} → ${item.mutation.to}`;
  };

  const codonStrip = <ol className="molecular-codons" aria-label="Codon của mRNA sau đột biến">
    {result.codons.map((codon, index) => {
      const mutated = index === mutation.codonIndex;
      return <li key={index} data-mutated={mutated}>
        <span className="explore-mono">{mutated ? mutation.codon : codon}</span>
        <small>{mutated ? mutation.aminoAcid : result.aminoAcids[index]}</small>
      </li>;
    })}
  </ol>;

  const scene = shown === "3d"
    ? <>
        {toggle}
        <GeneFlow3D molecules={molecules} position={mutation.position} />
        <div className="explore-overlay molecular-overlay" data-testid="molecular-page">
          <h2>DNA → mRNA → chuỗi polypeptide · {EFFECT_VI[mutation.effect]}</h2>
          {codonStrip}
        </div>
      </>
    : <div className="molecular-2d" data-testid="molecular-page">
        {toggle}
        <header className="explore-scene-head">
          <div><span className="explore-scene-eyebrow">Bàn phân tử · k7-molecular</span><h2>Từ gene đến protein: DNA → mRNA → chuỗi polypeptide</h2></div>
          <span className="explore-status" data-tone={EFFECT_TONE[mutation.effect]}>{EFFECT_VI[mutation.effect]}</span>
        </header>
        <div className="molecular-diagram"><GeneDiagram2D result={result} molecules={molecules} /></div>
        {codonStrip}
      </div>;

  const controls = <label className="explore-field">Biến thể gene (đột biến điểm)
    <select className="explore-select" value={variant} onChange={(event) => setVariant(event.target.value)} aria-label="Biến thể gene">
      {variants.map((id) => <option key={id} value={id}>{variantLabel(id)}</option>)}
    </select>
    <span className="explore-field-hint">Mỗi biến thể thay một base trên mạch bổ sung. Base bị thay được đánh dấu đỏ trên mạch.</span>
  </label>;

  const readout = <>
    <span className="explore-status" data-tone={EFFECT_TONE[mutation.effect]}>{EFFECT_VI[mutation.effect]}</span>
    <dl>
      <dt>mRNA gốc</dt><dd><code>{result.mrna}</code></dd>
      <dt>Codon gốc</dt><dd className="explore-mono">{result.codons.join(" ")}</dd>
      <dt>Chuỗi gốc</dt><dd>{result.aminoAcids.join(" – ")}</dd>
    </dl>
    <p data-testid="mutated-codon">Codon sau đột biến (vị trí {mutation.codonIndex + 1}): <b className="explore-mono">{result.codons[mutation.codonIndex]} → {mutation.codon}</b> → {mutation.aminoAcid}</p>
    <p data-testid="mutation-effect">Vị trí {mutation.position + 1}: {mutation.from} → {mutation.to}. Axit amin {mutation.originalAminoAcid} → {mutation.aminoAcid} ({EFFECT_VI[mutation.effect]}).</p>
  </>;

  return <ExploreBenchShell labId={labId} activityId={activity.id} title={title || config.title} config={config} kitItems={molecularBench.listKitItems(config)}
    scene={scene} controls={controls} readout={readout} sceneKind={shown === "3d" ? "full" : "card"} testId="molecular-bench"
    journalSummary={molecularSummary(variant)} canSave />;
}
