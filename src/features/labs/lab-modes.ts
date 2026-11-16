/**
 * Two modes of one FL slot (interim D-5). The 20-slot delivery spec publishes the Explore mode of a Lab that already
 * has Guided "trên cùng Lab ID" once the two-mode contract D-5 is written. Until the server carries both modes on one
 * Lab ID, the Explore bench of FL-16/20/21/27 lives on its own Lab ID (`fl-xx-explore`); this module pairs the two IDs
 * so /labs shows one card per slot (like the K2 Hóa học Labs) and the Lab page offers a mode switch.
 */
import { labInfo } from "./lab-info";

export type LabModePair = { guidedId: string; exploreId: string };

const PAIRS: LabModePair[] = labInfo.flatMap((entry) =>
  "exploreOf" in entry && typeof entry.exploreOf === "string" ? [{ guidedId: entry.exploreOf, exploreId: entry.id }] : []);

/** The pair a Lab ID belongs to, whichever side it is. */
export function labModePair(id: string): LabModePair | undefined {
  return PAIRS.find((pair) => pair.guidedId === id || pair.exploreId === id);
}

/** Explore Lab IDs that fold into their Guided card on /labs. */
export const exploreIdOf = (guidedId: string) => PAIRS.find((pair) => pair.guidedId === guidedId)?.exploreId;
export const guidedIdOf = (exploreId: string) => PAIRS.find((pair) => pair.exploreId === exploreId)?.guidedId;

/**
 * Folds each paired Explore card into its Guided card. A card keeps its own slot when its partner is not in the list
 * (for example only the Explore mode is published to this student), so no published Lab disappears from /labs.
 */
export function foldModeCards<T extends { id: string }>(cards: readonly T[]): Array<T & { exploreCard?: T }> {
  const ids = new Set(cards.map((card) => card.id));
  return cards.flatMap((card) => {
    const guided = guidedIdOf(card.id);
    if (guided && ids.has(guided)) return [];
    const explore = exploreIdOf(card.id);
    const exploreCard = explore && ids.has(explore) ? cards.find((item) => item.id === explore) : undefined;
    return [exploreCard ? { ...card, exploreCard } : card];
  });
}
