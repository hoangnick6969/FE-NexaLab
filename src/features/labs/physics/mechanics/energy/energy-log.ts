/** Learner notebook of the mechanical energy bench: local, unscored, never evidence. Storage is the shared Explore store. */
import { createObservationLogStore } from "../../../shared/explore/observation-log";

export type PendulumPositionId = "release" | "mid-down" | "lowest" | "mid-up" | "far-high";
export type PendulumView = { massG: number; dropHeightMm: number; position: PendulumPositionId; heightMm: number; potentialMj: number; kineticMj: number; mechanicalMj: number };
export type LiftView = { massG: number; distanceMm: number; motorId: string; motorVi: string; forceMilliNewtons: number; durationMs: number; workMj: number; powerMw: number };
export type EnergyLogEntry = {
  seq: number;
  at: number;
  station: "pendulum" | "hoist";
  actionVi: string;
  phenomenaVi: string[];
  pendulum?: PendulumView;
  lift?: LiftView;
  /** Dragging a slider folds consecutive steps into one line. */
  merge?: string;
};

export const energyLogStore = createObservationLogStore<EnergyLogEntry>("nexalab-energy-explore");

export const POSITION_VI: Record<PendulumPositionId, string> = {
  release: "điểm thả",
  "mid-down": "giữa đường đi xuống",
  lowest: "điểm thấp nhất",
  "mid-up": "giữa đường đi lên",
  "far-high": "điểm cao nhất bên kia",
};

const number = (value: number, digits = 3) => value.toLocaleString("vi-VN", { maximumFractionDigits: digits });
/** mJ shown as J, mW as W, mN as N, ms as s (the units of SGK). */
export const formatJoules = (milliJoules: number) => `${number(milliJoules / 1000)} J`;
export const formatWatts = (milliWatts: number) => `${number(milliWatts / 1000)} W`;
export const formatNewtons = (milliNewtons: number) => `${number(milliNewtons / 1000, 2)} N`;
export const formatSeconds = (ms: number) => `${number(ms / 1000, 2)} s`;
export const formatMetres = (mm: number) => `${number(mm / 1000)} m`;

export function describePendulumAction(before: PendulumView, after: PendulumView): string | null {
  if (after.massG !== before.massG) return `Đổi quả nặng thành ${after.massG} g, thả từ độ cao ${after.dropHeightMm} mm`;
  if (after.dropHeightMm !== before.dropHeightMm) return `Kéo con lắc tới độ cao thả ${after.dropHeightMm} mm (quả nặng ${after.massG} g)`;
  if (after.position !== before.position) return `Xem con lắc ở ${POSITION_VI[after.position]} (độ cao ${after.heightMm} mm)`;
  return null;
}

/** What the bars do; with `readings` the energies are added. */
export function describePendulumChange(before: PendulumView, after: PendulumView, readings = false): string[] {
  let trend: string;
  if (after.massG !== before.massG || after.dropHeightMm !== before.dropHeightMm) {
    trend = after.mechanicalMj > before.mechanicalMj ? "Cơ năng lớn hơn trước" : after.mechanicalMj < before.mechanicalMj ? "Cơ năng nhỏ hơn trước" : "Cơ năng như trước";
  } else if (after.heightMm < before.heightMm) trend = "Đi xuống: thế năng giảm, động năng tăng; cơ năng không đổi";
  else if (after.heightMm > before.heightMm) trend = "Đi lên: động năng giảm, thế năng tăng; cơ năng không đổi";
  else trend = "Cùng độ cao: thế năng và động năng như trước";
  const at = after.position === "lowest" ? "Ở điểm thấp nhất động năng lớn nhất, thế năng bằng 0"
    : after.position === "far-high" ? `Con lắc lên tới đúng ${after.heightMm} mm, bằng độ cao thả`
    : after.position === "release" ? "Ở điểm thả động năng bằng 0" : "Thế năng và động năng bằng nhau";
  const values = readings ? ` (Wt ${formatJoules(after.potentialMj)}, Wđ ${formatJoules(after.kineticMj)}, W ${formatJoules(after.mechanicalMj)})` : "";
  return [trend, at + values];
}

export const describeLiftAction = (lift: LiftView) => `Tời kéo vật ${lift.massG} g lên ${lift.distanceMm} mm bằng ${lift.motorVi.toLowerCase()}`;

/** The instrument readings always; work and power only after "Kiểm tra" (or with `readings`). */
export function describeLift(lift: LiftView, showResult: boolean): string[] {
  const read = `Lực kế ${formatNewtons(lift.forceMilliNewtons)}, quãng đường ${formatMetres(lift.distanceMm)}, thời gian ${formatSeconds(lift.durationMs)}`;
  return showResult ? [read, `Công A = ${formatJoules(lift.workMj)}, công suất P = ${formatWatts(lift.powerMw)}`] : [read];
}

/** Parses what a student typed ("5", "1,25") and checks it against the model to the displayed precision. */
export function matchesValue(typed: string, milliUnits: number): boolean | null {
  const text = typed.trim().replace(",", ".");
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return false;
  return Math.abs(value * 1000 - milliUnits) <= Math.max(1, Math.abs(milliUnits) * 0.01);
}

/** Adds one line, or folds it into the last line when it continues the same slider drag. */
export function appendEnergyEntry(log: readonly EnergyLogEntry[], entry: Omit<EnergyLogEntry, "seq">): EnergyLogEntry[] {
  const last = log.at(-1);
  if (entry.merge && last?.merge === entry.merge) return [...log.slice(0, -1), { ...entry, seq: last.seq }];
  return [...log, { ...entry, seq: (last?.seq ?? 0) + 1 }];
}

/** Angle of the string from the vertical for a bob height h on a string of length L (h = L·(1 − cos θ)); left side negative. */
export function pendulumAngle(lengthMm: number, heightMm: number, position: PendulumPositionId) {
  const theta = Math.acos(Math.max(-1, Math.min(1, 1 - heightMm / lengthMm)));
  return position === "release" || position === "mid-down" ? -theta : theta;
}
