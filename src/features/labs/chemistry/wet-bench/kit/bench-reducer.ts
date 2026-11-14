/**
 * K2 Explore bench state. Pure reducer: every 3D drag, 3D click, DOM button and keyboard action
 * goes through the same `hold` / `apply` actions, so all input methods behave identically.
 */
import {
  applyOperation, createBench, measure, reagentById, scaleReadingMicrograms,
  type ApplyResult, type Bench, type ChemistryLabConfig, type EngineContext, type Operation, type Transition,
} from "@nexalab/sim/wet-bench";
import { K2_APPARATUS, isVesselKind, type HeldTool } from "./apparatus-manifest";
import { isPlacementSlot, slotById } from "./bench-layout";
import { describeVesselChange, equationsFor, formatGrams, formatPh, formatQuantity, PIECE_NAME, reagentLabel, type ObservationLogEntry } from "./observation-log";

export type Held =
  | { kind: "reagent"; reagentId: string }
  | { kind: "tool"; tool: HeldTool; apparatusId: string }
  | { kind: "vessel"; vesselId: string };

export type Target = { kind: "vessel"; vesselId: string } | { kind: "slot"; slotId: string } | { kind: "bottle"; reagentId: string };

export type Snapshot = {
  bench: Bench;
  /** apparatusId → slotId; presentation only, never sent to the model. */
  positions: Record<string, string>;
  probeIn: string | null;
  strips: Record<string, "red" | "purple" | "blue">;
  wasteMicroliters: number;
};

export type BenchUiState = {
  config: ChemistryLabConfig;
  context: EngineContext;
  initial: Snapshot;
  current: Snapshot;
  history: Array<{ snapshot: Snapshot; labelVi: string }>;
  held: Held | null;
  presetMicroliters: number;
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
};

export type BenchAction =
  | { type: "hold"; held: Held | null }
  | { type: "preset"; microliters: number }
  | { type: "apply"; target: Target; now: number; release?: boolean }
  | { type: "click_vessel"; vesselId: string; now: number }
  | { type: "click_bottle"; reagentId: string; now: number }
  | { type: "click_slot"; slotId: string; now: number }
  | { type: "empty"; vesselId: string; now: number }
  | { type: "remove_probe"; now: number }
  | { type: "undo"; now: number }
  | { type: "reset"; now: number }
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
  };
  return {
    config,
    context: { allowedReactions: config.allowedReactions, availableReagents: config.availableReagents.map((item) => item.reagentId) },
    initial, current: initial, history: [], held: null,
    presetMicroliters: config.dispensing.liquidPresetsMicroliters[0],
    focusVesselId: null, flashes: {}, banner: null, notice: null, log: [], seen: { reactions: [], measurements: [] }, drip: null, stripColour: null,
  };
}

const HISTORY_LIMIT = 50;
const wasteId = (config: ChemistryLabConfig) => config.enabledApparatus.find((item) => item.kind === "waste_beaker")?.id ?? null;
const scaleVessels = (state: BenchUiState, snapshot: Snapshot) =>
  Object.values(snapshot.bench.vessels).filter((vessel) => slotById(snapshot.positions[vessel.vesselId] ?? "")?.kind === "scale");
const hasScale = (state: BenchUiState) => state.config.enabledApparatus.some((item) => item.kind === "electronic_scale");

function pushLog(state: BenchUiState, entry: Omit<ObservationLogEntry, "seq">): BenchUiState {
  const seq = (state.log.at(-1)?.seq ?? 0) + 1;
  const seen = {
    reactions: [...new Set([...state.seen.reactions, ...entry.reactions])],
    measurements: entry.measurement ? [...new Set([...state.seen.measurements, entry.measurement])] : state.seen.measurements,
  };
  return { ...state, log: [...state.log, { ...entry, seq }].slice(-500), seen };
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
    default: return "Thao tác này không thực hiện được.";
  }
}

