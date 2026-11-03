import { EYE_PART_IDS, type EyePartId } from "../kit/EyeModel";

/**
 * FL-16 evidence draft (`eye-anatomy-optics`, model `eye-optics@1.0.0`). The
 * shape mirrors the server schema in `packages/sim/eye-optics.ts`; keep the
 * constants below in sync with it. The draft is local recovery data until the
 * learner submits, and the server recomputes everything. Nothing here marks an
 * answer right or wrong.
 */
export const EYE_PART_NAMES: Record<EyePartId, string> = {
  cornea: "Giác mạc",
  aqueous: "Thủy dịch",
  pupil: "Đồng tử",
  lens: "Thể thủy tinh",
  vitreous: "Dịch kính",
  retina: "Võng mạc",
  nerve: "Dây thần kinh thị giác",
  sclera: "Củng mạc",
};

/** What learners see for each part. The retina accepts both textbook names, so the label shows both. */
export const EYE_PART_LABELS: Record<EyePartId, string> = { ...EYE_PART_NAMES, retina: "Màng lưới (Võng mạc)" };

/** Synonyms the server accepts (case and diacritics ignored). Kept equal to the server list by the parity spec. */
export const EYE_PART_ALIASES: Partial<Record<EyePartId, readonly string[]>> = { retina: ["Võng mạc", "Màng lưới"] };

export const EYE_OPTICS_SCENARIOS = [
  { id: "normal-near", axialMm: 22.6, objectDistanceM: 0.25, ametropia: "none" },
  { id: "myopia-far", axialMm: 23.4, objectDistanceM: null, ametropia: "myopia" },
  { id: "hyperopia-near", axialMm: 21.5, objectDistanceM: 0.4, ametropia: "hyperopia" },
] as const;
export type ScenarioId = (typeof EYE_OPTICS_SCENARIOS)[number]["id"];

export const LENS_RANGE_D = { min: 16, max: 26 } as const;
export const GLASSES_RANGE_D = { min: -10, max: 10 } as const;
export const POWER_STEP_D = 0.25;
/** Distances the learner can set; `null` is an object at infinity. */
export const DISTANCE_OPTIONS_M: ReadonlyArray<number | null> = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1, 2, 4, 6, null];

export type Phase2Attempt = {
  scenarioId: ScenarioId;
  objectDistanceM: number | null;
  lensPowerD: number;
  glassesPowerD: number;
};

export type EyeOpticsEvidence = {
  phase1: { labels: Partial<Record<EyePartId, string>> };
  phase2: Phase2Attempt[];
};

export const defaultEyeOpticsEvidence = (): EyeOpticsEvidence => ({
  phase1: { labels: {} },
  phase2: EYE_OPTICS_SCENARIOS.map((scenario) => ({
    scenarioId: scenario.id,
    objectDistanceM: 1,
    lensPowerD: LENS_RANGE_D.min,
    glassesPowerD: 0,
  })),
});

const onStep = (value: number) => Math.abs(Math.round(value / POWER_STEP_D) * POWER_STEP_D - value) < 1e-9;
const inRange = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && onStep(value);

/** Restores a stored draft field by field; anything malformed falls back to the default. */
export function eyeOpticsEvidenceFrom(state: unknown): EyeOpticsEvidence {
  const base = defaultEyeOpticsEvidence();
  if (!state || typeof state !== "object") return base;
  const raw = state as Partial<EyeOpticsEvidence>;
  const labels: Partial<Record<EyePartId, string>> = {};
  for (const id of EYE_PART_IDS) {
    const value = raw.phase1?.labels?.[id];
    if (typeof value === "string") labels[id] = value.slice(0, 100);
  }
  const phase2 = base.phase2.map((fallback) => {
    const found = Array.isArray(raw.phase2) ? raw.phase2.find((item) => item?.scenarioId === fallback.scenarioId) : undefined;
    if (!found) return fallback;
    const distance = found.objectDistanceM === null || (typeof found.objectDistanceM === "number" && DISTANCE_OPTIONS_M.includes(found.objectDistanceM))
      ? found.objectDistanceM
      : fallback.objectDistanceM;
    return {
      scenarioId: fallback.scenarioId,
      objectDistanceM: distance,
      lensPowerD: inRange(found.lensPowerD, LENS_RANGE_D.min, LENS_RANGE_D.max) ? found.lensPowerD : fallback.lensPowerD,
      glassesPowerD: inRange(found.glassesPowerD, GLASSES_RANGE_D.min, GLASSES_RANGE_D.max) ? found.glassesPowerD : fallback.glassesPowerD,
    };
  });
  return { phase1: { labels }, phase2 };
}

/** Phase 1 is complete when every part has a name; phase 2 is always answerable. */
export const eyeOpticsEvidenceReady = (state: unknown) => {
  const evidence = eyeOpticsEvidenceFrom(state);
  return EYE_PART_IDS.every((id) => (evidence.phase1.labels[id] ?? "").trim().length > 0);
};

