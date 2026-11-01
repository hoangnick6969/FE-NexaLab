/**
 * Nucleotide and amino-acid vocabulary for K7 molecular scenes. The codon
 * table itself is Lab data: a Lab passes the reviewed table string from its
 * pinned pack, and the renderer only displays the entry the learner reads.
 */
export const DNA_BASES = ["A", "T", "G", "C"] as const;
export const RNA_BASES = ["A", "U", "G", "C"] as const;
export type DnaBase = (typeof DNA_BASES)[number];
export type RnaBase = (typeof RNA_BASES)[number];
export type Base = DnaBase | RnaBase;

export const AMINO_ACIDS = [
  "Ala", "Arg", "Asn", "Asp", "Cys", "Gln", "Glu", "Gly", "His", "Ile",
  "Leu", "Lys", "Met", "Phe", "Pro", "Ser", "Thr", "Trp", "Tyr", "Val",
] as const;
export type AminoAcid = (typeof AMINO_ACIDS)[number];
/** A codon read by the ribosome: an amino acid or the end of the chain. */
export type CodonMeaning = AminoAcid | "Stop";
export const CODON_MEANINGS: readonly CodonMeaning[] = [...AMINO_ACIDS, "Stop"];

const ONE_LETTER: Record<string, CodonMeaning> = {
  A: "Ala", R: "Arg", N: "Asn", D: "Asp", C: "Cys", Q: "Gln", E: "Glu", G: "Gly", H: "His", I: "Ile",
  L: "Leu", K: "Lys", M: "Met", F: "Phe", P: "Pro", S: "Ser", T: "Thr", W: "Trp", Y: "Tyr", V: "Val", "*": "Stop",
};

/** Table rows and columns follow the textbook layout: first, second and third base in U, C, A, G order. */
export const CODON_AXIS = ["U", "C", "A", "G"] as const;

export const isPurine = (base: Base) => base === "A" || base === "G";

const DNA_PAIR: Record<DnaBase, DnaBase> = { A: "T", T: "A", G: "C", C: "G" };
/** Partner base used to draw the second strand of a given duplex (pairing geometry, not grading). */
export const pairDna = (base: DnaBase): DnaBase => DNA_PAIR[base];
export const toRna = (base: DnaBase): RnaBase => (base === "T" ? "U" : base);

export function parseDna(sequence: string): DnaBase[] {
  return [...sequence.replace(/\s+/g, "")].map((base) => {
    if (!DNA_BASES.includes(base as DnaBase)) throw new Error(`Not a DNA base: ${base}`);
    return base as DnaBase;
  });
}

/**
 * Builds a codon map from a 64-letter table in TCAG order (the layout of the
 * NCBI "standard code" string). Throws unless it has exactly 64 entries.
 */
export function codonTable(encoded: string): ReadonlyMap<string, CodonMeaning> {
  if (encoded.length !== 64) throw new Error("A codon table needs 64 entries");
  const order = ["U", "C", "A", "G"];
  const table = new Map<string, CodonMeaning>();
  [...encoded].forEach((letter, index) => {
    const meaning = ONE_LETTER[letter];
    if (!meaning) throw new Error(`Unknown amino-acid letter ${letter}`);
    table.set(order[index >> 4] + order[(index >> 2) & 3] + order[index & 3], meaning);
  });
  return table;
}

export const splitCodons = <T,>(bases: readonly T[]) =>
  Array.from({ length: Math.floor(bases.length / 3) }, (_, index) => bases.slice(index * 3, index * 3 + 3));
