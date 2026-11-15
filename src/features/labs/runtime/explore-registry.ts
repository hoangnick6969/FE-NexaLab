/**
 * Explore bench registry (P0 C2.3 / F0-2). One entry per bench, looked up by `row.explore.kit`.
 * Light module: pages load lazily, so `Lab.tsx` never pulls a 3D bench to decide a route.
 */
import type { ComponentType, ReactNode } from "react";
import type { ExploreLabEnvelope } from "@nexalab/sim/explore/envelope";
import { validateLeverLabConfig } from "@nexalab/sim/mechanics";
import { REAGENTS, deriveWetBenchEffectiveConfig, validateChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { listWetBenchKitItems } from "../chemistry/wet-bench/kit/kit-items";
import { WetBenchClassTemplateForm } from "../chemistry/wet-bench/kit/WetBenchClassTemplateForm";
import { listLeverKitItems } from "../physics/mechanics/explore/kit-items";
import type { SharedItemId } from "../shared/items/catalog";
import type { LabItemMetadata } from "../shared/items/item";
import type { ExploreActivity } from "./explore-labs";
import { fixtureBench } from "./fixture-bench";
import type { ExploreRequirement } from "../class-explore/class-explore";

/** One thing on a bench as students and teachers see it (C2.1 fields; `safety` only for materials). */
export type KitItem = LabItemMetadata & {
  /** Key of the entry that draws this item in the bench's renderer registry; items the bench does not draw one by one have none. */
  rendererKey?: string;
  /** Set when the bench draws this item with an item of the shared library (`shared/items/`). */
  sharedItemId?: SharedItemId;
  safety?: { level: "none" | "caution" | "warning" | "danger"; tags: readonly string[]; noteSim?: string; noteReal?: string };
};
/** Every bench config carries these; the rest belongs to the bench schema. */
export type BenchConfig = Pick<ExploreLabEnvelope, "labId" | "kit" | "engine" | "title">;
export type ExplorePageProps = { labId: string; title: string; config: any; activity: ExploreActivity };
/** A bench opened for a Class Explore assignment: the effective config, a notebook key per assignment, and the student's task panel. */
export type ClassExplorePageProps = { title: string; config: any; storageKey: string; onExit: () => void; classSection: ReactNode };
/** What a bench derives from a template and a teacher's selection (P0 C3.2); the server runs the same function. */
export type ClassDerivation =
  | { ok: true; config: any; requirements: ExploreRequirement[]; templateId: string; promptId: string }
  | { ok: false; errors: string[] };
/**
 * The teacher's choices inside one template. Reports `selection` (ids and values only, `null` until complete) and a short
 * `summary` used in the default assignment name.
 */
export type ClassTemplateFormProps = {
  config: any; template: any; labels: Record<string, string>;
  onChange: (value: { selection: Record<string, unknown> | null; summary: string }) => void;
};
export type ExploreBenchEntry = {
  kit: string;
  /** The subject Kit this bench belongs to (§2.1). */
  group: "chemistry" | "physics" | "biology" | "explore-support";
  validate: (raw: unknown) => { ok: true; config: BenchConfig } | { ok: false };
  loadPage: () => Promise<{ default: ComponentType<ExplorePageProps> }>;
  /** Items exactly as configured; the intro panel and the teacher picker read this. */
  listKitItems: (config: any) => KitItem[];
  /** Class Explore (P0 C3): benches without these have no templates yet. */
  deriveClass?: (config: any, selection: unknown) => ClassDerivation;
  loadClassPage?: () => Promise<{ default: ComponentType<ClassExplorePageProps> }>;
  /** The form a teacher picks with inside one of the bench's templates. */
  ClassTemplateForm?: ComponentType<ClassTemplateFormProps>;
  /** Names of requirement items (`itemId` → label). Defaults to the materials of `listKitItems`. */
  classItemLabels?: (config: any) => Record<string, string>;
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
    deriveClass: (config, selection) => {
      const checked = validateChemistryLabConfig(config);
      return checked.ok ? deriveWetBenchEffectiveConfig(checked.config, selection) : { ok: false, errors: checked.errors };
    },
    loadClassPage: () => import("../chemistry/wet-bench/kit/ClassExplorePage"),
    ClassTemplateForm: WetBenchClassTemplateForm,
    // Requirement items are reagents; their names do not depend on the config, so a board without one still reads them.
    classItemLabels: () => Object.fromEntries(Object.values(REAGENTS).map((reagent) => [reagent.id, reagent.labelVi])),
  },
  {
    kit: "k5-lever-bench@1",
    group: "physics",
    validate: (raw) => {
      const result = validateLeverLabConfig(raw);
      return result.ok ? { ok: true, config: result.config } : { ok: false };
    },
    loadPage: () => import("../physics/mechanics/explore/LeverExploreLabPage"),
    listKitItems: listLeverKitItems,
  },
];

/** Dev builds also register a minimal fixture bench that proves the registry serves more than one bench (F0-2). */
if (import.meta.env?.DEV) benches.push(fixtureBench);
const registry = new Map(benches.map((entry) => [entry.kit, entry]));

export const exploreBench = (kit: string) => registry.get(kit);

/** Labels for the items a Class Explore requirement names, from the bench of `config.kit`. */
export function classItemLabels(config: any): Record<string, string> {
  const bench = registry.get(config?.kit ?? "");
  if (!bench) return {};
  if (bench.classItemLabels) return bench.classItemLabels(config);
  return Object.fromEntries(bench.listKitItems(config).filter((item) => item.category === "material").map((item) => [item.id, item.labelVi]));
}
