/**
 * Explore Labs on `/labs/:id` (P0 C1): the server declares the mode on each `GET /labs` row and sends
 * the pinned bench config. The bundled kit configs are only for the dev route and as publish input.
 * Light module: it never imports a 3D bench, so `Lab.tsx` can decide the route cheaply.
 */
import { exploreBench, type BenchConfig, type ExploreBenchEntry } from "./explore-registry";

export type ExploreResolveError = "EXPLORE_VERSION_MISSING" | "EXPLORE_IDENTITY_MISMATCH" | "EXPLORE_DIGEST_MISMATCH" | "EXPLORE_KIT_UNSUPPORTED" | "EXPLORE_CONFIG_INVALID";
export type ExploreActivity = { id: string; key: string; version: number; digest: string };
export type ExploreRow = {
  id: string;
  title: string;
  mode: "guided" | "explore";
  /** D-5: every mode of the Lab; `["guided", "explore"]` for a Guided Lab with Explore attached on the same Lab ID. */
  modes?: Array<"guided" | "explore">;
  explore?: { ok: true; kit: string; engine: string; activity: ExploreActivity; config: unknown } | { ok: false; code: ExploreResolveError };
};

/** Server config re-validated with the bench schema (bench looked up by `explore.kit`); any failure stops the bench, with no bundled fallback. */
export function resolveExploreConfig(row: ExploreRow):
  | { ok: true; bench: ExploreBenchEntry; config: BenchConfig; activity: ExploreActivity }
  | { ok: false; code: ExploreResolveError } {
  const explore = row.explore;
  if (!explore) return { ok: false, code: "EXPLORE_VERSION_MISSING" };
  if (!explore.ok) return explore;
  const bench = exploreBench(explore.kit);
  if (!bench) return { ok: false, code: "EXPLORE_KIT_UNSUPPORTED" };
  const result = bench.validate(explore.config);
  if (!result.ok) return { ok: false, code: "EXPLORE_CONFIG_INVALID" };
  if (result.config.labId !== row.id || result.config.kit !== explore.kit || result.config.engine !== explore.engine) return { ok: false, code: "EXPLORE_IDENTITY_MISMATCH" };
  return { ok: true, bench, config: result.config, activity: explore.activity };
}
