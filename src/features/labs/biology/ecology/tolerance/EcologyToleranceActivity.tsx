import { useEffect, useRef, useState } from "react";
import { Check, CircleHelp, Compass, Info, Play, X } from "lucide-react";
import { ECOLOGY_POPULATIONS } from "@nexalab/sim";
import { defineText } from "../../../../../i18n";
import { useReducedMotion } from "../../../physics/electricity/induction/apparatus/anim";
import { PondScene, type FishState } from "./PondScene";
import { ComparisonGraph, ToleranceGraph } from "./ToleranceGraph";
import { AgePyramid, PopulationPlot } from "./PopulationViews";
import {
  DENSITY_PATTERN, DENSITY_UNITS, ECO_CHOICES, ECO_STEP_COUNT, ecoEvidenceFrom, ecoPhaseOf, ecoStepNumber,
  formatCount, formatDeciC, previewEco, tolerance,
  type DensityAnswer, type DensityUnit, type EcoCheckpointId, type EcoChoice, type EcoEvidence, type EcoObservation,
} from "./eco-evidence";
import "./EcologyToleranceActivity.css";

const text = defineText({
  vi: {
    title: "Nhân tố và giới hạn sinh thái",
    discipline: "Sinh học 8, sinh vật và môi trường",
    step: (n: number) => `Bước ${n}/${ECO_STEP_COUNT}`,
    questions: "Câu hỏi", closeQuestions: "Đóng câu hỏi",
    answerLegend: "Câu trả lời của em",
    predictHint: "Chọn câu trả lời trước, rồi mới quan sát.",
    question: {
      T_INSIDE: "Nước trong ao đang ở 30,0 °C. Theo em, cá rô phi có tồn tại được ở nhiệt độ này không?",
      T_ABOVE: "Nước trong ao nóng lên 44,0 °C. Theo em, cá rô phi có tồn tại được không?",
      LIMITS: "Theo quan sát của em, giới hạn sinh thái về nhiệt độ của cá rô phi là khoảng nào?",
      IMPORT: "Trong năm, nước ở một địa phương thay đổi từ 8 °C đến 36 °C. Nên nhập loài cá nào về nuôi ngoài trời quanh năm?",
      DENSITY: "Quần thể bắp cải có 3 000 cây sống trên 750 m². Mật độ cá thể của quần thể là bao nhiêu?",
      AGE: "Quần thể P3 có 20 cá thể trước sinh sản, 45 cá thể sinh sản và 35 cá thể sau sinh sản. Tháp tuổi này thuộc dạng nào?",
    } as Record<EcoCheckpointId, string>,
    actPrompt: {
      T_INSIDE: "Bấm “Quan sát” để xem cá rô phi ở 30,0 °C.",
      T_ABOVE: "Bấm “Quan sát” để xem cá rô phi ở 44,0 °C.",
      LIMITS: "Kéo thanh nhiệt độ từ thấp lên cao và xem khi nào cá rô phi không tồn tại được. Em cần thử cả phía lạnh và phía nóng, hoặc bấm “Quét tự động”.",
      IMPORT: "Bấm “So sánh” để xem loài nào chịu được nhiệt độ nước ở địa phương quanh năm.",
      DENSITY: "Bấm “Xem phép tính” để kiểm tra.",
      AGE: "Bấm “Xem kết quả” để kiểm tra.",
    } as Record<EcoCheckpointId, string>,
    action: {
      T_INSIDE: "Quan sát", T_ABOVE: "Quan sát", LIMITS: "Quét tự động",
      IMPORT: "So sánh", DENSITY: "Xem phép tính", AGE: "Xem kết quả",
    } as Record<EcoCheckpointId, string>,
    running: "Đang thực hiện…",
    choice: {
      PERSISTS: "Tồn tại được", NOT_PERSIST: "Không tồn tại được",
      L1: "Từ 5,6 °C đến 42 °C", L2: "Từ 0 °C đến 42 °C", L3: "Từ 5,6 °C đến 30 °C", L4: "Từ 30 °C đến 44 °C",
      FISH_A: "Cá A", FISH_B: "Cá B", FISH_C: "Cá C", NONE: "Không loài nào phù hợp",
      GROWING: "Dạng phát triển", STABLE: "Dạng ổn định", DECLINING: "Dạng suy giảm",
    } as Record<EcoChoice, string>,
    densityValue: "Mật độ", densityUnit: "Đơn vị", densitySave: "Ghi câu trả lời",
    densityInvalid: "Nhập một số, ví dụ 12 hoặc 2,5.",
    unit: { PER_HA: "cây/ha", PER_M2: "cây/m²", PER_M3: "con/m³" } as Record<DensityUnit, string>,
    explanation: "Vì sao không thể nuôi cá rô phi ngoài trời quanh năm ở nơi mùa đông nước xuống dưới 5,6 °C?",
    a: "Nhiệt độ đó nằm ngoài giới hạn sinh thái về nhiệt độ của cá rô phi.",
    b: "Vì mùa đông cá rô phi không có đủ thức ăn.",
    c: "Vì không loài cá nào sống được ở nước dưới 10 °C.",
    ready: "Em đã hoàn thành các câu hỏi và phần giải thích.",
    persists: (v: string) => `Ở ${v} °C, cá rô phi bơi bình thường: chúng tồn tại được ở nhiệt độ này.`,
    gone: (v: string) => `Ở ${v} °C, cá rô phi không tồn tại được (hình cá chỉ còn đường viền mờ).`,
    sweepSeen: { cold: "Đã thử phía lạnh", warm: "Đã thử phía nóng" },
    limitsRead: "Giới hạn sinh thái về nhiệt độ của cá rô phi là từ 5,6 °C đến 42 °C (SGK KHTN 8, Bài 41).",
    comparison: (name: string) => `${name} chịu được toàn bộ khoảng nhiệt độ nước của địa phương. Các loài còn lại sẽ gặp nhiệt độ ngoài giới hạn sinh thái của chúng.`,
    comparisonNone: "Không loài nào chịu được toàn bộ khoảng nhiệt độ nước của địa phương.",
    density: (count: string, amount: string, value: string, unit: string) => `Mật độ = ${count} : ${amount} = ${value} ${unit}.`,
    age: { GROWING: "Nhóm trước sinh sản nhiều hơn hẳn nhóm sinh sản: tháp dạng phát triển.", STABLE: "Nhóm trước sinh sản xấp xỉ nhóm sinh sản: tháp dạng ổn định.", DECLINING: "Nhóm trước sinh sản ít hơn hẳn nhóm sinh sản: tháp dạng suy giảm." } as Record<string, string>,
    temperature: "Nhiệt độ nước",
    fishLocked: "Ở bước này nhiệt độ được đặt sẵn.",
    graph: {
      title: "Đồ thị giới hạn sinh thái về nhiệt độ của cá rô phi", curve: "Mức độ sinh trưởng",
      lower: "Giới hạn dưới", upper: "Giới hạn trên",
      illustrative: "Đường cong chỉ minh hoạ, không có số đo. Hai giới hạn theo SGK KHTN 8.",
    },
    compare: {
      title: "Giới hạn sinh thái về nhiệt độ của ba loài cá giả định", site: "Nước ở địa phương", to: "đến",
      fish: { "fish-a": "Cá A", "fish-b": "Cá B", "fish-c": "Cá C" } as Record<string, string>,
      suitable: "phù hợp", cold: "không chịu được lạnh", heat: "không chịu được nóng", both: "không phù hợp",
      illustrative: "Số liệu minh hoạ, không phải số liệu SGK.",
    },
    population: {
      title: "Quần thể", illustrative: "Hình minh hoạ, không vẽ đủ số cây.", table: "Số liệu theo SGK KHTN 8, Bảng 42.1",
      name: { "lim-xanh": "Lim xanh", "bap-cai": "Bắp cải", "ca-chep": "Cá chép" } as Record<string, string>,
      count: "Số lượng cá thể", space: "Không gian phân bố",
      unit: { ha: "ha", m2: "m²", m3: "m³" } as Record<string, string>,
    },
    pyramid: { title: "Tháp tuổi", pre: "Trước sinh sản", reproductive: "Sinh sản", post: "Sau sinh sản", illustrative: "Số liệu minh hoạ." },
    sceneLabel: "Ao nuôi cá rô phi cắt ngang, có nhiệt kế đo nhiệt độ nước.",
    modelLimit: "Mô hình đơn giản: chỉ thay đổi một nhân tố (nhiệt độ), các nhân tố khác coi như thuận lợi. Cá A, B, C, khoảng nhiệt độ ở địa phương và các tháp tuổi là số liệu minh hoạ.",
    explore: {
      show: "Khám phá thêm", hide: "Đóng khám phá", title: "Khám phá tự do",
      intro: "Phần này không được chấm điểm và không được lưu.",
      scene: "Xem", pond: "Ao cá", population: "Mật độ", pyramid: "Tháp tuổi", factors: "Nhân tố",
      sample: "Mẫu quần thể",
      factorsIntro: "Xếp mỗi nhân tố vào nhóm vô sinh hoặc hữu sinh.",
      abiotic: "Vô sinh", biotic: "Hữu sinh", check: "Kiểm tra",
      factorNames: { light: "Ánh sáng", temperature: "Nhiệt độ", water: "Nước", grass: "Cây cỏ", insects: "Sâu bọ", people: "Con người" } as Record<string, string>,
      factorResult: (n: number, total: number) => `Đúng ${n}/${total}.`,
    },
  },
  en: {
    title: "Ecological factors and tolerance limits",
    discipline: "Biology 8, organisms and environment",
    step: (n: number) => `Step ${n}/${ECO_STEP_COUNT}`,
    questions: "Questions", closeQuestions: "Close questions",
    answerLegend: "Your answer",
    predictHint: "Choose your answer first, then observe.",
    question: {
      T_INSIDE: "The pond water is at 30.0 °C. Can tilapia persist at this temperature?",
      T_ABOVE: "The pond water warms to 44.0 °C. Can tilapia persist?",
      LIMITS: "From what you observed, what is the temperature tolerance range of tilapia?",
      IMPORT: "Over a year, the water at a site ranges from 8 °C to 36 °C. Which fish should be brought in to farm outdoors all year?",
      DENSITY: "A cabbage population has 3,000 plants on 750 m². What is its population density?",
      AGE: "Population P3 has 20 pre-reproductive, 45 reproductive and 35 post-reproductive individuals. What kind of age pyramid is it?",
    } as Record<EcoCheckpointId, string>,
    actPrompt: {
      T_INSIDE: "Press “Observe” to see the tilapia at 30.0 °C.",
      T_ABOVE: "Press “Observe” to see the tilapia at 44.0 °C.",
      LIMITS: "Drag the temperature from low to high and watch when tilapia can no longer persist. Try both the cold and the warm side, or press “Auto sweep”.",
      IMPORT: "Press “Compare” to see which species tolerates the site's water all year.",
      DENSITY: "Press “Show the calculation” to check.",
      AGE: "Press “Show the result” to check.",
    } as Record<EcoCheckpointId, string>,
    action: {
      T_INSIDE: "Observe", T_ABOVE: "Observe", LIMITS: "Auto sweep",
      IMPORT: "Compare", DENSITY: "Show the calculation", AGE: "Show the result",
    } as Record<EcoCheckpointId, string>,
    running: "Running…",
    choice: {
      PERSISTS: "Can persist", NOT_PERSIST: "Cannot persist",
      L1: "5.6 °C to 42 °C", L2: "0 °C to 42 °C", L3: "5.6 °C to 30 °C", L4: "30 °C to 44 °C",
      FISH_A: "Fish A", FISH_B: "Fish B", FISH_C: "Fish C", NONE: "No species fits",
      GROWING: "Growing", STABLE: "Stable", DECLINING: "Declining",
    } as Record<EcoChoice, string>,
    densityValue: "Density", densityUnit: "Unit", densitySave: "Save answer",
    densityInvalid: "Enter a number, for example 12 or 2.5.",
    unit: { PER_HA: "plants/ha", PER_M2: "plants/m²", PER_M3: "animals/m³" } as Record<DensityUnit, string>,
    explanation: "Why can tilapia not be farmed outdoors all year where winter water drops below 5.6 °C?",
    a: "That temperature is outside the tilapia's temperature tolerance range.",
    b: "Because tilapia lack food in winter.",
    c: "Because no fish can live in water below 10 °C.",
    ready: "You have completed the questions and your explanation.",
    persists: (v: string) => `At ${v} °C the tilapia swim normally: they can persist at this temperature.`,
    gone: (v: string) => `At ${v} °C tilapia cannot persist (the fish show only as faded outlines).`,
    sweepSeen: { cold: "Cold side tried", warm: "Warm side tried" },
    limitsRead: "The temperature tolerance range of tilapia is 5.6 °C to 42 °C (KHTN 8 textbook, lesson 41).",
    comparison: (name: string) => `${name} tolerates the whole range of the site's water. The others would meet temperatures outside their tolerance range.`,
    comparisonNone: "No species tolerates the whole range of the site's water.",
    density: (count: string, amount: string, value: string, unit: string) => `Density = ${count} ÷ ${amount} = ${value} ${unit}.`,
    age: { GROWING: "Far more pre-reproductive than reproductive individuals: a growing pyramid.", STABLE: "Pre-reproductive about equal to reproductive: a stable pyramid.", DECLINING: "Far fewer pre-reproductive than reproductive individuals: a declining pyramid." } as Record<string, string>,
    temperature: "Water temperature",
    fishLocked: "In this step the temperature is preset.",
    graph: {
      title: "Temperature tolerance graph of tilapia", curve: "Growth level",
      lower: "Lower limit", upper: "Upper limit",
      illustrative: "The curve is an illustration, not a measurement. Both limits follow the KHTN 8 textbook.",
    },
    compare: {
      title: "Temperature tolerance of three hypothetical fish", site: "Site water", to: "to",
      fish: { "fish-a": "Fish A", "fish-b": "Fish B", "fish-c": "Fish C" } as Record<string, string>,
      suitable: "fits", cold: "cannot stand the cold", heat: "cannot stand the heat", both: "does not fit",
      illustrative: "Illustrative data, not textbook data.",
    },
    population: {
      title: "Population", illustrative: "Illustration; not every plant is drawn.", table: "Data from the KHTN 8 textbook, table 42.1",
      name: { "lim-xanh": "Ironwood", "bap-cai": "Cabbage", "ca-chep": "Carp" } as Record<string, string>,
      count: "Individuals", space: "Area or volume",
      unit: { ha: "ha", m2: "m²", m3: "m³" } as Record<string, string>,
    },
    pyramid: { title: "Age pyramid", pre: "Pre-reproductive", reproductive: "Reproductive", post: "Post-reproductive", illustrative: "Illustrative data." },
    sceneLabel: "Cross-section of a tilapia pond with a thermometer in the water.",
    modelLimit: "Simple model: only one factor (temperature) changes; the others are assumed favourable. Fish A, B, C, the site range and the age pyramids are illustrative data.",
    explore: {
      show: "Explore more", hide: "Close explore", title: "Free explore",
      intro: "This part is not scored or saved.",
      scene: "Show", pond: "Pond", population: "Density", pyramid: "Age pyramid", factors: "Factors",
      sample: "Population sample",
      factorsIntro: "Sort each factor into abiotic or biotic.",
      abiotic: "Abiotic", biotic: "Biotic", check: "Check",
      factorNames: { light: "Light", temperature: "Temperature", water: "Water", grass: "Grass", insects: "Insects", people: "People" } as Record<string, string>,
      factorResult: (n: number, total: number) => `${n}/${total} correct.`,
    },
  },
});
const t = text();

