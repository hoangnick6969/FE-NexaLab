/**
 * K2 Explore bench state. Pure reducer: every 3D drag, 3D click, DOM button and keyboard action
 * goes through the same `hold` / `apply` actions, so all input methods behave identically.
 */
import {
  applyOperation, assessSolution, createBench, engineContextFor, measure, observeVessel, readGasVolume, readVolume, reagentById, scaleReadingMicrograms,
  type ApplyResult, type Bench, type ChemistryLabConfig, type EngineContext, type Operation, type SolutionAssessment, type Transition,
} from "@nexalab/sim/wet-bench";
import { K2_APPARATUS, isVesselKind, type HeldTool } from "./apparatus-manifest";
import { isPlacementSlot, slotById } from "./bench-layout";
import { describeVesselChange, equationsFor, formatClock, formatGasMl, formatGrams, formatMilligrams, formatMolar, formatPercent, formatPh, formatQuantity, PIECE_NAME, reagentLabel, type ObservationLogEntry } from "./observation-log";
import { OBSERVATION_LOG_LIMIT } from "../../../shared/explore/observation-log";

/** A dropper draws up to 1.0 mL (20 standard drops of 0.05 mL) per fill. */
export const DROPPER_CAPACITY_MICROLITERS = 1000;

export type Held =
  | { kind: "reagent"; reagentId: string }
  | { kind: "tool"; tool: HeldTool; apparatusId: string }
  | { kind: "vessel"; vesselId: string };

/** Operations on one vessel. The stopwatch and the passage of time are bench-level actions with their own reducer cases. */
type VesselOperation = Exclude<Operation, { type: "clock" } | { type: "advance_time" }>;

/** The learner's conclusion for one target: the real concentration, shown only after "Kết luận". */
export type Conclusion = { targetId: string; vesselId: string; result: Extract<SolutionAssessment, { ok: true }> };

/**
 * Volume as the learner may know it. With a volume measurement in the Lab, only the graduated cylinder gives a number
 * (to 1 mL); a flask shows whether it is at the mark and a beaker only a rough level, so the cylinder is the tool to use.
 */
export function volumeLabel(config: ChemistryLabConfig, vessel: Bench["vessels"][string]) {
  if (!config.measurements.includes("volume")) return formatQuantity(vessel.solutionMicroliters, Boolean(config.rateModel));
  if (vessel.kind === "graduated_cylinder_100ml") {
    const reading = readVolume(vessel);
    return reading.ok ? `${reading.milliliters} mL` : "";
  }
  if (vessel.kind === "volumetric_flask_100ml") return vessel.solutionMicroliters >= vessel.capacityMicroliters ? "đến vạch 100 mL" : "chưa đến vạch";
  return `khoảng ${Math.round(vessel.solutionMicroliters / 10_000) * 10} mL`;
}

/** Largest and default spatula amount, in milligrams. */
export const POWDER_MAX_MILLIGRAMS = 50_000;
export const POWDER_DEFAULT_MILLIGRAMS = 500;

export type Target = { kind: "vessel"; vesselId: string } | { kind: "slot"; slotId: string } | { kind: "bottle"; reagentId: string };

export type Snapshot = {
  bench: Bench;
  /** apparatusId → slotId; presentation only, never sent to the model. */
  positions: Record<string, string>;
  probeIn: string | null;
  strips: Record<string, "red" | "purple" | "blue">;
  wasteMicroliters: number;
  /** Gas collected over time (engine 1.2.0): tenths of a mL per stoppered flask at each simulated moment, for the chart. */
  series: Array<{ t: number; volumes: Record<string, number> }>;
};

export type BenchUiState = {
  config: ChemistryLabConfig;
  context: EngineContext;
  initial: Snapshot;
  current: Snapshot;
  history: Array<{ snapshot: Snapshot; labelVi: string }>;
  held: Held | null;
  presetMicroliters: number;
  /** Liquid left in the dropper while it holds a reagent (µL, 0 to DROPPER_CAPACITY_MICROLITERS). */
  loadedMicroliters: number;
  focusVesselId: string | null;
  flashes: Record<string, { transition: Transition; at: number }>;
  banner: { vesselId: string; textVi: string; reasonVi?: string } | null;
  notice: { textVi: string; at: number } | null;
  log: ObservationLogEntry[];
  seen: { reactions: string[]; measurements: string[] };
  /** Last drop released from a dropper, for the falling-droplet animation. */
  drip: { vesselId: string; reagentId: string; at: number } | null;
  /** Colour shown on the litmus strip in hand after a dip. */
  stripColour: "red" | "purple" | "blue" | null;
  /** Scale zeroed (tared): the reading shown is the raw reading minus this, in µg. Presentation only. */
  scaleZero: number;
  /** Milligrams taken per spatula scoop (engine 1.1.0 powders). */
  powderMilligrams: number;
  conclusions: Record<string, Conclusion>;
};

