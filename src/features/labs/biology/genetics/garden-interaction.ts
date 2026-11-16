/**
 * FL-26 direct manipulation, shared by the 2D garden (`MendelGardenScene`) and the 3D garden (`MendelGarden3D`):
 * click a P plant to change its genotype, click an F1 pot to open its Punnett cell, or carry a gamete (press on it,
 * or drag it) and drop it into an F1 pot. A pot opens once it holds the father's and the mother's gamete of its cell.
 */
import type { PointerEvent as ReactPointerEvent } from "react";

export type CarriedGamete = { parent: 0 | 1; allele: string };
export type PotDrops = Readonly<Record<string, { father?: boolean; mother?: boolean }>>;

export type GardenHandlers = {
  /** Cycle the genotype of the father (0) or the mother (1) through the crosses the Lab allows. */
  onParent?: (parent: 0 | 1) => void;
  /** Pick up a gamete (pointer down on it); release over a pot to drop. */
  onGameteDown?: (parent: 0 | 1, allele: string, event: ReactPointerEvent) => void;
  /** Pointer released over an F1 pot: drops the carried gamete there, if any. */
  onPotUp?: (cell: string) => void;
  /** Click on an F1 pot with nothing carried: opens its cell straight away. */
  onPot?: (cell: string) => void;
  carrying?: CarriedGamete | null;
  drops?: PotDrops;
};

/** Text on an F1 pot tag: its genotype once open, else which gametes it already holds. */
export function potTag(shown: boolean, genotype: string, drop: { father?: boolean; mother?: boolean } | undefined, gametes: [string, string]) {
  if (shown) return genotype;
  const father = drop?.father ? gametes[0] : "_", mother = drop?.mother ? gametes[1] : "_";
  return drop?.father || drop?.mother ? `${father}${mother}` : "?";
}
