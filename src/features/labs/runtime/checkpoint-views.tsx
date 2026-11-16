import type { ComponentType } from "react";
import { defineText } from "../../../i18n";
import { bulbEvidenceReady, bulbHintStep, defaultBulbEvidence } from "../physics/electricity/circuit-bulb-evidence";
import { loadLabActivity } from "./lazy-lab-activity";
import { defaultEmEvidence, emEvidenceFrom, emEvidenceReady, emPhaseOf } from "../physics/electricity/induction/em-evidence";
import { defaultEcoEvidence, ecoEvidenceFrom, ecoEvidenceReady, ecoPhaseOf, OBSERVE_FIRST } from "../biology/ecology/tolerance/eco-evidence";
import { defaultFwEvidence, fwEvidenceFrom, fwEvidenceReady, fwPhaseOf } from "../biology/ecology/food-web/fw-evidence";

const CircuitBulbActivity = loadLabActivity(() => import("../physics/electricity/CircuitBulbActivity").then((module) => ({ default: module.CircuitBulbActivity })));
const EmInductionActivity = loadLabActivity(() => import("../physics/electricity/induction/EmInductionActivity").then((module) => ({ default: module.EmInductionActivity })));
const EcologyToleranceActivity = loadLabActivity(() => import("../biology/ecology/tolerance/EcologyToleranceActivity").then((module) => ({ default: module.EcologyToleranceActivity })));
const FoodWebActivity = loadLabActivity(() => import("../biology/ecology/food-web/FoodWebActivity").then((module) => ({ default: module.FoodWebActivity })));

// Checkpoint activities: each renderer key maps to its view, default evidence,
// submit readiness and the wording of one server observation in the result list.
// Scores and observations always come from the server result.

const text = defineText({
  vi: {
    closed: "Công tắc đóng", open: "Công tắc mở", on: "Bóng đèn sáng", off: "Bóng đèn tắt",
    still: "Nam châm đứng yên", push: "Đẩy cực N vào", pull: "Kéo cực N ra", rotate: "Quay máy phát một vòng",
    none: "không có dòng điện", d1: "có dòng điện, kim lệch phải", d2: "có dòng điện, kim lệch trái", ac: "dòng điện đổi chiều luân phiên",
    correct: "dự đoán đúng", incorrect: "dự đoán chưa đúng",
    eco: {
      T_INSIDE: "Nước 30,0 °C", T_ABOVE: "Nước 44,0 °C", LIMITS: "Giới hạn sinh thái", IMPORT: "Chọn loài cá", DENSITY: "Mật độ bắp cải", AGE: "Tháp tuổi P3",
      persists: "cá rô phi tồn tại được", gone: "cá rô phi không tồn tại được", limits: "từ 5,6 °C đến 42 °C",
      fit: "loài phù hợp", density: "cây/m²", GROWING: "dạng phát triển", STABLE: "dạng ổn định", DECLINING: "dạng suy giảm",
      correct: "trả lời đúng", incorrect: "trả lời chưa đúng",
    } as Record<string, string>,
    fw: {
      ROLES: "Vai trò sinh vật", CHAIN: "Chuỗi thức ăn", ENERGY: "Năng lượng tới rắn", HUNT: "Mất rắn, ếch", DEFOREST: "Mất cây xanh, sâu ăn lá", CAUSES: "Nguyên nhân mất cân bằng",
      roles: "cỏ sản xuất, ếch tiêu thụ, nấm và vi khuẩn phân giải", valid: "chuỗi hợp lệ", invalid: "chuỗi chưa hợp lệ", kj: "kJ",
      INCREASE: "tăng lên", DECREASE: "giảm đi", NO_DIRECT_EFFECT: "không bị ảnh hưởng trực tiếp", causes: "4 hoạt động gây mất cân bằng",
      correct: "trả lời đúng", incorrect: "trả lời chưa đúng",
    } as Record<string, string>,
  },
  en: {
    closed: "Switch closed", open: "Switch open", on: "Bulb on", off: "Bulb off",
    still: "Magnet held still", push: "N pole pushed in", pull: "N pole pulled out", rotate: "Generator turned once",
    none: "no current", d1: "current, needle right", d2: "current, needle left", ac: "current reverses in turn",
    correct: "correct prediction", incorrect: "incorrect prediction",
    eco: {
      T_INSIDE: "Water at 30.0 °C", T_ABOVE: "Water at 44.0 °C", LIMITS: "Tolerance range", IMPORT: "Choosing a fish", DENSITY: "Cabbage density", AGE: "Age pyramid P3",
      persists: "tilapia can persist", gone: "tilapia cannot persist", limits: "5.6 °C to 42 °C",
      fit: "fits", density: "plants/m²", GROWING: "growing", STABLE: "stable", DECLINING: "declining",
      correct: "correct answer", incorrect: "incorrect answer",
    } as Record<string, string>,
    fw: {
      ROLES: "Roles", CHAIN: "Food chain", ENERGY: "Energy reaching the snake", HUNT: "Snake removed, frog", DEFOREST: "Trees removed, caterpillar", CAUSES: "Causes of imbalance",
      roles: "grass producer, frog consumer, fungi and bacteria decomposers", valid: "valid chain", invalid: "chain not valid", kj: "kJ",
      INCREASE: "increases", DECREASE: "decreases", NO_DIRECT_EFFECT: "no direct effect", causes: "4 activities upset the balance",
      correct: "correct answer", incorrect: "incorrect answer",
    } as Record<string, string>,
  },
});

