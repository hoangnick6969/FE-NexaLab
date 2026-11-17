/**
 * Two modes of one FL slot (interim D-5). The 20-slot delivery spec publishes the Explore mode of a Lab that already
 * has Guided "trên cùng Lab ID" once the two-mode contract D-5 is written. Until the server carries both modes on one
 * Lab ID, the Explore bench of FL-16/20/21/27 lives on its own Lab ID (`fl-xx-explore`); this module pairs the two IDs
 * so /labs shows one card per slot (like the K2 Hóa học Labs) and the Lab page offers a mode switch.
 */
import { labInfo } from "./lab-info";
import type { ExploreRow } from "./runtime/explore-labs";

export type LabModePair = { guidedId: string; exploreId: string };

const PAIRS: LabModePair[] = labInfo.flatMap((entry) =>
  "exploreOf" in entry && typeof entry.exploreOf === "string" ? [{ guidedId: entry.exploreOf, exploreId: entry.id }] : []);

/** The pair a Lab ID belongs to, whichever side it is. */
export function labModePair(id: string): LabModePair | undefined {
  return PAIRS.find((pair) => pair.guidedId === id || pair.exploreId === id);
}

type LabModeRow = Partial<Pick<ExploreRow, "mode" | "explore">>;

export function hasPublishedModePair(guided: LabModeRow | undefined, explore: LabModeRow | undefined): boolean {
  return !!guided && guided.mode !== "explore" && explore?.mode === "explore" && explore.explore?.ok === true;
}

/**
 * Folds each paired Explore card into its Guided card. A card keeps its own slot when its partner is not in the list
 * (for example only the Explore mode is published to this student), so no published Lab disappears from /labs.
 */
export function foldModeCards<T extends { id: string }>(cards: readonly T[], published: ReadonlyMap<string, LabModeRow>): Array<T & { exploreCard?: T }> {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return cards.flatMap((card) => {
    const pair = labModePair(card.id);
    if (!pair || !byId.has(pair.guidedId) || !hasPublishedModePair(published.get(pair.guidedId), published.get(pair.exploreId))) return [card];
    if (card.id === pair.exploreId) return [];
    const exploreCard = byId.get(pair.exploreId);
    return [exploreCard ? { ...card, exploreCard } : card];
  });
}
