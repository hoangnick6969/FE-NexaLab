/** Learner notebook of the fluid bench: local, unscored, never evidence. Storage is the shared Explore store. */
import { createObservationLogStore } from "../../../shared/explore/observation-log";

export type ProbeReading = { depthMm: number; positionMm: number; levels: { A: number; B: number; C: number }; pascals: { A: number; C: number } };
export type PistonReading = { pan1: number; pan2: number; outcome: "balanced" | "piston1_down" | "piston2_down"; pascals: [number, number] };
export type PressureLogEntry = {
  seq: number;
  at: number;
  station: "depth-probe" | "pistons";
  actionVi: string;
  phenomenaVi: string[];
  probe?: ProbeReading;
  pistons?: PistonReading;
  /** Dragging the depth slider folds consecutive steps into one line. */
  merge?: string;
};

export const pressureLogStore = createObservationLogStore<PressureLogEntry>("nexalab-fluid-explore");

export const positionVi = (mm: number) => mm === 0 ? "giữa bể" : `${mm < 0 ? "lệch trái" : "lệch phải"} ${Math.abs(mm)} mm`;
export const formatPascals = (pascals: number) => `${pascals.toLocaleString("vi-VN")} Pa`;
export const OUTCOME_VI: Record<PistonReading["outcome"], string> = {
  balanced: "Hai pit-tông cân bằng",
  piston1_down: "Pit-tông (1) đi xuống, pit-tông (2) đi lên",
  piston2_down: "Pit-tông (2) đi xuống, pit-tông (1) đi lên",
};

const levelVi = (level: number) => level === 0 ? "phẳng" : `lõm mức ${level}`;

export function describeProbeAction(before: ProbeReading, after: ProbeReading): string | null {
  if (after.depthMm !== before.depthMm && after.positionMm === before.positionMm)
    return `${after.depthMm > before.depthMm ? "Hạ" : "Nâng"} bình trụ tới độ sâu ${after.depthMm} mm (${positionVi(after.positionMm)})`;
  if (after.positionMm !== before.positionMm && after.depthMm === before.depthMm)
    return `Dời bình trụ sang ${positionVi(after.positionMm)}, giữ độ sâu ${after.depthMm} mm`;
  if (after.positionMm !== before.positionMm) return `Đặt bình trụ ở độ sâu ${after.depthMm} mm, ${positionVi(after.positionMm)}`;
  return null;
}

/** What the learner sees happen to the membranes; with `pressureReading` the pressures are added. */
export function describeProbeChange(before: ProbeReading, after: ProbeReading, pressureReading = false): string[] {
  const state = `Màng C ${levelVi(after.levels.C)}, màng A ${levelVi(after.levels.A)}, màng B ${levelVi(after.levels.B)}`;
  const pressure = pressureReading ? ` (C: ${formatPascals(after.pascals.C)}, A và B: ${formatPascals(after.pascals.A)})` : "";
  let trend: string;
  if (after.levels.C === before.levels.C && after.levels.A === before.levels.A) trend = after.depthMm === before.depthMm ? "Cùng độ sâu: các màng biến dạng như trước" : "Các màng chưa thay đổi mức";
  else trend = after.depthMm > before.depthMm ? "Sâu hơn: các màng lõm vào nhiều hơn" : "Nông hơn: các màng lõm ít hơn";
  return [trend, state + pressure];
}

export function describePistonAction(before: PistonReading, after: PistonReading, weightVi: string): string | null {
  if (after.pan1 !== before.pan1) return `${after.pan1 > before.pan1 ? "Đặt thêm" : "Bỏ bớt"} một quả nặng ${weightVi} ${after.pan1 > before.pan1 ? "lên" : "khỏi"} đĩa (1): còn ${after.pan1} quả`;
  if (after.pan2 !== before.pan2) return `${after.pan2 > before.pan2 ? "Đặt thêm" : "Bỏ bớt"} một quả nặng ${weightVi} ${after.pan2 > before.pan2 ? "lên" : "khỏi"} đĩa (2): còn ${after.pan2} quả`;
  return null;
}

export function describePistonChange(after: PistonReading, pressureReading = false): string[] {
  const counts = `Đĩa (1) ${after.pan1} quả, đĩa (2) ${after.pan2} quả`;
  const pressure = pressureReading ? ` (áp suất dưới pit-tông (1): ${formatPascals(after.pascals[0])}, (2): ${formatPascals(after.pascals[1])})` : "";
  return [OUTCOME_VI[after.outcome], counts + pressure];
}

/** Adds one line, or folds it into the last line when it continues the same slider drag. */
export function appendPressureEntry(log: readonly PressureLogEntry[], entry: Omit<PressureLogEntry, "seq">): PressureLogEntry[] {
  const last = log.at(-1);
  if (entry.merge && last?.merge === entry.merge) return [...log.slice(0, -1), { ...entry, seq: last.seq }];
  return [...log, { ...entry, seq: (last?.seq ?? 0) + 1 }];
}
