/**
 * Explore-first Labs (unscored, client-only) that open the K2 kit instead of the guided LabRun flow.
 * Light module: it imports configs only, never the 3D kit, so `Lab.tsx` can decide the route cheaply.
 * A Lab that also has a guided mode (e.g. FL-10 Mass Conservation) keeps its guided route.
 */
import { validateChemistryLabConfig, type ChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { k2LabConfigs } from "../chemistry/wet-bench/labs";

const exploreOnly = Object.values(k2LabConfigs).filter((config) => !config.modes.guided);

export const isExploreLab = (labId: string | undefined) => !!labId && exploreOnly.some((config) => config.labId === labId);

/** Kit config bundled with the app; used when the database has none or an invalid one. */
export const bundledExploreConfig = (labId: string) => exploreOnly.find((config) => config.labId === labId) ?? null;

/**
 * The config published with the Lab row (`Lab.config.explore`) wins when it validates and matches
 * the Lab id; otherwise the bundled kit config is used.
 */
export function resolveExploreConfig(labId: string, labRow: { config?: unknown } | null | undefined): { config: ChemistryLabConfig | null; source: "database" | "bundled" } {
  const stored = (labRow?.config as { explore?: unknown } | undefined)?.explore;
  if (stored) {
    const result = validateChemistryLabConfig(stored);
    if (result.ok && result.config.labId === labId) return { config: result.config, source: "database" };
  }
  return { config: bundledExploreConfig(labId), source: "bundled" };
}