export type BenchAction =
  | { type: "hold"; held: Held | null }
  | { type: "preset"; microliters: number }
  | { type: "apply"; target: Target; now: number; release?: boolean }
  | { type: "click_vessel"; vesselId: string; now: number }
  | { type: "click_bottle"; reagentId: string; now: number }
  | { type: "click_slot"; slotId: string; now: number }
  | { type: "empty"; vesselId: string; now: number }
  | { type: "set_powder"; milligrams: number }
  | { type: "clock"; action: "start" | "stop" | "reset"; now: number }
  | { type: "wait"; seconds: number; now: number }
  | { type: "tare"; now: number }
  | { type: "fill_mark"; vesselId: string; now: number }
  | { type: "conclude"; targetId: string; vesselId: string; now: number }
  | { type: "remove_probe"; now: number }
  | { type: "undo"; now: number }
  | { type: "reset"; now: number }
  | { type: "release" }
  | { type: "dismiss_banner" }
  | { type: "load_log"; entries: ObservationLogEntry[] }
  | { type: "clear_log" };

export const apparatusLabel = (config: ChemistryLabConfig, id: string) => {
  const item = config.enabledApparatus.find((apparatus) => apparatus.id === id);
  return item?.labelVi ?? (item ? K2_APPARATUS[item.kind].labelVi : id);
};

export function initialBenchState(config: ChemistryLabConfig): BenchUiState {
  const initial: Snapshot = {
    bench: createBench(config),
    positions: Object.fromEntries(config.enabledApparatus.map((item) => [item.id, item.slot])),
    probeIn: null,
    strips: {},
    wasteMicroliters: 0,
    series: [{ t: 0, volumes: {} }],
  };
  return {
    config,
    context: engineContextFor(config),
    initial, current: initial, history: [], held: null,
    presetMicroliters: config.dispensing.liquidPresetsMicroliters[0], loadedMicroliters: 0,
    focusVesselId: null, flashes: {}, banner: null, notice: null, log: [], seen: { reactions: [], measurements: [] }, drip: null, stripColour: null,
    scaleZero: 0, powderMilligrams: POWDER_DEFAULT_MILLIGRAMS, conclusions: {},
  };
}

const HISTORY_LIMIT = 50;
const wasteId = (config: ChemistryLabConfig) => config.enabledApparatus.find((item) => item.kind === "waste_beaker")?.id ?? null;
const scaleVessels = (state: BenchUiState, snapshot: Snapshot) =>
  Object.values(snapshot.bench.vessels).filter((vessel) => slotById(snapshot.positions[vessel.vesselId] ?? "")?.kind === "scale");
/** What the scale shows for the vessels standing on it: the raw reading minus the zero set by the learner. */
export const scaleDisplayMicrograms = (state: BenchUiState, snapshot: Snapshot = state.current) => {
  const onScale = scaleVessels(state, snapshot);
  return (onScale.length ? scaleReadingMicrograms(onScale) : 0) - state.scaleZero;
};
const hasScale = (state: BenchUiState) => state.config.enabledApparatus.some((item) => item.kind === "electronic_scale");

function pushLog(state: BenchUiState, entry: Omit<ObservationLogEntry, "seq">): BenchUiState {
  const seq = (state.log.at(-1)?.seq ?? 0) + 1;
  const seen = {
    reactions: [...new Set([...state.seen.reactions, ...entry.reactions])],
    measurements: entry.measurement ? [...new Set([...state.seen.measurements, entry.measurement])] : state.seen.measurements,
  };
  const last = state.log.at(-1);
  if (entry.merge && last?.merge && last.merge.key === entry.merge.key && !entry.outOfScope && !last.outOfScope
      && entry.reactions.length === 0 && last.reactions.length === 0 && entry.equations.length === 0
      && JSON.stringify(last.phenomenaVi) === JSON.stringify(entry.phenomenaVi)) {
    const microliters = last.merge.microliters + entry.merge.microliters;
    const merged: ObservationLogEntry = { ...last, at: entry.at, readings: entry.readings, merge: { ...last.merge, microliters }, actionVi: `Thêm ${formatQuantity(microliters, Boolean(state.config.solutes?.length || state.config.rateModel))} ${last.merge.label}` };
    return { ...state, log: [...state.log.slice(0, -1), merged], seen };
  }
  return { ...state, log: [...state.log, { ...entry, seq }].slice(-OBSERVATION_LOG_LIMIT), seen };
}

const notice = (state: BenchUiState, textVi: string, now: number): BenchUiState => ({ ...state, notice: { textVi, at: now } });

