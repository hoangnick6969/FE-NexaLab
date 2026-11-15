/**
 * Explore Labs on `/labs/:id` (P0 C1): the server declares the mode on each `GET /labs` row and sends
 * the pinned bench config. The bundled kit configs are only for the dev route and as publish input.
 * Light module: it never imports a 3D bench, so `Lab.tsx` can decide the route cheaply.
 */
import { validateChemistryLabConfig, type ChemistryLabConfig } from "@nexalab/sim/wet-bench";

export type ExploreResolveError = "EXPLORE_VERSION_MISSING" | "EXPLORE_IDENTITY_MISMATCH" | "EXPLORE_DIGEST_MISMATCH" | "EXPLORE_KIT_UNSUPPORTED" | "EXPLORE_CONFIG_INVALID";
export type ExploreActivity = { id: string; key: string; version: number; digest: string };
export type ExploreRow = {
  id: string;
  title: string;
  mode: "guided" | "explore";
  explore?: { ok: true; kit: string; engine: string; activity: ExploreActivity; config: unknown } | { ok: false; code: ExploreResolveError };
};

/** Benches this app can run, by `row.explore.kit`. */
const BENCH_VALIDATORS: Record<string, (raw: unknown) => ReturnType<typeof validateChemistryLabConfig>> = {
  "k2-wet-bench@1": validateChemistryLabConfig,
};

/** Server config re-validated with the bench schema; any failure stops the bench (no bundled fallback). */
export function resolveExploreConfig(row: ExploreRow):
  | { ok: true; config: ChemistryLabConfig; activity: ExploreActivity }
  | { ok: false; code: ExploreResolveError } {
  const explore = row.explore;
  if (!explore) return { ok: false, code: "EXPLORE_VERSION_MISSING" };
  if (!explore.ok) return explore;
  const validate = BENCH_VALIDATORS[explore.kit];
  if (!validate) return { ok: false, code: "EXPLORE_KIT_UNSUPPORTED" };
  const result = validate(explore.config);
  if (!result.ok) return { ok: false, code: "EXPLORE_CONFIG_INVALID" };
  if (result.config.labId !== row.id || result.config.kit !== explore.kit || result.config.engine !== explore.engine) return { ok: false, code: "EXPLORE_IDENTITY_MISMATCH" };
  return { ok: true, config: result.config, activity: explore.activity };
}
