import { z } from "zod";
// Deep imports keep this module free of three.js: the Lab registry loads it eagerly.
import { k7StructureSchema } from "../kit/k7-config";
import { DNA_BASES, codonTable, parseDna, splitCodons, toRna } from "../kit/k7-codons";

/**
 * FL-27 "Từ gene đến protein" sample configuration for development and the
 * K7 preview.
 *
 * PROPOSED_UNAPPROVED: helix numbers follow SGK KHTN 9 Bài 38, Hình 38.1
 * (10 base pairs per 34 Å turn, 20 Å across); real B-DNA has ~10.5 per turn
 * (plan §1 F8, D-4). Genes are short teaching sequences, not real genes. A
 * released Lab reads these values from its pinned pack, not from this file.
 */
const dna = z.string().regex(/^[ATGC]+$/);
const variantSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  /** Coding strand 5'→3': starts with ATG, ends with one stop codon. */
  coding: dna,
  /** Point substitution on the coding strand (0-based position). */
  mutation: z.object({ position: z.number().int().nonnegative(), to: z.enum(DNA_BASES) }).strict(),
}).strict();

export const fl27ConfigSchema = z.object({
  configVersion: z.literal(1),
  reviewStatus: z.enum(["PROPOSED_UNAPPROVED", "REVIEWED"]),
  structure: k7StructureSchema,
  /** Standard genetic code, 64 letters in TCAG order (NCBI translation table 1). */
  codeTable: z.string().length(64),
  /** Bases appended to the gene so the structure station shows two full turns. */
  helixFlank: dna,
  /** Replication station: fork starts after `forkAt`; the learner pairs `fillCount` bases from `fillFrom`. */
  replication: z.object({ length: z.number().int().min(8).max(18), forkAt: z.number().int().nonnegative(), fillFrom: z.number().int().nonnegative(), fillCount: z.number().int().positive() }).strict(),
  variants: z.array(variantSchema).min(1),
}).strict().superRefine((config, ctx) => {
  const table = codonTable(config.codeTable);
  const stops = [...table.values()].filter((meaning) => meaning === "Stop").length;
  if (stops !== 3) ctx.addIssue({ code: "custom", message: "The code table must have exactly three stop codons" });
  const { length, forkAt, fillFrom, fillCount } = config.replication;
  if (fillFrom <= forkAt || fillFrom + fillCount > length) ctx.addIssue({ code: "custom", message: "Replication fill must lie inside the opened fork" });
  for (const variant of config.variants) {
    const codons = splitCodons(parseDna(variant.coding).map(toRna)).map((codon) => codon.join(""));
    if (variant.coding.length % 3 || codons[0] !== "AUG") ctx.addIssue({ code: "custom", message: `${variant.id}: must start with ATG and be whole codons` });
    const meanings = codons.map((codon) => table.get(codon));
    if (meanings.indexOf("Stop") !== meanings.length - 1) ctx.addIssue({ code: "custom", message: `${variant.id}: needs exactly one stop codon, at the end` });
    if (variant.coding.length < length) ctx.addIssue({ code: "custom", message: `${variant.id}: shorter than the replication segment` });
    const { position, to } = variant.mutation;
    if (position < 3 || position >= variant.coding.length - 3 || variant.coding[position] === to)
      ctx.addIssue({ code: "custom", message: `${variant.id}: mutation must change a base between the start and stop codons` });
  }
});

export type Fl27Config = z.infer<typeof fl27ConfigSchema>;
export type Fl27Variant = Fl27Config["variants"][number];

export const fl27GeneConfig: Fl27Config = fl27ConfigSchema.parse({
  configVersion: 1,
  reviewStatus: "PROPOSED_UNAPPROVED",
  structure: { bpPerTurn: 10, turnLengthA: 34, riseA: 3.4, diameterA: 20 },
  codeTable: "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
  helixFlank: "GC",
  replication: { length: 12, forkAt: 3, fillFrom: 4, fillCount: 6 },
  variants: [
    // Met–Phe–Gly–Trp–His–Stop; plan §4.7 G1–G5.
    { id: "gene-a-missense", coding: "ATGTTCGGATGGCATTAA", mutation: { position: 5, to: "A" } },
    { id: "gene-a-nonsense", coding: "ATGTTCGGATGGCATTAA", mutation: { position: 11, to: "A" } },
    { id: "gene-a-silent", coding: "ATGTTCGGATGGCATTAA", mutation: { position: 8, to: "G" } },
    // Met–Glu–Pro–Tyr–Gly–Stop; GAA → GTA (Glu → Val), as in the textbook's sickle-cell context.
    { id: "gene-b-missense", coding: "ATGGAACCCTACGGTTGA", mutation: { position: 4, to: "T" } },
  ],
});

export const fl27Table = codonTable(fl27GeneConfig.codeTable);

export function fl27Variant(variantId: string): Fl27Variant {
  return fl27GeneConfig.variants.find((variant) => variant.id === variantId) ?? fl27GeneConfig.variants[0];
}