function rejectionText(state: BenchUiState, result: Extract<ApplyResult, { status: "rejected" }>, vesselId: string) {
  const label = apparatusLabel(state.config, vesselId);
  switch (result.code) {
    case "VESSEL_FULL": return `${label} đã đầy, không thêm được nữa.`;
    case "REAGENT_NOT_AVAILABLE": return "Hoá chất này không có trong bài thực hành.";
    case "NOT_STOPPERABLE": return "Chỉ bình tam giác mới đậy được nút cao su.";
    case "EMPTY_SOURCE": return `${label} đang trống, không có gì để đổ.`;
    case "INVALID_OPERATION": return "Hãy mở nút bình trước khi rót.";
    case "NOT_DISSOLVED": return "Chất rắn chưa tan hết, cần thêm nước và khuấy đều.";
    case "NO_MARK": return "Chỉ bình định mức có vạch để thêm nước đến vạch.";
    case "WRONG_REAGENT_FORM": return "Vật chứa hoặc dụng cụ này không dùng được với loại hoá chất đó.";
    default: return "Thao tác này không thực hiện được.";
  }
}

function describeAction(state: BenchUiState, op: VesselOperation) {
  if (op.type === "add_liquid") return `Thêm ${formatQuantity(op.microliters, Boolean(state.config.solutes?.length || state.config.rateModel))} ${reagentLabel(op.reagentId)}`;
  if (op.type === "add_indicator") return `Thêm ${op.drops} giọt ${reagentLabel(op.reagentId)}`;
  if (op.type === "add_solid") {
    const composition = reagentById(op.reagentId)?.composition;
    return `Thả ${op.pieces} ${composition?.kind === "solid" ? PIECE_NAME[composition.shape] : "mẩu"} ${reagentLabel(op.reagentId)}`;
  }
  if (op.type === "pour_all") return `Đổ ${apparatusLabel(state.config, op.fromVesselId)} vào ${apparatusLabel(state.config, op.toVesselId)}`;
  if (op.type === "toggle_stopper") return state.current.bench.vessels[op.vesselId]?.stoppered ? "Mở nút cao su" : "Đậy nút cao su";
  if (op.type === "add_solid_mass") return `Lấy ${formatMilligrams(op.milligrams)} ${reagentLabel(op.reagentId)} bằng thìa cho vào ${apparatusLabel(state.config, op.vesselId)}`;
  if (op.type === "stir") return `Khuấy ${apparatusLabel(state.config, op.vesselId)} bằng đũa thuỷ tinh`;
  if (op.type === "fill_to_mark") return `Thêm nước đến vạch của ${apparatusLabel(state.config, op.vesselId)}`;
  return `Đổ ${apparatusLabel(state.config, op.vesselId)} vào cốc thải`;
}

function liveReadings(state: BenchUiState, snapshot: Snapshot, vesselId: string): ObservationLogEntry["readings"] {
  const readings: ObservationLogEntry["readings"] = {};
  if (snapshot.probeIn === vesselId) {
    const reading = measure(snapshot.bench.vessels[vesselId], "ph_meter");
    readings.ph = reading.ok && reading.kind === "ph_meter" ? formatPh(reading.tenthsPh) : "—";
  }
  if (hasScale(state) && slotById(snapshot.positions[vesselId] ?? "")?.kind === "scale") readings.scale = formatGrams(scaleDisplayMicrograms(state, snapshot));
  const volume = state.config.measurements.includes("volume") && snapshot.bench.vessels[vesselId].kind === "graduated_cylinder_100ml" ? readVolume(snapshot.bench.vessels[vesselId]) : null;
  if (volume?.ok) readings.volume = `${volume.milliliters} mL`;
  return readings;
}