const FACTORS: Array<{ id: string; biotic: boolean }> = [
  { id: "light", biotic: false }, { id: "temperature", biotic: false }, { id: "water", biotic: false },
  { id: "grass", biotic: true }, { id: "insects", biotic: true }, { id: "people", biotic: true },
];
const SWEEP_MS = 2400;
type ExploreScene = "pond" | "population" | "pyramid" | "factors";
type Scene = "pond" | "compare" | "population" | "pyramid";
const sceneFor = (id: EcoCheckpointId | null): Scene =>
  id === "IMPORT" ? "compare" : id === "DENSITY" ? "population" : id === "AGE" ? "pyramid" : "pond";

/** Model unit ("ha", "m2", "m3") → answer unit. */
const unitOf = (unit: string) => `PER_${unit.toUpperCase()}` as DensityUnit;
const fractionText = (fraction: { num: number; den: number }) =>
  fraction.den === 1 ? formatCount(fraction.num) : (fraction.num / fraction.den).toLocaleString("vi-VN", { maximumFractionDigits: 3 });

export function EcologyToleranceActivity({ state, onChange }: { state: unknown; onChange: (value: EcoEvidence) => void }) {
  const reduced = useReducedMotion();
  const evidence = ecoEvidenceFrom(state);
  const latest = useRef(evidence);
  latest.current = evidence;
  const phase = ecoPhaseOf(evidence);
  const step = ecoStepNumber(phase);
  const [questionOpen, setQuestionOpen] = useState(true);
  // The sweep starts where the 44,0 °C step left the pond.
  const [sweepValue, setSweepValue] = useState(440);
  const [seen, setSeen] = useState({ cold: false, warm: false });
  const [sweeping, setSweeping] = useState(false);
  const [density, setDensity] = useState<{ value: string; unit: DensityUnit }>({ value: "", unit: "PER_M2" });
  const [densityError, setDensityError] = useState(false);
  const [explore, setExplore] = useState<ExploreScene | null>(null);
  const [exploreValue, setExploreValue] = useState(250);
  const [exploreSample, setExploreSample] = useState<"P1" | "P2" | "P3">("P1");
  const [factorAnswers, setFactorAnswers] = useState<Record<string, boolean | undefined>>({});
  const [factorChecked, setFactorChecked] = useState(false);
  const frame = useRef<number | null>(null);
  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);

  const current = phase.kind === "predict" || phase.kind === "act" ? evidence.checkpoints[phase.index] : null;
  const actId = phase.kind === "act" ? phase.id : null;
  const done = phase.kind === "explain" || phase.kind === "ready";
  const exploring = done && explore !== null;
  // The scene follows the step being worked on; after the last step it stays on the last checkpoint.
  const focusId = current?.id ?? "AGE";
  const scene: Scene = exploring ? (explore === "pyramid" ? "pyramid" : explore === "population" ? "population" : "pond") : sceneFor(focusId);

  const markObserved = (id: EcoCheckpointId) => {
    const next = latest.current;
    onChange({ ...next, observed: { ...next.observed, [id]: true } });
  };
  const visit = (value: number) => {
    setSweepValue(value);
    const observation = tolerance(value);
    if (!observation || observation.canPersist) return;
    const side = observation.zone === "BELOW_MIN" ? "cold" : "warm";
    setSeen((previous) => previous[side] ? previous : { ...previous, [side]: true });
  };
  // The sweep is observed once both edges of the tolerance range were crossed.
  useEffect(() => {
    if (seen.cold && seen.warm && actId === "LIMITS") markObserved("LIMITS");
  }, [seen.cold, seen.warm, actId]);
  const autoSweep = () => {
    if (sweeping) return;
    if (reduced) { visit(0); visit(500); setSweepValue(250); return; }
    setSweeping(true);
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / SWEEP_MS);
      visit(Math.round(progress * 500));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else { frame.current = null; setSweeping(false); }
    };
    frame.current = requestAnimationFrame(tick);
  };
  const act = () => {
    if (phase.kind !== "act" || sweeping) return;
    if (phase.id === "LIMITS") autoSweep();
    else markObserved(phase.id);
  };
  const predict = (prediction: EcoChoice | DensityAnswer) => {
    if (phase.kind !== "predict") return;
    const checkpoints = [...evidence.checkpoints] as EcoEvidence["checkpoints"];
    checkpoints[phase.index] = { ...checkpoints[phase.index], prediction };
    onChange({ ...evidence, checkpoints });
  };
  const saveDensity = () => {
    const value = density.value.trim();
    if (!DENSITY_PATTERN.test(value)) { setDensityError(true); return; }
    setDensityError(false);
    predict({ value, unit: density.unit });
  };
  const explain = (explanation: "A" | "B" | "C") => onChange({ ...evidence, explanation });

  // What the pond shows: the fixed checkpoint temperature until it is observed, the sweep during LIMITS.
  // While the 44,0 °C prediction is open, the pond keeps the 30,0 °C step just observed.
  const pondIndex = focusId === "T_INSIDE" ? 0 : focusId === "T_ABOVE" ? (phase.kind === "predict" && evidence.observed.T_INSIDE ? 0 : 1) : null;
  const pondCheckpoint = scene === "pond" && !exploring && pondIndex !== null ? evidence.checkpoints[pondIndex] : null;
  const pondValue = exploring ? exploreValue
    : pondCheckpoint ? (pondCheckpoint.state as { valueDeciC: number }).valueDeciC
    : sweepValue;
  const pondObservation = tolerance(pondValue);
  const fish: FishState = pondCheckpoint && !evidence.observed[pondCheckpoint.id] ? "hidden"
    : pondObservation?.canPersist ? "persists" : "gone";
  const limitsShown = evidence.checkpoints[2].prediction !== null;
  const comparison = previewEco(evidence.checkpoints[3].state) as Extract<EcoObservation, { setup: "import-comparison" }> | null;
  const densityObservation = previewEco(evidence.checkpoints[4].state) as Extract<EcoObservation, { setup: "density" }> | null;
  const ageObservation = previewEco(exploring && explore === "pyramid" ? { setup: "age-structure", sampleId: exploreSample } : evidence.checkpoints[5].state) as Extract<EcoObservation, { setup: "age-structure" }> | null;
  const sliderLocked = !exploring && (focusId === "T_INSIDE" || focusId === "T_ABOVE");
  const showSlider = scene === "pond" && (exploring || !sliderLocked);

  const observationText = (id: EcoCheckpointId): string | null => {
    if (id === "T_INSIDE" || id === "T_ABOVE") {
      const value = (evidence.checkpoints[id === "T_INSIDE" ? 0 : 1].state as { valueDeciC: number }).valueDeciC;
      return tolerance(value)?.canPersist ? t.persists(formatDeciC(value)) : t.gone(formatDeciC(value));
    }
    if (id === "LIMITS") return evidence.checkpoints[2].prediction ? t.limitsRead : null;
    if (id === "IMPORT") {
      const fit = comparison?.candidates.find((candidate) => candidate.suitable);
      return fit ? t.comparison(t.compare.fish[fit.speciesId]) : t.comparisonNone;
    }
    if (id === "DENSITY" && densityObservation) {
      return t.density(formatCount(densityObservation.count), formatCount(densityObservation.amount), fractionText(densityObservation.density), t.unit[unitOf(densityObservation.unit)]);
    }
    if (id === "AGE" && ageObservation) return t.age[ageObservation.pyramid];
    return null;
  };
  const lastObserved = [...evidence.checkpoints].reverse().find((checkpoint) => evidence.observed[checkpoint.id]) ?? null;
  // The sweep shows the live value; otherwise the current step once observed, else the last observed step.
  const shownText = current?.id === "LIMITS" && phase.kind === "act" ? (pondObservation?.canPersist ? t.persists(formatDeciC(sweepValue)) : t.gone(formatDeciC(sweepValue)))
    : current && evidence.observed[current.id] ? observationText(current.id)
    : lastObserved ? observationText(lastObserved.id)
    : null;

  const heading = phase.kind === "predict" ? t.question[phase.id] : phase.kind === "act" ? t.actPrompt[phase.id] : phase.kind === "explain" ? t.explanation : t.ready;
  const factorScore = FACTORS.filter((factor) => factorAnswers[factor.id] === factor.biotic).length;

  return <section className="eco-activity" data-testid="eco-activity" aria-label={t.title}>
    <div className="eco-stage" data-testid="eco-stage" data-scene={scene}>
      <div className="eco-stage-inner">
        {scene === "pond" && <>
          <PondScene valueDeciC={pondValue} fish={fish} label={`${t.sceneLabel} ${formatDeciC(pondValue)} °C.`} />
          <ToleranceGraph limits={pondObservation?.limits ?? { minDeciC: 56, maxDeciC: 420 }} valueDeciC={pondValue}
            showLimits={limitsShown || exploring} labels={t.graph} />
        </>}
        {scene === "compare" && comparison && <ComparisonGraph comparison={comparison} revealed={evidence.observed.IMPORT} labels={t.compare} />}
        {scene === "population" && <PopulationPlot selected="bap-cai" labels={t.population} />}
        {scene === "pyramid" && ageObservation && <AgePyramid age={ageObservation} labels={t.pyramid} />}
      </div>
    </div>

    <div className="eco-dock" role="group" aria-label={t.title}>
      {showSlider && <label className="eco-slider">
        <span>{t.temperature}: <b data-testid="eco-temperature">{formatDeciC(pondValue)} °C</b></span>
        <input type="range" min={0} max={500} step={1} value={pondValue} disabled={sweeping} aria-valuetext={`${formatDeciC(pondValue)} °C`}
          data-testid="eco-slider" onChange={(event) => exploring ? setExploreValue(Number(event.target.value)) : visit(Number(event.target.value))} />
      </label>}
      {sliderLocked && scene === "pond" && <p className="eco-dock-note">{t.fishLocked} {formatDeciC(pondValue)} °C</p>}
      <button type="button" className="eco-act" data-testid="eco-act" disabled={phase.kind !== "act" || sweeping} onClick={act}>
        <Play size={16} aria-hidden="true" />
        <span>{sweeping ? t.running : actId ? t.action[actId] : current ? t.action[current.id] : t.action.AGE}</span>
      </button>
    </div>

    <button type="button" className="eco-question-badge" aria-expanded={questionOpen} aria-controls="eco-questions" onClick={() => setQuestionOpen((open) => !open)}>
      <CircleHelp size={16} aria-hidden="true" /><span>{t.questions}, {t.step(step).toLowerCase()}</span>
    </button>
    <div id="eco-questions" className="eco-panel" data-open={questionOpen} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setQuestionOpen(false); } }}>
      <div className="eco-panel-header">
        <div>
          <p className="eco-discipline">{t.discipline}</p>
          <p className="eco-step">{t.step(step)}</p>
        </div>
        <button type="button" className="eco-close" aria-label={t.closeQuestions} title={t.closeQuestions} onClick={() => setQuestionOpen(false)}><X size={15} aria-hidden="true" /></button>
      </div>
      <div className="eco-progress" aria-hidden="true">
        {Array.from({ length: ECO_STEP_COUNT }, (_, i) => <span key={i} data-state={i + 1 < step ? "done" : i + 1 === step ? "current" : "todo"} />)}
      </div>
      <h3 className="eco-heading" aria-live="polite">{heading}</h3>

      {actId === "LIMITS" && <ul className="eco-seen" data-testid="eco-sweep-progress">
        <li data-done={seen.cold}>{seen.cold && <Check size={14} aria-hidden="true" />}{t.sweepSeen.cold}</li>
        <li data-done={seen.warm}>{seen.warm && <Check size={14} aria-hidden="true" />}{t.sweepSeen.warm}</li>
      </ul>}

      {phase.kind === "predict" && phase.id !== "DENSITY" && <fieldset className="eco-choices" data-testid={`eco-answer-${phase.id.toLowerCase()}`}>
        <legend>{t.answerLegend}</legend>
        {ECO_CHOICES[phase.id].map((choice) => <label key={choice} className="eco-choice">
          <input type="radio" name={`eco-answer-${phase.id}`} value={choice} checked={current?.prediction === choice} onChange={() => predict(choice)} />
          <span>{t.choice[choice]}</span>
        </label>)}
      </fieldset>}
      {phase.kind === "predict" && phase.id === "DENSITY" && <form className="eco-density" data-testid="eco-answer-density" onSubmit={(event) => { event.preventDefault(); saveDensity(); }}>
        <label className="eco-field-label">
          <span>{t.densityValue}</span>
          <input type="text" inputMode="decimal" autoComplete="off" value={density.value} aria-invalid={densityError} aria-describedby={densityError ? "eco-density-error" : undefined}
            onChange={(event) => { setDensity({ ...density, value: event.target.value }); setDensityError(false); }} />
        </label>
        <label className="eco-field-label">
          <span>{t.densityUnit}</span>
          <select value={density.unit} onChange={(event) => setDensity({ ...density, unit: event.target.value as DensityUnit })}>
            {DENSITY_UNITS.map((unit) => <option key={unit} value={unit}>{t.unit[unit]}</option>)}
          </select>
        </label>
        {densityError && <p id="eco-density-error" className="eco-error" role="alert">{t.densityInvalid}</p>}
        <button type="submit" className="eco-tool">{t.densitySave}</button>
      </form>}

      <div className="eco-observation" role="status" aria-live="polite" data-testid="eco-observation">
        {shownText ? <p>{actId === "LIMITS" ? <Info size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />} {shownText}</p>
          : <p className="eco-hint"><Info size={15} aria-hidden="true" /> {t.predictHint}</p>}
      </div>

      {done && <fieldset className="eco-choices" data-testid="eco-explanation">
        <legend>{t.explanation}</legend>
        {(["A", "B", "C"] as const).map((answer) => <label key={answer} className="eco-choice">
          <input type="radio" name="eco-explanation" value={answer} checked={evidence.explanation === answer} onChange={() => explain(answer)} />
          <span className="eco-letter">{answer}</span>
          <span>{t[answer.toLowerCase() as "a" | "b" | "c"]}</span>
        </label>)}
      </fieldset>}
      {phase.kind === "ready" && <p className="eco-ready" role="status"><Check size={16} aria-hidden="true" /> {t.ready}</p>}

      {done && <div className="eco-explore" data-testid="eco-explore">
        <button type="button" className="eco-tool" aria-expanded={exploring} aria-controls="eco-explore-controls" onClick={() => setExplore((value) => value ? null : "pond")}>
          <Compass size={16} aria-hidden="true" /><span>{exploring ? t.explore.hide : t.explore.show}</span>
        </button>
        {exploring && <div id="eco-explore-controls" className="eco-explore-controls">
          <h4 className="eco-explore-title">{t.explore.title}</h4>
          <p className="eco-note">{t.explore.intro}</p>
          <fieldset className="eco-segment">
            <legend>{t.explore.scene}</legend>
            {(["pond", "population", "pyramid", "factors"] as const).map((option) => <label key={option} className="eco-segment-option">
              <input type="radio" name="eco-explore-scene" checked={explore === option} onChange={() => setExplore(option)} />
              <span>{t.explore[option]}</span>
            </label>)}
          </fieldset>
          {explore === "pond" && <p className="eco-note">{tolerance(exploreValue)?.canPersist ? t.persists(formatDeciC(exploreValue)) : t.gone(formatDeciC(exploreValue))}</p>}
          {explore === "population" && <ul className="eco-density-list">
            {(Object.keys(ECOLOGY_POPULATIONS) as Array<keyof typeof ECOLOGY_POPULATIONS>).map((id) => {
              const observation = previewEco({ setup: "density", populationId: id }) as Extract<EcoObservation, { setup: "density" }> | null;
              return observation && <li key={id}>{t.population.name[id]}: {t.density(formatCount(observation.count), formatCount(observation.amount), fractionText(observation.density), t.unit[unitOf(observation.unit)])}</li>;
            })}
          </ul>}
          {explore === "pyramid" && <>
            <fieldset className="eco-segment">
              <legend>{t.explore.sample}</legend>
              {(["P1", "P2", "P3"] as const).map((sample) => <label key={sample} className="eco-segment-option">
                <input type="radio" name="eco-explore-sample" checked={exploreSample === sample} onChange={() => setExploreSample(sample)} />
                <span>{sample}</span>
              </label>)}
            </fieldset>
            {ageObservation && <p className="eco-note">{t.age[ageObservation.pyramid]}</p>}
          </>}
          {explore === "factors" && <div className="eco-factors" data-testid="eco-factors">
            <p className="eco-note">{t.explore.factorsIntro}</p>
            {FACTORS.map((factor) => <fieldset key={factor.id} className="eco-segment eco-factor">
              <legend>{t.explore.factorNames[factor.id]}</legend>
              {[false, true].map((biotic) => <label key={String(biotic)} className="eco-segment-option" data-result={factorChecked && factorAnswers[factor.id] === biotic ? String(biotic === factor.biotic) : undefined}>
                <input type="radio" name={`eco-factor-${factor.id}`} checked={factorAnswers[factor.id] === biotic} onChange={() => { setFactorAnswers({ ...factorAnswers, [factor.id]: biotic }); setFactorChecked(false); }} />
                <span>{biotic ? t.explore.biotic : t.explore.abiotic}</span>
              </label>)}
            </fieldset>)}
            <button type="button" className="eco-tool" onClick={() => setFactorChecked(true)}>{t.explore.check}</button>
            {factorChecked && <p className="eco-note" role="status">{t.explore.factorResult(factorScore, FACTORS.length)}</p>}
          </div>}
        </div>}
      </div>}
      <p className="eco-note">{t.modelLimit}</p>
    </div>
  </section>;
}

