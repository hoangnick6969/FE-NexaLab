/**
 * `/labs/:id` page of kit `k7-molecular` (FL-27). Story K7-FL27 of the Explore backlog: "tạo đột biến điểm tự do và
 * xem codon/amino acid đổi", state `dnaTemplate`, `mRna`, `polypeptide[]`, `mutation{ index, from, to }`. The Guided
 * gene-protein Lab walks replication → transcription → translation with one fixed mutation and a rubric; here:
 * - Biến thể mẫu: the released variants (the same four the Guided conclusion station uses), side by side.
 * - Tự tạo đột biến: the student picks any base between the start and stop codons of a released gene and swaps it for
 *   any other base; every try lands in a comparison table so they can look for a pattern (third codon position…).
 * Every base, codon and amino acid comes from `gene-expression@1.0.0` (`complementDna`, `transcribe`, `translate`,
 * `classifySubstitution`). 3D reuses the K7 molecules (`MolecularStage`, `DnaDuplex3D`, `NucleotideStrand3D`,
 * `Polypeptide3D`); 2D is the K7 sequence diagram. One point substitution at a time, one reading frame.
 */
import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { MolecularExploreConfig } from "@nexalab/sim/explore-kits";
import { fl27VariantResult } from "@nexalab/sim/explore-kits";
import { GENE_DNA_BASES, classifySubstitution, complementDna, transcribe, translate, type CodonMeaning, type GeneDnaBase, type MutationEffect } from "@nexalab/sim/gene-expression";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabHeaderSlot } from "../../shared/LabSpace";
import { LabRendererToggle } from "../../shared/LabRendererToggle";
import { ExploreBenchShell, canUseWebgl } from "../../shared/explore/ExploreBenchShell";
import { ExploreStations, type ExploreStation } from "../../shared/explore/ExploreStations";
import { useCarryChip } from "../../shared/explore/carry-chip";
import {
  DnaDuplex3D, MolecularStage, NucleotideStrand3D, Polypeptide3D, SequenceDiagram2D, TextLabel, axisX, helixSpec, useEasedLayout,
  type AminoAcid, type DiagramBracket, type DiagramSlotTargets, type DiagramTrack, type DnaBase, type MolecularView, type NucleotidePose, type RnaBase,
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
/** Editor station: the camera closes in on the DNA (about 4,9 nm wide here) so each base is a target the student can hit. */
const VIEW_DNA: MolecularView = { position: [-8.2, 0.9, 7], target: [-8.2, 0, 0], fitWidth: 6.2, minDistance: 3, maxDistance: 56 };
const MUTATION_COLOR = "#ef4444";
const PICK_COLOR = "#f59e0b";

/**
 * Direct manipulation on the strand (3D and 2D): click a base of the coding strand to select it, or drop a base carried
 * from the floating tray on it. `pickable` is false for the start and stop codons.
 */
type StrandTargets = {
  pickable: (index: number) => boolean;
  onPick: (index: number) => void;
  onDrop: (index: number) => void;
  selected: number | null;
  carrying: boolean;
};

type StationId = "variants" | "editor";
const STATIONS: ReadonlyArray<ExploreStation<StationId>> = [
  { id: "variants", label: "Biến thể mẫu", hint: "Bốn biến thể đã duyệt: mỗi biến thể thay một base. So sánh kết quả của chúng." },
  { id: "editor", label: "Tự tạo đột biến", hint: "Chọn bất kỳ base nào giữa codon mở đầu và codon kết thúc, thay bằng base khác và xem protein đổi ra sao. Mỗi lần thử được ghi vào bảng so sánh." },
];

/** A gene with at most one substituted base, worked out with the released gene model. */
type GeneState = {
  geneId: string;
  original: GeneDnaBase[];
  coding: GeneDnaBase[];
  position: number | null;
  codons: string[];
  originalChain: CodonMeaning[];
  chain: CodonMeaning[];
  codonIndex: number | null;
  effect: MutationEffect | null;
};

function geneState(geneId: string, original: GeneDnaBase[], position: number | null, to: GeneDnaBase | null): GeneState {
  const coding = original.map((base, index) => (index === position && to ? to : base));
  const originalChain = translate(transcribe(complementDna(original)));
  const mrna = transcribe(complementDna(coding));
  const chain = translate(mrna);
  const codons = Array.from({ length: Math.floor(mrna.length / 3) }, (_, index) => mrna.slice(index * 3, index * 3 + 3).join(""));
  const changed = position !== null && to !== null && to !== original[position];
  const codonIndex = changed ? Math.floor(position! / 3) : null;
  const effect = codonIndex === null ? null : classifySubstitution(originalChain[codonIndex], CODON_MEANING(codons[codonIndex]));
  return { geneId, original, coding, position: changed ? position : null, codons, originalChain, chain, codonIndex, effect };
}
/** The meaning of one mRNA codon, read with the model's own `translate`. */
const CODON_MEANING = (codon: string) => translate([...codon] as RnaBase[])[0];

function Arrow({ from, to }: { from: number; to: number }) {
  const length = to - from;
  return <group position={[from, 0, 0]}>
    <mesh position={[length / 2 - 0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, length - 0.4, 12]} /><meshStandardMaterial color="#d7e7ee" roughness={0.4} /></mesh>
    <mesh position={[length - 0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.22, 0.45, 18]} /><meshStandardMaterial color="#d7e7ee" roughness={0.4} /></mesh>
  </group>;
}

const residuesOf = (chain: readonly CodonMeaning[]) => {
  const stop = chain.indexOf("Stop");
  return (stop === -1 ? chain : chain.slice(0, stop)) as AminoAcid[];
};

/** DNA → mRNA → polypeptide of the gene; the substituted base glows on the DNA. */
function GeneFlow3D({ gene, targets, focusDna = false }: { gene: GeneState; targets?: StrandTargets; focusDna?: boolean }) {
  const mrna = transcribe(complementDna(gene.coding)) as RnaBase[];
  const dropped = useRef(false);
  const [hover, setHover] = useState<number | null>(null);
  const highlight = gene.position !== null ? { strand: "upper" as const, index: gene.position, color: MUTATION_COLOR }
    : targets && (hover ?? targets.selected) !== null ? { strand: "upper" as const, index: (hover ?? targets.selected)!, color: PICK_COLOR } : undefined;
  const count = mrna.length;
  const residues = residuesOf(gene.chain);
  const layout = useEasedLayout(useCallback((index: number, out: NucleotidePose) => { out.p.set(axisX(index, count, spec), 0, 0); out.d.copy(UP); }, [count]));
  return <MolecularStage view={focusDna ? VIEW_DNA : VIEW}>
    <group>
      <group position={[-8.2, 0, 0]} scale={0.8}>
        <DnaDuplex3D structure={fl27GeneConfig.structure} upper={gene.coding as DnaBase[]} lower={complementDna(gene.coding) as DnaBase[]} labels
          highlight={highlight} />
        {targets && gene.coding.map((_, index) => targets.pickable(index) && <mesh key={index} position={[axisX(index, gene.coding.length, spec), 0, 0]}
          onPointerOver={(event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHover(index); document.body.style.cursor = targets.carrying ? "copy" : "pointer"; }}
          onPointerOut={() => { setHover((current) => (current === index ? null : current)); document.body.style.cursor = ""; }}
          onPointerUp={(event: ThreeEvent<PointerEvent>) => { if (targets.carrying) { event.stopPropagation(); dropped.current = true; window.setTimeout(() => { dropped.current = false; }, 0); targets.onDrop(index); } }}
          onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (dropped.current) { dropped.current = false; return; } targets.onPick(index); }}>
          <boxGeometry args={[spec.rise * 0.96, 2.6, 2.6]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>)}
        <TextLabel text={gene.position === null ? "DNA (gene gốc)" : "DNA (gene sau đột biến)"} height={0.5} position={[0, 2.6, 0]} />
      </group>
      <Arrow from={-5.1} to={-3.2} />
      <group scale={0.8}>
        <NucleotideStrand3D bases={mrna} tint="rna" labels layout={layout} />
        <TextLabel text="mRNA" height={0.5} position={[0, 2.6, 0]} />
      </group>
      <Arrow from={3.2} to={5.1} />
      <group position={[7.6, -1.2, 0]}>
        {residues.length > 0 && <group position={[-0.6, 0, 0]}><Polypeptide3D chain={residues} labels /></group>}
        <TextLabel text={`Chuỗi polypeptide · ${residues.length} axit amin`} height={0.5} position={[0.4, 3.8, 0]} />
      </group>
    </group>
  </MolecularStage>;
}