/** Runs one model operation and records it. */
function runOperation(state: BenchUiState, op: VesselOperation, now: number): BenchUiState {
  const targetId = op.type === "pour_all" ? op.toVesselId : op.vesselId;
  const result = applyOperation(state.current.bench, op, state.context);
  if (result.status === "rejected") return notice(state, rejectionText(state, result, op.type === "pour_all" ? op.fromVesselId : targetId), now);
  if (result.status === "out_of_scope") {
    const label = apparatusLabel(state.config, result.outOfScope.vesselId);
    const textVi = `Tổ hợp pha trộn này nằm ngoài phạm vi mô hình của bài thực hành ${state.config.catalogId}. Em có thể Hoàn tác hoặc đổ ${label.toLowerCase()} vào cốc thải.`;
    return pushLog({ ...state, banner: { vesselId: result.outOfScope.vesselId, textVi, reasonVi: result.outOfScope.reasonVi }, focusVesselId: result.outOfScope.vesselId }, {
      at: now, vesselId: result.outOfScope.vesselId, locationVi: label, actionVi: describeAction(state, op),
      phenomenaVi: ["Không thực hiện: nằm ngoài phạm vi mô hình", ...(result.outOfScope.reasonVi ? [result.outOfScope.reasonVi] : [])],
      equations: [], readings: {}, reactions: [], outOfScope: true,
    });
  }
  const before = state.current;
  const strips = { ...before.strips };
  const changed = op.type === "pour_all" ? [op.fromVesselId, op.toVesselId] : [targetId];
  changed.forEach((id) => delete strips[id]);
  const wasteMicroliters = before.wasteMicroliters + (op.type === "empty_vessel" ? before.bench.vessels[op.vesselId].solutionMicroliters : 0);
  const current: Snapshot = { ...before, bench: result.bench, strips, wasteMicroliters };
  const transition = result.transitions[0] ?? null;
  const flashes = transition && Object.keys(transition.gasProducedNanomoles).length ? { ...state.flashes, [targetId]: { transition, at: now } } : state.flashes;
  const drip = op.type === "add_liquid" || op.type === "add_indicator" || op.type === "fill_to_mark" ? { vesselId: targetId, reagentId: op.reagentId, at: now } : state.drip;
  const next: BenchUiState = {
    ...state, current, flashes, drip, banner: null, notice: null, focusVesselId: targetId, conclusions: {},
    history: [...state.history, { snapshot: before, labelVi: describeAction(state, op) }].slice(-HISTORY_LIMIT),
  };
  const phenomena = op.type === "empty_vessel" ? ["Vật chứa đã sạch, sẵn sàng thử lại"]
    : op.type === "toggle_stopper" ? [result.bench.vessels[targetId].stoppered ? "Miệng bình đã được đậy kín" : "Miệng bình đã mở"]
      : describeVesselChange(before.bench.vessels[targetId], result.bench.vessels[targetId], transition);
  return pushLog(next, {
    at: now, vesselId: targetId, locationVi: apparatusLabel(state.config, targetId), actionVi: describeAction(state, op),
    phenomenaVi: phenomena, equations: equationsFor(transition, state.config), readings: liveReadings(state, current, targetId),
    reactions: transition?.fired.map((fired) => fired.reactionId) ?? [],
    ...(op.type === "add_liquid" || op.type === "add_indicator" ? { merge: { key: `${targetId}|${op.reagentId}`, microliters: op.type === "add_liquid" ? op.microliters : op.drops * 50, label: reagentLabel(op.reagentId) } } : {}),
  });
}

function measureWith(state: BenchUiState, tool: "litmus_paper" | "ph_meter", vesselId: string, now: number): BenchUiState {
  const vessel = state.current.bench.vessels[vesselId];
  const label = apparatusLabel(state.config, vesselId);
  const reading = measure(vessel, tool);
  const failure = !reading.ok ? (reading.code === "NO_SOLUTION" ? "Chưa có dung dịch để đo" : "Mô hình chưa tính pH cho dung dịch này") : null;
  if (tool === "litmus_paper") {
    const colour = reading.ok && reading.kind === "litmus_paper" ? reading.colour : null;
    const name = colour === "red" ? "đỏ" : colour === "blue" ? "xanh" : "tím (không đổi màu)";
    const current = colour ? { ...state.current, strips: { ...state.current.strips, [vesselId]: colour } } : state.current;
    return pushLog({ ...state, current, stripColour: colour, focusVesselId: vesselId, notice: failure ? { textVi: failure, at: now } : null }, {
      at: now, vesselId, locationVi: label, actionVi: "Nhúng giấy quỳ tím",
      phenomenaVi: [failure ?? `Giấy quỳ chuyển màu ${name}`], equations: [], readings: colour ? { litmus: name } : {}, reactions: [], measurement: "litmus_paper",
    });
  }
  const current = { ...state.current, probeIn: vesselId };
  const ph = reading.ok && reading.kind === "ph_meter" ? formatPh(reading.tenthsPh) : null;
  return pushLog({ ...state, current, held: null, focusVesselId: vesselId, notice: null }, {
    at: now, vesselId, locationVi: label, actionVi: "Cắm bút đo pH",
    phenomenaVi: [ph ? `Màn hình hiển thị pH = ${ph}` : failure!], equations: [], readings: ph ? { ph } : {}, reactions: [], measurement: "ph_meter",
  });
}