function describeAction(state: BenchUiState, op: Operation) {
  if (op.type === "add_liquid") return `Thêm ${formatQuantity(op.microliters)} ${reagentLabel(op.reagentId)}`;
  if (op.type === "add_indicator") return `Thêm ${op.drops} giọt ${reagentLabel(op.reagentId)}`;
  if (op.type === "add_solid") {
    const composition = reagentById(op.reagentId)?.composition;
    return `Thả ${op.pieces} ${composition?.kind === "solid" ? PIECE_NAME[composition.shape] : "mẩu"} ${reagentLabel(op.reagentId)}`;
  }
  if (op.type === "pour_all") return `Đổ ${apparatusLabel(state.config, op.fromVesselId)} vào ${apparatusLabel(state.config, op.toVesselId)}`;
  if (op.type === "toggle_stopper") return state.current.bench.vessels[op.vesselId]?.stoppered ? "Mở nút cao su" : "Đậy nút cao su";
  return `Đổ ${apparatusLabel(state.config, op.vesselId)} vào cốc thải`;
}

function liveReadings(state: BenchUiState, snapshot: Snapshot, vesselId: string): ObservationLogEntry["readings"] {
  const readings: ObservationLogEntry["readings"] = {};
  if (snapshot.probeIn === vesselId) {
    const reading = measure(snapshot.bench.vessels[vesselId], "ph_meter");
    readings.ph = reading.ok && reading.kind === "ph_meter" ? formatPh(reading.tenthsPh) : "—";
  }
  if (hasScale(state) && slotById(snapshot.positions[vesselId] ?? "")?.kind === "scale") readings.scale = formatGrams(scaleReadingMicrograms(scaleVessels(state, snapshot)));
  return readings;
}