function GeneDiagram2D({ gene, targets }: { gene: GeneState; targets?: StrandTargets }) {
  // A drop is a pointer-up on a base; the click that follows must not re-select (and so undo) it.
  const dropped = useRef(false);
  const template = complementDna(gene.coding) as DnaBase[];
  const mrna = transcribe(template) as RnaBase[];
  const marks = gene.position === null ? [] : [gene.position];
  const tracks: DiagramTrack[] = [
    { id: "coding", row: 0, bases: gene.coding as DnaBase[], tint: "parent", ends: ["5'", "3'"], label: "Mạch bổ sung", marks },
    { id: "template", row: 2, bases: template, tint: "parent", ends: ["3'", "5'"], label: "Mạch khuôn", marks },
    { id: "mrna", row: 3.9, bases: mrna, tint: "rna", ends: ["5'", "3'"], label: "mRNA", marks },
  ];
  const brackets: DiagramBracket[] = gene.codons.map((codon, index) => ({
    track: "mrna", from: index * 3, to: index * 3 + 2,
    label: index === gene.codonIndex ? `${CODON_MEANING(codon)} (đột biến)` : String(CODON_MEANING(codon)),
  }));
  return <SequenceDiagram2D title={`Gene ${gene.geneId}: DNA, mRNA và chuỗi axit amin`} slots={gene.coding.length} rows={6.6}
    tracks={tracks} pairings={[{ upper: "coding", lower: "template", from: 0, to: gene.coding.length - 1 }]}
    brackets={brackets} chains={[{ slot: 0, row: 5.6, residues: residuesOf(gene.chain) }]}
    targets={targets ? { track: "coding", pickable: targets.pickable,
      onPick: (index) => { if (dropped.current) { dropped.current = false; return; } targets.onPick(index); },
      onDrop: (index) => { if (targets.carrying) { dropped.current = true; window.setTimeout(() => { dropped.current = false; }, 0); targets.onDrop(index); } }, selected: targets.selected,
      label: (index) => `Base ${index + 1} trên mạch bổ sung: ${gene.coding[index]}${targets.carrying ? ", thả base đang cầm vào đây" : ", bấm để chọn"}` } satisfies DiagramSlotTargets : undefined} />;
}