function applyHeld(state: BenchUiState, held: Held, target: Target, now: number): BenchUiState {
  const waste = wasteId(state.config);
  if (target.kind === "bottle") {
    const reagent = reagentById(target.reagentId);
    if (!reagent) return state;
    if (held.kind === "tool" && (held.tool === "dropper" || held.tool === "tongs" || held.tool === "spatula")) {
      if (reagent.dispenser !== held.tool) {
        if (reagent.dispenser === "pour") return notice(state, "Chai nước rót trực tiếp: chọn chai rồi chọn vật chứa, không cần dụng cụ.", now);
        const wanted = reagent.dispenser === "dropper" ? "ống nhỏ giọt" : reagent.dispenser === "spatula" ? "thìa" : "kẹp gắp";
        return notice(state, `Lọ này cần dùng ${wanted}.`, now);
      }
      return { ...state, held: { kind: "reagent", reagentId: reagent.id }, notice: null };
    }
    if (held.kind === "reagent") return { ...state, held: { kind: "reagent", reagentId: reagent.id }, notice: null };
    return notice(state, "Chọn ống nhỏ giọt, kẹp gắp hoặc thìa trước, rồi chọn lọ hoá chất.", now);
  }
  if (target.kind === "slot") {
    if (held.kind !== "vessel") return state;
    const slot = slotById(target.slotId);
    const kind = state.config.enabledApparatus.find((item) => item.id === held.vesselId)?.kind;
    if (!slot || !kind || !K2_APPARATUS[kind].movable || !isPlacementSlot(slot)) return notice(state, "Không đặt được vật chứa ở vị trí này.", now);
    if (Object.values(state.current.positions).includes(slot.id)) return notice(state, "Vị trí này đã có dụng cụ.", now);
    const before = state.current;
    const current = { ...before, positions: { ...before.positions, [held.vesselId]: slot.id } };
    const next = { ...state, current, held: null, notice: null, history: [...state.history, { snapshot: before, labelVi: "Di chuyển vật chứa" }].slice(-HISTORY_LIMIT) };
    return pushLog(next, {
      at: now, vesselId: held.vesselId, locationVi: apparatusLabel(state.config, held.vesselId), actionVi: `Đặt lên ${slot.labelVi.toLowerCase()}`,
      phenomenaVi: [slot.kind === "scale" ? "Vật chứa nằm trên đĩa cân" : "Vật chứa đặt trên mặt bàn"], equations: [], readings: liveReadings(state, current, held.vesselId), reactions: [],
      measurement: slot.kind === "scale" ? "scale" : undefined,
    });
  }
  const vesselId = target.vesselId;
  if (!state.current.bench.vessels[vesselId]) return state;
  if (vesselId === waste) {
    if (held.kind === "vessel" && held.vesselId !== waste) return runOperation({ ...state, held: null }, { type: "empty_vessel", vesselId: held.vesselId }, now);
    return notice(state, "Cốc thải chỉ dùng để đổ bỏ dung dịch từ vật chứa khác.", now);
  }
  if (held.kind === "vessel") {
    if (held.vesselId === vesselId) return { ...state, held: null, focusVesselId: vesselId };
    return runOperation({ ...state, held: null }, { type: "pour_all", fromVesselId: held.vesselId, toVesselId: vesselId }, now);
  }
  if (held.kind === "tool") {
    if (held.tool === "stopper") return runOperation({ ...state, held: null }, { type: "toggle_stopper", vesselId }, now);
    if (held.tool === "glass_rod") return runOperation(state, { type: "stir", vesselId }, now);
    if (held.tool === "dropper" || held.tool === "tongs" || held.tool === "spatula") {
      return notice(state, held.tool === "dropper" ? "Ống nhỏ giọt đang trống: hãy chọn một lọ dung dịch để hút trước." : held.tool === "spatula" ? "Thìa đang trống: hãy chọn một lọ chất bột để lấy trước." : "Kẹp gắp đang trống: hãy chọn một lọ chất rắn để gắp trước.", now);
    }
    return measureWith(state, held.tool, vesselId, now);
  }
  const reagent = reagentById(held.reagentId);
  if (!reagent) return state;
  const composition = reagent.composition;
  if (composition.kind === "solid") return runOperation(state, { type: "add_solid", vesselId, reagentId: reagent.id, pieces: 1 }, now);
  if (composition.kind === "powder") return runOperation(state, { type: "add_solid_mass", vesselId, reagentId: reagent.id, milligrams: state.powderMilligrams }, now);
  // A bottle that is poured straight from (water for FL-11): the preset volume each time, no dropper to fill.
  if (reagent.dispenser === "pour" && composition.kind === "solution") {
    return runOperation(state, { type: "add_liquid", vesselId, reagentId: reagent.id, microliters: state.presetMicroliters }, now);
  }
  const loaded = state.loadedMicroliters;
  if (loaded <= 0) return emptyDropper(state, now);
  const dose = Math.min(loaded, composition.kind === "indicator" ? Math.min(state.presetMicroliters, 250) : state.presetMicroliters);
  let op: Operation;
  let used: number;
  if (composition.kind === "indicator") {
    const drops = Math.max(1, Math.floor(dose / composition.microlitersPerDrop));
    op = { type: "add_indicator", vesselId, reagentId: reagent.id, drops };
    used = drops * composition.microlitersPerDrop;
  } else {
    op = { type: "add_liquid", vesselId, reagentId: reagent.id, microliters: dose };
    used = dose;
  }
  const after = runOperation(state, op, now);
  if (after.drip === state.drip) return after; // rejected or out of scope: nothing left the dropper
  const left = Math.max(0, loaded - used);
  return left > 0 ? { ...after, loadedMicroliters: left } : emptyDropper(after, now);
}

