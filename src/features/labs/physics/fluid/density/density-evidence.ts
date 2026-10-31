import { fl03DensityConfig } from "./fl03-density.config";
import { k3Specimen } from "../kit";

/**
 * FL-03 evidence draft. Its shape matches the server's `density-stations@1`
 * evidence; numbers are null until the learner has read and entered them.
 * The draft is local recovery data, never evidence, until it is submitted and
 * the server recomputes every expected reading.
 */
export const EXPLORE_IDS = ["iron-1v", "iron-2v", "iron-3v", "aluminium-1v", "copper-1v"] as const;
export const BLOCK_IDS = ["wood-block-a", "wood-block-b"] as const;
export const PEBBLE_IDS = ["pebble-a", "pebble-b"] as const;
export const DENSITY_UNITS = ["g/cm3", "g/ml", "kg/m3"] as const;
export const STATION_IDS = ["explore", "block", "water", "pebble", "conclusion"] as const;

export type ExploreId = (typeof EXPLORE_IDS)[number];
export type BlockId = (typeof BLOCK_IDS)[number];
export type PebbleId = (typeof PEBBLE_IDS)[number];
export type DensityUnit = (typeof DENSITY_UNITS)[number];
export type StationId = (typeof STATION_IDS)[number];
export type Num = number | null;
export type Choice = "A" | "B" | "C" | null;
export type DensityEntry = { value: Num; unit: DensityUnit };
export type BlockTrial = { aMm: Num; bMm: Num; cMm: Num; massG: Num };

export type DensityEvidence = {
  explore: { masses: Array<{ specimenId: ExploreId; massG: Num }>; conclusion: Choice };
  block: { specimenId: BlockId; trials: BlockTrial[]; density: DensityEntry };
  water: { pouredMl: number; volumeMl: Num; m1G: Num; m2G: Num; density: DensityEntry };
  pebble: { specimenId: PebbleId; initialMl: number; massG: Num; v1Ml: Num; v2Ml: Num; density: DensityEntry };
  units: { woodKgm3: Num; irregularReason: Choice };
};

const emptyTrial = (): BlockTrial => ({ aMm: null, bMm: null, cMm: null, massG: null });
const emptyDensity = (): DensityEntry => ({ value: null, unit: "g/cm3" });

export function defaultDensityEvidence(): DensityEvidence {
  return {
    explore: { masses: EXPLORE_IDS.map((specimenId) => ({ specimenId, massG: null })), conclusion: null },
    block: { specimenId: "wood-block-a", trials: [emptyTrial()], density: emptyDensity() },
    water: { pouredMl: 50, volumeMl: null, m1G: null, m2G: null, density: emptyDensity() },
    pebble: { specimenId: "pebble-a", initialMl: 50, massG: null, v1Ml: null, v2Ml: null, density: emptyDensity() },
    units: { woodKgm3: null, irregularReason: null },
  };
}
export const newTrial = emptyTrial;

const isNum = (value: unknown): value is Num => value === null || (typeof value === "number" && Number.isFinite(value));
const isChoice = (value: unknown): value is Choice => value === null || value === "A" || value === "B" || value === "C";
const isDensity = (value: any): value is DensityEntry => isNum(value?.value) && (DENSITY_UNITS as readonly string[]).includes(value?.unit);

/** A restored draft or an unset host state may be anything; fall back to a fresh draft. */
export function densityEvidenceFrom(value: any): DensityEvidence {
  const ok = Array.isArray(value?.explore?.masses) && value.explore.masses.length === EXPLORE_IDS.length &&
    EXPLORE_IDS.every((id, index) => value.explore.masses[index]?.specimenId === id && isNum(value.explore.masses[index]?.massG)) &&
    isChoice(value.explore.conclusion) &&
    (BLOCK_IDS as readonly string[]).includes(value?.block?.specimenId) && Array.isArray(value.block.trials) &&
    value.block.trials.length >= 1 && value.block.trials.length <= 3 &&
    value.block.trials.every((trial: any) => isNum(trial?.aMm) && isNum(trial?.bMm) && isNum(trial?.cMm) && isNum(trial?.massG)) &&
    isDensity(value.block.density) &&
    Number.isInteger(value?.water?.pouredMl) && isNum(value.water.volumeMl) && isNum(value.water.m1G) && isNum(value.water.m2G) && isDensity(value.water.density) &&
    (PEBBLE_IDS as readonly string[]).includes(value?.pebble?.specimenId) && Number.isInteger(value.pebble.initialMl) &&
    isNum(value.pebble.massG) && isNum(value.pebble.v1Ml) && isNum(value.pebble.v2Ml) && isDensity(value.pebble.density) &&
    isNum(value?.units?.woodKgm3) && isChoice(value.units.irregularReason);
  return ok ? value : defaultDensityEvidence();
}

const filled = (value: Num) => value !== null && value > 0;

/** Keys of the entries still missing or impossible, grouped by station. */
export function densityIssues(evidence: DensityEvidence): Record<StationId, string[]> {
  const issues: Record<StationId, string[]> = { explore: [], block: [], water: [], pebble: [], conclusion: [] };
  if (evidence.explore.masses.some((item) => !filled(item.massG))) issues.explore.push("masses");
  if (!evidence.explore.conclusion) issues.explore.push("conclusion");
  if (evidence.block.trials.some((trial) => !filled(trial.aMm) || !filled(trial.bMm) || !filled(trial.cMm) || !filled(trial.massG))) issues.block.push("trials");
  if (!filled(evidence.block.density.value)) issues.block.push("density");
  const { water, pebble, units } = evidence;
  if (!filled(water.volumeMl)) issues.water.push("volume");
  if (!filled(water.m1G) || !filled(water.m2G)) issues.water.push("masses");
  else if ((water.m2G as number) <= (water.m1G as number)) issues.water.push("order");
  if (!filled(water.density.value)) issues.water.push("density");
  if (!filled(pebble.massG)) issues.pebble.push("mass");
  if (!filled(pebble.v1Ml) || !filled(pebble.v2Ml)) issues.pebble.push("levels");
  else if ((pebble.v2Ml as number) <= (pebble.v1Ml as number) || (pebble.v2Ml as number) > 100) issues.pebble.push("order");
  if (!filled(pebble.density.value)) issues.pebble.push("density");
  if (!filled(units.woodKgm3)) issues.conclusion.push("conversion");
  if (!units.irregularReason) issues.conclusion.push("reason");
  return issues;
}

export const densityEvidenceReady = (value: unknown) =>
  Object.values(densityIssues(densityEvidenceFrom(value))).every((list) => list.length === 0);

export const stationDone = (evidence: DensityEvidence, station: StationId) => densityIssues(evidence)[station].length === 0;

/** Volume of a box specimen in cm³ from its configured size (exact; used only to label table rows). */
export function boxVolumeCm3(specimenId: string) {
  const specimen = k3Specimen(fl03DensityConfig, specimenId);
  if (specimen.shape !== "box") throw new Error(`${specimenId} is not a box`);
  return (specimen.sizeMm[0] * specimen.sizeMm[1] * specimen.sizeMm[2]) / 1000;
}

/** Intermediate arithmetic shown as "tentative"; the division itself is left to the learner. */
export const tentative = {
  blockVolumes: (trials: BlockTrial[]) => trials.map((t) => (t.aMm && t.bMm && t.cMm ? (t.aMm * t.bMm * t.cMm) / 1000 : null)),
  mean: (values: Num[]) => (values.length && values.every((v) => v !== null) ? (values as number[]).reduce((s, v) => s + v, 0) / values.length : null),
};