type Trial = { key: string; geneId: string; position: number; from: GeneDnaBase; to: GeneDnaBase; before: string; after: string; aaBefore: CodonMeaning; aaAfter: CodonMeaning; effect: MutationEffect; length: number };
const MAX_TRIALS = 12;

export default function MolecularExplorePage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as MolecularExploreConfig;
  const variants = config.spec.allowedVariants;
  // The released genes the editor may change: one per distinct coding sequence of the allowed variants.
  const genes = useMemo(() => {
    const seen = new Map<string, { id: string; coding: GeneDnaBase[] }>();
    for (const id of variants) {
      const { gene } = fl27VariantResult(id);
      if (!seen.has(gene.coding)) seen.set(gene.coding, { id: id.startsWith("gene-a") ? "A" : id.startsWith("gene-b") ? "B" : String(seen.size + 1), coding: [...gene.coding] as GeneDnaBase[] });
    }
    return [...seen.values()];
  }, [variants]);
  const [station, setStation] = useState<StationId>("variants");
  const [variant, setVariant] = useState<string>(variants[0]);
  const [geneIndex, setGeneIndex] = useState(0);
  const [position, setPosition] = useState<number | null>(null);
  const [to, setTo] = useState<GeneDnaBase | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [can3d] = useState(canUseWebgl);
  const [view, setView] = useState<"3d" | "2d">(can3d ? "3d" : "2d");
  const shown = can3d ? view : "2d";
  const toggle = can3d ? <LabHeaderSlot><LabRendererToggle mode={shown} onChange={setView} /></LabHeaderSlot> : null;

  const preset = fl27VariantResult(variant);
  const presetGene = useMemo(() => geneState(`${variant.startsWith("gene-a") ? "A" : "B"} · ${variant}`, [...preset.gene.coding] as GeneDnaBase[], preset.mutation.position, preset.mutation.to), [variant]);
  const editable = genes[geneIndex];
  const editorGene = useMemo(() => geneState(editable.id, editable.coding, position, to), [editable, position, to]);
  const gene = station === "variants" ? presetGene : editorGene;
  // Start and stop codons stay: the model's genes always open with ATG and close with one stop codon.
  const editableAt = (index: number) => index >= 3 && index < editable.coding.length - 3;

  const [carried, setCarried] = useState<GeneDnaBase | null>(null);
  useCarryChip(carried, () => setCarried(null), "explore-carry-chip molecular-carry-chip", carried ? { base: carried } : undefined);
  const pickBase = (index: number) => { if (!editableAt(index)) return; setPosition(index); setTo(null); };
  const applyBase = (base: GeneDnaBase) => applyAt(position, base);
  const applyAt = (at: number | null, base: GeneDnaBase) => {
    if (at === null || !editableAt(at)) return;
    if (base === editable.coding[at]) { setPosition(at); setTo(null); return; }
    setPosition(at);
    setTo(base);
    const position = at;
    const next = geneState(editable.id, editable.coding, position, base);
    const codonIndex = next.codonIndex!;
    const before = transcribe(complementDna(editable.coding)).slice(codonIndex * 3, codonIndex * 3 + 3).join("");
    const trial: Trial = { key: `${editable.id}:${position}:${base}`, geneId: editable.id, position, from: editable.coding[position], to: base, before, after: next.codons[codonIndex],
      aaBefore: next.originalChain[codonIndex], aaAfter: CODON_MEANING(next.codons[codonIndex]), effect: next.effect!, length: residuesOf(next.chain).length };
    setTrials((prev) => [trial, ...prev.filter((item) => item.key !== trial.key)].slice(0, MAX_TRIALS));
  };

  /** Click or drop on the strand. On the variants station a click opens the editor on that gene and base. */
  const strandTargets: StrandTargets = {
    pickable: (index) => index >= 3 && index < gene.coding.length - 3,
    onPick: (index) => {
      if (station === "variants") {
        const at = genes.findIndex((item) => item.coding.join("") === preset.gene.coding);
        if (at >= 0) setGeneIndex(at);
        setStation("editor");
        setPosition(index);
        setTo(null);
        return;
      }
      if (carried) { applyAt(index, carried); setCarried(null); } else pickBase(index);
    },
    onDrop: (index) => { if (carried && station === "editor") { applyAt(index, carried); setCarried(null); } },
    selected: station === "editor" ? position : null,
    carrying: Boolean(carried),
  };
  const takeBase = (base: GeneDnaBase, event: ReactPointerEvent) => {
    event.preventDefault();
    (event.currentTarget as Element).releasePointerCapture?.(event.pointerId);
    // With a base already selected, a plain click on the tray swaps it straight away; otherwise the base is carried.
    setCarried((current) => (current === base ? null : base));
  };
  const tray = station === "editor" && <div className="molecular-tray" role="group" aria-label="Khay base: kéo một base thả vào mạch DNA" data-testid="base-tray">
    <span>Kéo base vào mạch</span>
    {GENE_DNA_BASES.map((base) => <button type="button" key={base} className="molecular-tray-base" data-base={base} aria-pressed={carried === base}
      data-testid={`tray-${base}`} onPointerDown={(event) => takeBase(base, event)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (position !== null) applyAt(position, base); } }}>{base}</button>)}
    {carried && <small>Đang cầm {carried} · Esc để bỏ</small>}
  </div>;

  const codonStrip = <ol className="molecular-codons" aria-label="Codon của mRNA">
    {gene.codons.map((codon, index) => <li key={index} data-mutated={index === gene.codonIndex}>
      <span className="explore-mono">{codon}</span>
      <small>{CODON_MEANING(codon)}</small>
    </li>)}
  </ol>;
  const effectBadge = gene.effect
    ? <span className="explore-status" data-tone={EFFECT_TONE[gene.effect]} data-testid="mutation-effect-badge">{EFFECT_VI[gene.effect]}</span>
    : <span className="explore-status" data-tone="info">gene gốc, chưa đột biến</span>;

  const scene = shown === "3d"
    ? <>
        {toggle}
        <GeneFlow3D gene={gene} targets={strandTargets} focusDna={station === "editor"} />
        {tray}
        <div className="explore-overlay molecular-overlay" data-testid="molecular-page">
          <h2>DNA → mRNA → chuỗi polypeptide · {gene.effect ? EFFECT_VI[gene.effect] : "gene gốc"}</h2>
          <p className="explore-field-hint">{station === "editor" ? "Bấm một base trên mạch DNA để chọn, hoặc kéo A/T/G/C từ khay thả vào mạch." : "Bấm một base trên mạch DNA để tự tạo đột biến ở đó."}</p>
          {codonStrip}
        </div>
      </>
    : <div className="molecular-2d" data-testid="molecular-page">
        {toggle}
        <header className="explore-scene-head">
          <div><span className="explore-scene-eyebrow">Bàn phân tử · k7-molecular</span><h2>Từ gene đến protein: DNA → mRNA → chuỗi polypeptide</h2></div>
          {effectBadge}
        </header>
        {tray}
        <div className="molecular-diagram"><GeneDiagram2D gene={gene} targets={strandTargets} /></div>
        {codonStrip}
      </div>;

  const variantLabel = (id: string) => {
    const item = fl27VariantResult(id);
    return `Gene ${id.startsWith("gene-a") ? "A" : "B"} · vị trí ${item.mutation.position + 1}: ${item.mutation.from} → ${item.mutation.to}`;
  };
  const variantControls = <label className="explore-field">Biến thể gene (đột biến điểm)
    <select className="explore-select" value={variant} onChange={(event) => setVariant(event.target.value)} aria-label="Biến thể gene">
      {variants.map((id) => <option key={id} value={id}>{variantLabel(id)}</option>)}
    </select>
    <span className="explore-field-hint">Mỗi biến thể thay một base trên mạch bổ sung. Base bị thay được đánh dấu đỏ trên mạch.</span>
  </label>;

  const editorControls = <>
    {genes.length > 1 && <fieldset className="explore-chips">
      <legend>Gene</legend>
      {genes.map((item, index) => <button type="button" key={item.id} className="explore-chip" aria-pressed={index === geneIndex} onClick={() => { setGeneIndex(index); setPosition(null); setTo(null); }}>Gene {item.id}</button>)}
    </fieldset>}
    <fieldset className="molecular-editor" data-testid="gene-editor">
      <legend>1 · Chọn một base trên mạch bổ sung (5' → 3')</legend>
      <div className="molecular-editor-strand" role="group" aria-label="Mạch bổ sung của gene">
        {editable.coding.map((base, index) => {
          const locked = !editableAt(index);
          const current = editorGene.coding[index];
          return <button type="button" key={index} className="molecular-base" data-base={current} data-codon={Math.floor(index / 3) % 2} aria-pressed={position === index}
            data-mutated={editorGene.position === index || undefined} disabled={locked} onClick={() => pickBase(index)}
            aria-label={`Vị trí ${index + 1}: ${current}${locked ? " (codon mở đầu hoặc kết thúc, giữ nguyên)" : ""}`}>
            <span>{current}</span><small>{index + 1}</small>
          </button>;
        })}
      </div>
      <p className="explore-field-hint">Ba base đầu (ATG, codon mở đầu) và ba base cuối (codon kết thúc) được giữ nguyên.</p>
    </fieldset>
    <fieldset className="explore-chips" disabled={position === null}>
      <legend>2 · Thay bằng base{position !== null ? ` (vị trí ${position + 1}, đang là ${editable.coding[position]})` : ""}</legend>
      {GENE_DNA_BASES.map((base) => <button type="button" key={base} className="explore-chip explore-mono" aria-pressed={to === base}
        disabled={position === null || base === editable.coding[position]} onClick={() => applyBase(base)}>{base}</button>)}
    </fieldset>
    <button type="button" className="explore-btn explore-btn-secondary" disabled={position === null && !to} onClick={() => { setPosition(null); setTo(null); }}>Trả gene về bản gốc</button>
  </>;

  const controls = <>
    <ExploreStations stations={STATIONS} value={station} onChange={setStation} />
    {station === "variants" ? variantControls : editorControls}
  </>;

  const changeRow = gene.codonIndex !== null && gene.position !== null && <>
    <p data-testid="mutated-codon">Codon {gene.codonIndex + 1}: <b className="explore-mono">{transcribe(complementDna(gene.original)).slice(gene.codonIndex * 3, gene.codonIndex * 3 + 3).join("")} → {gene.codons[gene.codonIndex]}</b>, axit amin {gene.originalChain[gene.codonIndex]} → {CODON_MEANING(gene.codons[gene.codonIndex])}.</p>
    <p data-testid="mutation-effect">Vị trí {gene.position + 1}: {gene.original[gene.position]} → {gene.coding[gene.position]} ({gene.effect ? EFFECT_VI[gene.effect] : ""}). Chuỗi còn {residuesOf(gene.chain).length}/{residuesOf(gene.originalChain).length} axit amin.</p>
  </>;
  const trialTable = trials.length > 0 && <table className="explore-table" data-testid="mutation-trials">
    <caption className="explore-field-hint" style={{ textAlign: "left", captionSide: "top" }}>Bảng so sánh các lần thử (mới nhất ở trên)</caption>
    <thead><tr><th>Gene · vị trí</th><th>Base</th><th>Codon</th><th>Axit amin</th><th>Kết quả</th></tr></thead>
    <tbody>{trials.map((trial) => <tr key={trial.key}>
      <td>{trial.geneId} · {trial.position + 1} (vị trí {trial.position % 3 + 1} của codon)</td>
      <td className="explore-mono">{trial.from}→{trial.to}</td>
      <td className="explore-mono">{trial.before}→{trial.after}</td>
      <td>{trial.aaBefore}→{trial.aaAfter}</td>
      <td data-tone={trial.effect === "SILENT" ? "ok" : trial.effect === "NONSENSE" ? "warn" : undefined}>{EFFECT_VI[trial.effect]}</td>
    </tr>)}</tbody>
  </table>;

  const readout = <>
    {effectBadge}
    <dl>
      <dt>Chuỗi gốc</dt><dd>{residuesOf(gene.originalChain).join(" – ")}</dd>
      <dt>Chuỗi hiện tại</dt><dd>{residuesOf(gene.chain).join(" – ") || "(dừng ngay sau Met)"}</dd>
    </dl>
    {changeRow}
    {station === "editor" && (trialTable || <p className="explore-field-hint">Mỗi lần thay base sẽ thêm một dòng vào bảng so sánh. Thử thay base thứ ba của một codon, rồi base thứ nhất: kết quả có giống nhau không?</p>)}
  </>;

  const journalSummary = station === "variants"
    ? molecularSummary(variant)
    : gene.position !== null && gene.codonIndex !== null
      ? `Gene ${gene.geneId}: vị trí ${gene.position + 1} ${gene.original[gene.position]}→${gene.coding[gene.position]}, codon ${gene.codons[gene.codonIndex]}, axit amin ${gene.originalChain[gene.codonIndex]}→${CODON_MEANING(gene.codons[gene.codonIndex])} (${gene.effect})`
      : "";

  return <ExploreBenchShell labId={labId} activityId={activity.id} title={title || config.title} config={config} kitItems={molecularBench.listKitItems(config)}
    scene={scene} controls={controls} readout={readout} sceneKind={shown === "3d" ? "full" : "card"} testId="molecular-bench"
    journalSummary={journalSummary} canSave={journalSummary !== ""} saveHint="Thay một base để có đột biến cần ghi." />;
}