export type CheckpointView = {
  modelRef: string;
  Activity: ComponentType<{ state: unknown; onChange: (value: any) => void }>;
  defaultEvidence: () => unknown;
  ready: (value: unknown) => boolean;
  describeResult: (item: any) => string;
  /** Student-facing name of one checkpoint, for the hint button. */
  stepLabel: (checkpointId: string) => string;
  /** SAI-01A in-run hint targets derived from the draft evidence alone. */
  hintStep: (value: unknown) => HintStep;
};

/** `ask`: the step waiting for a prediction (moment A). `reflect`: the last observed step (moment B). */
export type HintStep = {
  ask: { criterion: string } | null;
  reflect: { criterion: string; state: unknown; prediction: unknown } | null;
};

type PhasedEvidence = { checkpoints: Array<{ id: string; state: unknown; prediction: unknown }>; observed: Record<string, boolean> };
function phasedHintStep(evidence: PhasedEvidence, phase: { kind: string; id?: string }, observeFirst: ReadonlySet<string> = new Set()): HintStep {
  const ask = phase.kind === "predict" ? { criterion: "prediction:" + phase.id } : phase.kind === "explain" ? { criterion: "explanation" } : null;
  // An observe-first step (FL-20 LIMITS) is answered after seeing the data, so it has no reflection.
  const last = [...evidence.checkpoints].reverse()
    .find((checkpoint) => evidence.observed[checkpoint.id] && checkpoint.prediction !== null && !observeFirst.has(checkpoint.id));
  // The reflection belongs to the step just observed: once the student answers a later step, it is no longer offered.
  const lastIndex = last ? evidence.checkpoints.indexOf(last) : -1;
  const movedOn = last ? evidence.checkpoints.slice(lastIndex + 1).some((checkpoint) => checkpoint.prediction !== null) : false;
  return { ask, reflect: last && !movedOn ? { criterion: "prediction:" + last.id, state: last.state, prediction: last.prediction } : null };
}

const verdict = (item: any) => item.predictionCorrect ? text().correct : text().incorrect;

