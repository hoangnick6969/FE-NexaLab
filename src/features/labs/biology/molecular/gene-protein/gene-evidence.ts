import { z } from "zod";
import { CODON_MEANINGS, DNA_BASES, RNA_BASES, pairDna, parseDna, splitCodons, toRna, type CodonMeaning, type DnaBase, type RnaBase } from "../kit/k7-codons";
import { fl27GeneConfig, fl27Variant } from "./fl27-gene.config";

/**
 * FL-27 evidence draft. Its shape follows the proposed server evidence for
 * `gene-protein-stations@1` (plan §4.5); empty answers are null. The draft is
 * local recovery data until submitted, and the server recomputes every
 * expected sequence and the rubric. Nothing here marks an answer right or wrong.
 */
export const STATION_IDS = ["structure", "replication", "transcription", "translation", "mutation", "conclusion"] as const;
export type StationId = (typeof STATION_IDS)[number];
export const STAGES = ["UNWIND", "SYNTHESIZE", "COMPLETE"] as const;
export type Stage = (typeof STAGES)[number];
export const EFFECTS = ["SILENT", "MISSENSE", "NONSENSE"] as const;
export type Effect = (typeof EFFECTS)[number];
export const CHOICES = ["A", "B", "C"] as const;
export type Choice = (typeof CHOICES)[number];

const GENE_LENGTH = 18;
const CODONS = GENE_LENGTH / 3;
const nullable = <T extends z.ZodTypeAny>(schema: T) => schema.nullable();
const count = z.number().finite().nonnegative().nullable();

const evidenceSchema = z.object({
  variantId: z.string(),
  structure: z.object({ bpPerTurn: count, turnLengthA: count, riseA: count, diameterA: count, pairing: nullable(z.enum(CHOICES)) }).strict(),
  replication: z.object({
    stageOrder: z.array(nullable(z.enum(STAGES))).length(3),
    newStrand: z.array(nullable(z.enum(DNA_BASES))).length(fl27GeneConfig.replication.fillCount),
    semiConservative: nullable(z.enum(CHOICES)),
  }).strict(),
  transcription: z.object({ mrna: z.array(nullable(z.enum(RNA_BASES))).length(GENE_LENGTH) }).strict(),
  translation: z.object({
    aminoAcids: z.array(nullable(z.enum(CODON_MEANINGS as [CodonMeaning, ...CodonMeaning[]]))).length(CODONS),
    codonCombos: z.object({ n1: count, n2: count, n3: count }).strict(),
  }).strict(),
  mutation: z.object({ mutatedCodon: z.string().max(3), mutatedAminoAcid: nullable(z.enum(CODON_MEANINGS as [CodonMeaning, ...CodonMeaning[]])), effect: nullable(z.enum(EFFECTS)) }).strict(),
  conclusion: z.object({ flow: nullable(z.enum(CHOICES)), geneRole: nullable(z.enum(CHOICES)) }).strict(),
}).strict();

export type GeneEvidence = z.infer<typeof evidenceSchema>;

export const defaultGeneEvidence = (): GeneEvidence => ({
  variantId: fl27GeneConfig.variants[0].id,
  structure: { bpPerTurn: null, turnLengthA: null, riseA: null, diameterA: null, pairing: null },
  replication: { stageOrder: [null, null, null], newStrand: Array(fl27GeneConfig.replication.fillCount).fill(null), semiConservative: null },
  transcription: { mrna: Array(GENE_LENGTH).fill(null) },
  translation: { aminoAcids: Array(CODONS).fill(null), codonCombos: { n1: null, n2: null, n3: null } },
  mutation: { mutatedCodon: "", mutatedAminoAcid: null, effect: null },
  conclusion: { flow: null, geneRole: null },
});

/** Restores a stored draft; anything malformed starts again from an empty draft. */
export function geneEvidenceFrom(state: unknown): GeneEvidence {
  const parsed = evidenceSchema.safeParse(state);
  return parsed.success ? parsed.data : defaultGeneEvidence();
}

/** The server-chosen gene variant wins over the local draft; the preview has no run and keeps its own. */
export function applyRunPins(evidence: GeneEvidence, runtimeParams: Record<string, string | number> | null): GeneEvidence {
  const pinned = runtimeParams?.variantId;
  return typeof pinned === "string" && pinned !== evidence.variantId ? { ...defaultGeneEvidence(), variantId: pinned } : evidence;
}

/** Translation stops at the first codon the learner read as Stop. */
export function chosenChain(evidence: GeneEvidence) {
  const chain: CodonMeaning[] = [];
  for (const meaning of evidence.translation.aminoAcids) {
    if (!meaning) break;
    chain.push(meaning);
    if (meaning === "Stop") break;
  }
  return chain;
}

/** Leading bases placed so far (the polymerase position). */
export const filledCount = <T,>(values: readonly (T | null)[]) => {
  const first = values.indexOf(null);
  return first === -1 ? values.length : first;
};

export function stationDone(evidence: GeneEvidence, station: StationId): boolean {
  const filled = <T,>(values: readonly (T | null)[]) => values.every((value) => value !== null);
  switch (station) {
    case "structure": {
      const { bpPerTurn, turnLengthA, riseA, diameterA, pairing } = evidence.structure;
      return [bpPerTurn, turnLengthA, riseA, diameterA, pairing].every((value) => value !== null);
    }
    case "replication":
      return filled(evidence.replication.stageOrder) && filled(evidence.replication.newStrand) && evidence.replication.semiConservative !== null;
    case "transcription":
      return filled(evidence.transcription.mrna);
    case "translation": {
      const chain = chosenChain(evidence);
      const { n1, n2, n3 } = evidence.translation.codonCombos;
      return (chain[chain.length - 1] === "Stop" || chain.length === CODONS) && [n1, n2, n3].every((value) => value !== null);
    }
    case "mutation":
      return /^[AUGC]{3}$/.test(evidence.mutation.mutatedCodon) && evidence.mutation.mutatedAminoAcid !== null && evidence.mutation.effect !== null;
    case "conclusion":
      return evidence.conclusion.flow !== null && evidence.conclusion.geneRole !== null;
  }
}

export const geneEvidenceReady = (state: unknown) => {
  const evidence = geneEvidenceFrom(state);
  return STATION_IDS.every((station) => stationDone(evidence, station));
};

/**
 * Sequences of the pinned virtual gene for drawing: coding strand, its
 * template partner and the mutated coding strand. These describe the
 * molecules on screen; the learner's transcription and translation stay their own.
 */
export function geneMolecules(variantId: string) {
  const variant = fl27Variant(variantId);
  const coding = parseDna(variant.coding);
  const template = coding.map(pairDna);
  const mutated = coding.map((base, index) => (index === variant.mutation.position ? variant.mutation.to : base)) as DnaBase[];
  return {
    variant,
    coding,
    template,
    mutated,
    mutatedTemplate: mutated.map(pairDna),
    mutatedMrna: mutated.map(toRna) as RnaBase[],
    mutatedCodonIndex: Math.floor(variant.mutation.position / 3),
  };
}

export const codonsOf = (bases: readonly (RnaBase | null)[]) => splitCodons(bases);
export { GENE_LENGTH, CODONS };