const isDropperReagent = (reagentId: string) => reagentById(reagentId)?.dispenser === "dropper";

/** The dropper ran dry: back to an empty dropper in hand, ready to draw from a bottle. */
function emptyDropper(state: BenchUiState, now: number): BenchUiState {
  const id = state.config.enabledApparatus.find((item) => item.kind === "dropper_pipette")?.id;
  return {
    ...state, loadedMicroliters: 0, held: id ? { kind: "tool", tool: "dropper", apparatusId: id } : null,
    notice: { textVi: "Ống nhỏ giọt đã hết dung dịch — hãy đưa vào lọ hóa chất để hút thêm (tối đa 1,0 mL).", at: now },
  };
}

/** Whenever a new dropper reagent is picked up, the dropper is filled to capacity. */
export function benchReducer(state: BenchUiState, action: BenchAction): BenchUiState {
  const next = reduce(state, action);
  const held = next.held;
  if (held?.kind !== "reagent") return next;
  const previous = state.held;
  if (previous?.kind === "reagent" && previous.reagentId === held.reagentId) return next;
  return { ...next, loadedMicroliters: isDropperReagent(held.reagentId) ? DROPPER_CAPACITY_MICROLITERS : 0 };
}

function reduce(state: BenchUiState, action: BenchAction): BenchUiState {
  switch (action.type) {
    case "release": return { ...state, held: null, stripColour: null, notice: null };
    case "hold": {
      if (action.held?.kind === "vessel" && action.held.vesselId === wasteId(state.config)) return notice(state, "Cốc thải chỉ để đổ bỏ; hãy chọn vật chứa cần làm sạch.", Date.now());
      const takePen = action.held?.kind === "tool" && action.held.tool === "ph_meter" && state.current.probeIn;
      return { ...state, current: takePen ? { ...state.current, probeIn: null } : state.current, stripColour: null, held: action.held, notice: null, focusVesselId: action.held?.kind === "vessel" ? action.held.vesselId : state.focusVesselId };
    }
    case "preset": return { ...state, presetMicroliters: action.microliters };
    case "clock": {
      const result = applyOperation(state.current.bench, { type: "clock", action: action.action }, state.context);
      if (result.status !== "applied") return state;
      const seconds = result.bench.clock?.seconds ?? 0;
      const label = action.action === "start" ? "Bắt đầu bấm giờ" : action.action === "stop" ? "Dừng đồng hồ" : "Đưa đồng hồ về 0";
      return pushLog({ ...state, current: { ...state.current, bench: result.bench }, notice: null }, {
        at: action.now, vesselId: null, locationVi: "Đồng hồ bấm giờ", actionVi: label, phenomenaVi: [`Đồng hồ chỉ ${formatClock(seconds)}`],
        equations: [], readings: { time: formatClock(seconds) }, reactions: [], measurement: "time",
      });
    }
    case "wait": {
      const before = state.current;
      const result = applyOperation(before.bench, { type: "advance_time", seconds: action.seconds }, state.context);
      if (result.status === "rejected") return notice(state, result.code === "TIME_LIMIT" ? "Đã tới giới hạn thời gian của bài này (10 phút mô phỏng). Hãy bấm Làm mới để thử lại." : "Bài này không có trục thời gian.", action.now);
      if (result.status !== "applied") return state;
      const bench = result.bench;
      const elapsed = bench.elapsedSeconds ?? 0;
      const volumes: Record<string, number> = {};
      for (const vessel of Object.values(bench.vessels)) {
        const reading = readGasVolume(vessel);
        if (reading.ok) volumes[vessel.vesselId] = reading.tenthsMilliliters;
      }
      const current: Snapshot = { ...before, bench, series: [...before.series, { t: elapsed, volumes }] };
      const flashes = { ...state.flashes };
      for (const transition of result.transitions) flashes[transition.vesselId] = { transition, at: action.now };
      const word = { none: "không sủi bọt", low: "sủi bọt nhẹ", medium: "sủi bọt vừa", vigorous: "sủi bọt mạnh" } as const;
      const lines = result.transitions.map((transition) => {
        const vessel = bench.vessels[transition.vesselId];
        const intensity = observeVessel(vessel, transition).visual.gasBubbles.intensity;
        const collected = readGasVolume(vessel);
        return `${apparatusLabel(state.config, transition.vesselId)}: ${word[intensity]}${collected.ok ? `, khí thu được ${formatGasMl(collected.tenthsMilliliters)}` : ", khí thoát ra ngoài (bình chưa đậy nút)"}`;
      });
      const next: BenchUiState = {
        ...state, current, flashes, banner: null, notice: null,
        history: [...state.history, { snapshot: before, labelVi: `Chờ ${action.seconds} giây` }].slice(-HISTORY_LIMIT),
      };
      return pushLog(next, {
        at: action.now, vesselId: null, locationVi: "Bàn thí nghiệm", actionVi: `Chờ ${action.seconds} giây (đã trôi ${formatClock(elapsed)})`,
        phenomenaVi: lines.length ? lines : ["Không thấy biến đổi rõ rệt"], equations: [],
        readings: bench.clock ? { time: formatClock(bench.clock.seconds) } : {}, reactions: result.transitions.flatMap((transition) => transition.fired.map((fired) => fired.reactionId)), measurement: "time",
      });
    }
    case "set_powder": return { ...state, powderMilligrams: Math.max(1, Math.min(POWDER_MAX_MILLIGRAMS, Math.round(Number.isFinite(action.milligrams) ? action.milligrams : POWDER_DEFAULT_MILLIGRAMS))) };
    case "tare": {
      const zero = scaleDisplayMicrograms({ ...state, scaleZero: 0 });
      return pushLog({ ...state, scaleZero: zero, notice: null }, {
        at: action.now, vesselId: null, locationVi: "Cân điện tử", actionVi: "Nhấn nút về 0 trên cân",
        phenomenaVi: [zero ? "Cân về 0 với vật đang đặt trên đĩa" : "Cân về 0"], equations: [], readings: { scale: formatGrams(0) }, reactions: [], measurement: "scale",
      });
    }
    case "fill_mark": {
      const water = state.config.availableReagents.map((item) => reagentById(item.reagentId)).find((reagent) => reagent?.composition.kind === "solution" && reagent.composition.solute === null);
      if (!water) return notice(state, "Bài này không có lọ nước để thêm đến vạch.", action.now);
      return runOperation(state, { type: "fill_to_mark", vesselId: action.vesselId, reagentId: water.id }, action.now);
    }
    case "conclude": {
      const target = state.config.targets?.find((item) => item.id === action.targetId);
      const vessel = state.current.bench.vessels[action.vesselId];
      if (!target || !vessel) return state;
      const result = assessSolution(vessel, target);
      if (!result.ok) {
        const textVi = result.code === "NOT_DISSOLVED" ? "Chất rắn chưa tan hết, cần thêm nước và khuấy đều." : result.code === "NO_SOLUTION" ? "Vật chứa này chưa có dung dịch." : "Vật chứa này chưa có chất tan của mục tiêu.";
        return notice(state, textVi, action.now);
      }
      const label = apparatusLabel(state.config, action.vesselId);
      return pushLog({ ...state, conclusions: { ...state.conclusions, [target.id]: { targetId: target.id, vesselId: action.vesselId, result } }, focusVesselId: action.vesselId, notice: null }, {
        at: action.now, vesselId: action.vesselId, locationVi: label, actionVi: `Kết luận: ${target.titleVi}`,
        phenomenaVi: [`Nồng độ phần trăm ${formatPercent(result.tenthsPercent)}, nồng độ mol ${formatMolar(result.millimolar)}`, result.withinTarget ? "Nằm trong dung sai của mục tiêu" : "Nằm ngoài dung sai của mục tiêu"],
        equations: [], readings: {}, reactions: [],
      });
    }
    case "apply": {
      if (!state.held) return state;
      const next = applyHeld(state, state.held, action.target, action.now);
      // Droppers and measuring tools stay in hand for repeated use; a drag is a single gesture.
      return action.release && action.target.kind !== "bottle" ? { ...next, held: null } : next;
    }
    case "click_vessel": {
      if (state.held) return benchReducer(state, { type: "apply", target: { kind: "vessel", vesselId: action.vesselId }, now: action.now });
      if (action.vesselId === wasteId(state.config)) return { ...state, focusVesselId: null, notice: { textVi: "Chọn một vật chứa trước, rồi chọn cốc thải để đổ bỏ.", at: action.now } };
      return { ...state, held: { kind: "vessel", vesselId: action.vesselId }, focusVesselId: action.vesselId, notice: null };
    }
    case "click_bottle": {
      const held = state.held;
      if (held?.kind === "reagent" && held.reagentId === action.reagentId) {
        const refill = isDropperReagent(held.reagentId) && state.loadedMicroliters < DROPPER_CAPACITY_MICROLITERS;
        return refill ? { ...state, loadedMicroliters: DROPPER_CAPACITY_MICROLITERS, notice: null } : { ...state, held: null };
      }
      if (held && ((held.kind === "tool" && (held.tool === "dropper" || held.tool === "tongs" || held.tool === "spatula")) || held.kind === "reagent")) return benchReducer(state, { type: "apply", target: { kind: "bottle", reagentId: action.reagentId }, now: action.now });
      return { ...state, held: { kind: "reagent", reagentId: action.reagentId }, stripColour: null, notice: null };
    }
    case "click_slot": return state.held ? benchReducer(state, { type: "apply", target: { kind: "slot", slotId: action.slotId }, now: action.now }) : state;
    case "empty": return runOperation(state, { type: "empty_vessel", vesselId: action.vesselId }, action.now);
    case "remove_probe": {
      if (!state.current.probeIn) return state;
      return pushLog({ ...state, current: { ...state.current, probeIn: null } }, {
        at: action.now, vesselId: state.current.probeIn, locationVi: apparatusLabel(state.config, state.current.probeIn), actionVi: "Rút bút đo pH",
        phenomenaVi: ["Bút đo pH trở về khay"], equations: [], readings: {}, reactions: [],
      });
    }
    case "undo": {
      const last = state.history.at(-1);
      if (!last) return notice(state, "Chưa có thao tác nào để hoàn tác.", action.now);
      return pushLog({ ...state, current: last.snapshot, history: state.history.slice(0, -1), banner: null, notice: null, flashes: {}, conclusions: {} }, {
        at: action.now, vesselId: null, locationVi: "Bàn thí nghiệm", actionVi: `Hoàn tác: ${last.labelVi}`, phenomenaVi: ["Bàn trở về trạng thái trước thao tác"], equations: [], readings: {}, reactions: [],
      });
    }
    case "reset":
      return pushLog({ ...state, current: state.initial, history: [], held: null, banner: null, notice: null, flashes: {}, focusVesselId: null, conclusions: {}, scaleZero: 0 }, {
        at: action.now, vesselId: null, locationVi: "Bàn thí nghiệm", actionVi: "Làm mới bàn thí nghiệm", phenomenaVi: ["Mọi vật chứa trở về trạng thái ban đầu"], equations: [], readings: {}, reactions: [],
      });
    case "dismiss_banner": return { ...state, banner: null };
    case "load_log": {
      // Effects may run twice (StrictMode, remount): never duplicate stored entries.
      const key = (entry: ObservationLogEntry) => `${entry.at}|${entry.seq}|${entry.actionVi}`;
      const present = new Set(state.log.map(key));
      const stored = action.entries.filter((entry) => !present.has(key(entry)));
      if (!stored.length) return state;
      return { ...state, log: [...stored, ...state.log].sort((a, b) => a.at - b.at).slice(-OBSERVATION_LOG_LIMIT) };
    }
    case "clear_log": return { ...state, log: [], seen: { reactions: [], measurements: [] } };
  }
}