/** Runs one model operation and records it. */
function runOperation(state: BenchUiState, op: Operation, now: number): BenchUiState {
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
  const drip = op.type === "add_liquid" || op.type === "add_indicator" ? { vesselId: targetId, reagentId: op.reagentId, at: now } : state.drip;
  const next: BenchUiState = {
    ...state, current, flashes, drip, banner: null, notice: null, focusVesselId: targetId,
    history: [...state.history, { snapshot: before, labelVi: describeAction(state, op) }].slice(-HISTORY_LIMIT),
  };
  const phenomena = op.type === "empty_vessel" ? ["Vật chứa đã sạch, sẵn sàng thử lại"]
    : op.type === "toggle_stopper" ? [result.bench.vessels[targetId].stoppered ? "Miệng bình đã được đậy kín" : "Miệng bình đã mở"]
      : describeVesselChange(before.bench.vessels[targetId], result.bench.vessels[targetId], transition);
  return pushLog(next, {
    at: now, vesselId: targetId, locationVi: apparatusLabel(state.config, targetId), actionVi: describeAction(state, op),
    phenomenaVi: phenomena, equations: equationsFor(transition, state.config), readings: liveReadings(state, current, targetId),
    reactions: transition?.fired.map((fired) => fired.reactionId) ?? [],
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
    if (held.kind === "tool" && (held.tool === "dropper" || held.tool === "tongs")) {
      if (reagent.dispenser !== (held.tool === "dropper" ? "dropper" : "tongs")) return notice(state, held.tool === "dropper" ? "Lọ này đựng chất rắn: hãy dùng kẹp gắp." : "Lọ này đựng dung dịch: hãy dùng ống nhỏ giọt.", now);
      return { ...state, held: { kind: "reagent", reagentId: reagent.id }, notice: null };
    }
    if (held.kind === "reagent") return { ...state, held: { kind: "reagent", reagentId: reagent.id }, notice: null };
    return notice(state, "Chọn ống nhỏ giọt hoặc kẹp gắp trước, rồi chọn lọ hoá chất.", now);
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
    if (held.tool === "dropper" || held.tool === "tongs") return notice(state, held.tool === "dropper" ? "Ống nhỏ giọt đang trống: hãy chọn một lọ dung dịch để hút trước." : "Kẹp gắp đang trống: hãy chọn một lọ chất rắn để gắp trước.", now);
    return measureWith(state, held.tool, vesselId, now);
  }
  const reagent = reagentById(held.reagentId);
  if (!reagent) return state;
  const composition = reagent.composition;
  const op: Operation = composition.kind === "solid"
    ? { type: "add_solid", vesselId, reagentId: reagent.id, pieces: 1 }
    : composition.kind === "indicator"
      ? { type: "add_indicator", vesselId, reagentId: reagent.id, drops: Math.max(1, Math.round(Math.min(state.presetMicroliters, 250) / composition.microlitersPerDrop)) }
      : { type: "add_liquid", vesselId, reagentId: reagent.id, microliters: state.presetMicroliters };
  return runOperation(state, op, now);
}

export function benchReducer(state: BenchUiState, action: BenchAction): BenchUiState {
  switch (action.type) {
    case "hold": {
      if (action.held?.kind === "vessel" && action.held.vesselId === wasteId(state.config)) return notice(state, "Cốc thải chỉ để đổ bỏ; hãy chọn vật chứa cần làm sạch.", Date.now());
      const takePen = action.held?.kind === "tool" && action.held.tool === "ph_meter" && state.current.probeIn;
      return { ...state, current: takePen ? { ...state.current, probeIn: null } : state.current, stripColour: null, held: action.held, notice: null, focusVesselId: action.held?.kind === "vessel" ? action.held.vesselId : state.focusVesselId };
    }
    case "preset": return { ...state, presetMicroliters: action.microliters };
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
      if (held?.kind === "reagent" && held.reagentId === action.reagentId) return { ...state, held: null };
      if (held && ((held.kind === "tool" && (held.tool === "dropper" || held.tool === "tongs")) || held.kind === "reagent")) return benchReducer(state, { type: "apply", target: { kind: "bottle", reagentId: action.reagentId }, now: action.now });
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
      return pushLog({ ...state, current: last.snapshot, history: state.history.slice(0, -1), banner: null, notice: null, flashes: {} }, {
        at: action.now, vesselId: null, locationVi: "Bàn thí nghiệm", actionVi: `Hoàn tác: ${last.labelVi}`, phenomenaVi: ["Bàn trở về trạng thái trước thao tác"], equations: [], readings: {}, reactions: [],
      });
    }
    case "reset":
      return pushLog({ ...state, current: state.initial, history: [], held: null, banner: null, notice: null, flashes: {}, focusVesselId: null }, {
        at: action.now, vesselId: null, locationVi: "Bàn thí nghiệm", actionVi: "Làm mới bàn thí nghiệm", phenomenaVi: ["Mọi vật chứa trở về trạng thái ban đầu"], equations: [], readings: {}, reactions: [],
      });
    case "dismiss_banner": return { ...state, banner: null };
    case "load_log": {
      // Effects may run twice (StrictMode, remount): never duplicate stored entries.
      const key = (entry: ObservationLogEntry) => `${entry.at}|${entry.seq}|${entry.actionVi}`;
      const present = new Set(state.log.map(key));
      const stored = action.entries.filter((entry) => !present.has(key(entry)));
      if (!stored.length) return state;
      return { ...state, log: [...stored, ...state.log].sort((a, b) => a.at - b.at).slice(-500) };
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
  const bottles = (dispenser: "dropper" | "tongs") => state.config.availableReagents.filter((item) => reagentById(item.reagentId)?.dispenser === dispenser).map((item): Target => ({ kind: "bottle", reagentId: item.reagentId }));
  if (held.kind === "tool" && held.tool === "dropper") return bottles("dropper");
  if (held.kind === "tool" && held.tool === "tongs") return bottles("tongs");
  if (held.kind === "tool" && held.tool === "stopper") {
    return vessels.filter((id) => state.current.bench.vessels[id].stopperable).map((vesselId) => ({ kind: "vessel", vesselId }));
  }
  return vessels.filter((id) => id !== waste).map((vesselId) => ({ kind: "vessel", vesselId }));
}

export const vesselIds = (config: ChemistryLabConfig) => config.enabledApparatus.filter((item) => isVesselKind(item.kind)).map((item) => item.id);