const views: Record<string, CheckpointView> = {
  "circuit-bulb": {
    modelRef: "circuit-bulb@1.0.0",
    Activity: CircuitBulbActivity,
    defaultEvidence: defaultBulbEvidence,
    ready: bulbEvidenceReady,
    hintStep: bulbHintStep,
    stepLabel: (id) => id === "CLOSED" ? text().closed : text().open,
    describeResult: (item) => {
      const t = text();
      return `${item.id === "CLOSED" ? t.closed : t.open}: ${item.scientificObservation?.bulbState === "ON" ? t.on : t.off}, ${verdict(item)}`;
    },
  },
  "em-induction": {
    modelRef: "em-induction@1.0.0",
    Activity: EmInductionActivity,
    defaultEvidence: defaultEmEvidence,
    ready: emEvidenceReady,
    stepLabel: (id) => ({ STILL: text().still, PUSH: text().push, PULL: text().pull, ROTATE: text().rotate } as Record<string, string>)[id] ?? id,
    hintStep: (value) => { const evidence = emEvidenceFrom(value); return phasedHintStep(evidence as PhasedEvidence, emPhaseOf(evidence)); },
    describeResult: (item) => {
      const t = text();
      const observation = item.scientificObservation ?? {};
      const label = { STILL: t.still, PUSH: t.push, PULL: t.pull, ROTATE: t.rotate }[item.id as string] ?? item.id;
      const seen = observation.inducedCurrent !== "PRESENT" ? t.none
        : observation.currentKind === "ALTERNATING" ? t.ac
        : observation.direction === "D1" ? t.d1 : t.d2;
      return `${label}: ${seen}, ${verdict(item)}`;
    },
  },
  "ecology-tolerance": {
    modelRef: "ecology-tolerance@1.0.0",
    Activity: EcologyToleranceActivity,
    defaultEvidence: defaultEcoEvidence,
    ready: ecoEvidenceReady,
    stepLabel: (id) => text().eco[id] ?? id,
    hintStep: (value) => { const evidence = ecoEvidenceFrom(value); return phasedHintStep(evidence as PhasedEvidence, ecoPhaseOf(evidence), OBSERVE_FIRST); },
    describeResult: (item) => {
      const e = text().eco;
      const observation = item.scientificObservation ?? {};
      const seen = observation.setup === "tolerance" ? (observation.canPersist ? e.persists : e.gone)
        : observation.setup === "tolerance-sweep" ? e.limits
        : observation.setup === "import-comparison" ? `${e.fit}: ${(observation.candidates ?? []).filter((c: any) => c.suitable).map((c: any) => c.speciesId.replace("fish-", "").toUpperCase()).join(", ") || "—"}`
        : observation.setup === "density" ? `${observation.density?.num / observation.density?.den} ${e.density}`
        : observation.setup === "age-structure" ? e[observation.pyramid] ?? ""
        : "";
      return `${e[item.id] ?? item.id}: ${seen}, ${item.predictionCorrect ? e.correct : e.incorrect}`;
    },
  },
  "food-web": {
    modelRef: "food-web@1.0.0",
    Activity: FoodWebActivity,
    defaultEvidence: defaultFwEvidence,
    ready: fwEvidenceReady,
    stepLabel: (id) => text().fw[id] ?? id,
    hintStep: (value) => { const evidence = fwEvidenceFrom(value); return phasedHintStep(evidence as PhasedEvidence, fwPhaseOf(evidence)); },
    describeResult: (item) => {
      const f = text().fw;
      const observation = item.scientificObservation ?? {};
      const asked = item.id === "HUNT" ? "ech" : "sau";
      const seen = observation.setup === "roles" ? f.roles
        : observation.setup === "chain" ? (observation.valid && observation.startsWithProducer && observation.length >= 4 ? f.valid : f.invalid)
        : observation.setup === "energy" ? `${observation.levelsKJ?.[observation.levelsKJ.length - 1]} ${f.kj}`
        : observation.setup === "remove" ? f[observation.effects?.[asked]?.effect] ?? ""
        : observation.setup === "causes" ? f.causes
        : "";
      return `${f[item.id] ?? item.id}: ${seen}, ${item.predictionCorrect ? f.correct : f.incorrect}`;
    },
  },
};

export const checkpointViewForRenderer = (rendererKey: string | null | undefined) => rendererKey ? views[rendererKey] ?? null : null;
export const checkpointViewForModel = (modelRef: string | null | undefined) =>
  Object.values(views).find((view) => view.modelRef === modelRef) ?? null;