/** Valid drop targets for what is being held (used for 3D highlights and drag snapping). */
export function validTargets(state: BenchUiState, held: Held | null): Target[] {
  if (!held) return [];
  const vessels = Object.keys(state.current.bench.vessels);
  const waste = wasteId(state.config);
  if (held.kind === "vessel") {
    const kind = state.config.enabledApparatus.find((item) => item.id === held.vesselId)?.kind;
    const occupied = new Set(Object.values(state.current.positions));
    const slots: Target[] = kind && K2_APPARATUS[kind].movable
      ? ["bench_1", "bench_2", "bench_3", ...(hasScale(state) ? ["scale_1", "scale_2"] : [])].filter((id) => !occupied.has(id)).map((slotId) => ({ kind: "slot", slotId }))
      : [];
    return [...vessels.filter((id) => id !== held.vesselId).map((vesselId): Target => ({ kind: "vessel", vesselId })), ...slots];
  }
  const bottles = (dispenser: "dropper" | "tongs" | "spatula") => state.config.availableReagents.filter((item) => reagentById(item.reagentId)?.dispenser === dispenser).map((item): Target => ({ kind: "bottle", reagentId: item.reagentId }));
  if (held.kind === "tool" && held.tool === "dropper") return bottles("dropper");
  if (held.kind === "tool" && held.tool === "tongs") return bottles("tongs");
  if (held.kind === "tool" && held.tool === "spatula") return bottles("spatula");
  if (held.kind === "tool" && held.tool === "stopper") {
    return vessels.filter((id) => state.current.bench.vessels[id].stopperable).map((vesselId) => ({ kind: "vessel", vesselId }));
  }
  return vessels.filter((id) => id !== waste).map((vesselId) => ({ kind: "vessel", vesselId }));
}

export const vesselIds = (config: ChemistryLabConfig) => config.enabledApparatus.filter((item) => isVesselKind(item.kind)).map((item) => item.id);
