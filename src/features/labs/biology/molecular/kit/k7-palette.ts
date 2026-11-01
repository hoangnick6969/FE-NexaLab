import type { AminoAcid, Base, CodonMeaning } from "./k7-codons";

/**
 * One palette for 3D, 2D and HUD. Colour is never the only cue: every base and
 * amino acid is also shown by its letter or three-letter code.
 */
export const BASE_COLORS: Record<Base, string> = {
  A: "#3aa860",
  T: "#e0575c",
  G: "#eda52c",
  C: "#3f7ed6",
  U: "#a462d2",
};

/** Text on a base chip; chosen for at least 4.5:1 contrast on the chip colour. */
export const BASE_INK: Record<Base, string> = { A: "#06240f", T: "#2a0507", G: "#2b1a00", C: "#ffffff", U: "#ffffff" };

export type AminoGroup = "nonpolar" | "polar" | "positive" | "negative" | "stop";

const GROUPS: Record<AminoAcid, AminoGroup> = {
  Gly: "nonpolar", Ala: "nonpolar", Val: "nonpolar", Leu: "nonpolar", Ile: "nonpolar", Pro: "nonpolar", Phe: "nonpolar", Met: "nonpolar", Trp: "nonpolar",
  Ser: "polar", Thr: "polar", Cys: "polar", Tyr: "polar", Asn: "polar", Gln: "polar",
  Lys: "positive", Arg: "positive", His: "positive",
  Asp: "negative", Glu: "negative",
};

export const aminoGroup = (meaning: CodonMeaning): AminoGroup => (meaning === "Stop" ? "stop" : GROUPS[meaning]);

export const AMINO_GROUP_COLORS: Record<AminoGroup, string> = {
  nonpolar: "#e3b65a",
  polar: "#5fc1a6",
  positive: "#5d8fe6",
  negative: "#e0697a",
  stop: "#8b939a",
};

/**
 * Backbone tints: original (parent) DNA, newly made DNA, and RNA. `sugar` and
 * `phosphate` also colour the 2D diagram; `tube` and `bead` are the glossy 3D
 * backbone and its phosphate beads.
 */
export const STRAND_TINTS = {
  parent: { sugar: "#d9c49b", phosphate: "#ee9a48", tube: "#cfe2f2", bead: "#f3f7fb" },
  new: { sugar: "#a5e6cf", phosphate: "#f2c15c", tube: "#a8ecd2", bead: "#effff8" },
  rna: { sugar: "#a9cdf2", phosphate: "#f5cf6e", tube: "#dccaff", bead: "#fbf6ff" },
} as const;

/** CPK element colours for the ball-and-stick view. */
export const ELEMENT_COLORS = { C: "#8f969c", N: "#3a5cf0", O: "#f03a33", P: "#ff8c1a" } as const;
export type Element = keyof typeof ELEMENT_COLORS;
/** Ball-and-stick backbone ribbon. */
export const ATOMIC_RIBBON = "#2fbf4a";
export type StrandTint = keyof typeof STRAND_TINTS;

/** Nucleoplasm backdrop: deep teal, darker at the edges. */
export const K7_SCENE = { background: "#0a1822", horizon: "#16384a", fog: "#0c1d29" } as const;
