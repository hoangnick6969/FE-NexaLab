/**
 * Explore bench registry (P0 C2.3 / F0-2). One entry per bench, looked up by `row.explore.kit`.
 * Light module: pages load lazily, so `Lab.tsx` never pulls a 3D bench to decide a route.
 */
import type { ComponentType } from "react";
import type { ExploreLabEnvelope } from "@nexalab/sim/explore/envelope";
import { validateChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { listWetBenchKitItems } from "../chemistry/wet-bench/kit/kit-items";
import type { LabItemMetadata } from "../shared/items/item";
import type { ExploreActivity } from "./explore-labs";
import { fixtureBench } from "./fixture-bench";

/** One thing on a bench as students and teachers see it (C2.1 fields; `safety` only for materials). */
export type KitItem = LabItemMetadata & {
  safety?: { level: "none" | "caution" | "warning" | "danger"; tags: readonly string[]; noteSim?: string; noteReal?: string };
};
/** Every bench config carries these; the rest belongs to the bench schema. */
export type BenchConfig = Pick<ExploreLabEnvelope, "labId" | "kit" | "engine" | "title">;
export type ExplorePageProps = { labId: string; title: string; config: any; activity: ExploreActivity };
export type ExploreBenchEntry = {
  kit: string;
  /** The subject Kit this bench belongs to (§2.1). */
  group: "chemistry" | "physics" | "biology" | "explore-support";
  validate: (raw: unknown) => { ok: true; config: BenchConfig } | { ok: false };
  loadPage: () => Promise<{ default: ComponentType<ExplorePageProps> }>;
  /** Items exactly as configured; the intro panel and the teacher picker read this. */
  listKitItems: (config: any) => KitItem[];
};

const benches: ExploreBenchEntry[] = [
  {
    kit: "k2-wet-bench@1",
    group: "chemistry",
    validate: (raw) => {
      const result = validateChemistryLabConfig(raw);
      return result.ok ? { ok: true, config: result.config } : { ok: false };
    },
    loadPage: () => import("../chemistry/wet-bench/kit/ExploreLabPage"),
    listKitItems: listWetBenchKitItems,
  },
];

/** Dev builds also register a minimal fixture bench that proves the registry serves more than one bench (F0-2). */
if (import.meta.env?.DEV) benches.push(fixtureBench);
const registry = new Map(benches.map((entry) => [entry.kit, entry]));

export const exploreBench = (kit: string) => registry.get(kit);
