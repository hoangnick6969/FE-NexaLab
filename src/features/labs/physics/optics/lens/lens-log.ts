/** Learner notebook of the lens bench: local, unscored, never evidence. Also the pure formatting and ray geometry the scenes share. */
import { createObservationLogStore } from "../../../shared/explore/observation-log";

export type LensStationId = "rays" | "image" | "focal" | "magnifier";
/** Image as the sim returns it (mm; d′ < 0 virtual). */
export type ImageView =
  | { kind: "none" }
  | { kind: "image"; distanceMm: number; magnification: number; heightMm: number; real: boolean; upright: boolean; size: "larger" | "equal" | "smaller" };
export type LensLogEntry = {
  seq: number;
  at: number;
  station: LensStationId;
  actionVi: string;
  phenomenaVi: string[];
  /** Consecutive slider changes fold into one line. */
  merge?: string;
};

export const lensLogStore = createObservationLogStore<LensLogEntry>("nexalab-lens-explore");

export const LENS_STATION_VI: Record<LensStationId, string> = { rays: "Trạm 1 · Tia đặc biệt", image: "Trạm 2 · Dựng ảnh", focal: "Trạm 3 · Đo tiêu cự", magnifier: "Trạm 4 · Kính lúp" };
export type RayId = "parallel" | "centre" | "focus";
export const RAY_VI: Record<RayId, string> = { parallel: "Tia song song trục chính", centre: "Tia qua quang tâm O", focus: "Tia qua tiêu điểm F" };
export type RayPrediction = "through-focus" | "straight" | "parallel";
export const RAY_PREDICTION_VI: Record<RayPrediction, string> = { "through-focus": "Ló ra đi qua (hoặc kéo dài qua) tiêu điểm F′", straight: "Truyền thẳng, không đổi hướng", parallel: "Ló ra song song với trục chính" };

/** 150 → "150 mm", 66.67 → "66,7 mm". */
export const formatMm = (mm: number) => `${(Math.round(mm * 10) / 10).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} mm`;
export const formatPower = (power: number) => `${power.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}×`;
export const lensKindVi = (focalMm: number) => focalMm > 0 ? "hội tụ" : "phân kì";

/** "ảnh thật, ngược chiều, nhỏ hơn vật" or "không có ảnh". */
export function describeImage(image: ImageView): string {
  if (image.kind === "none") return "không có ảnh: các tia ló song song với nhau";
  const size = image.size === "larger" ? "lớn hơn vật" : image.size === "equal" ? "bằng vật" : "nhỏ hơn vật";
  return `ảnh ${image.real ? "thật" : "ảo"}, ${image.upright ? "cùng chiều" : "ngược chiều"}, ${size}`;
}

/** The model's answer for the parallel ray (station 1 prediction). */
export const parallelRayAnswer = (): RayPrediction => "through-focus";

/** Parses a typed length ("150", "66,7"); null when empty, NaN when not a number. */
export function parseMm(typed: string): number | null {
  const text = typed.trim().replace(",", ".").replace(/mm$/i, "").trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : Number.NaN;
}

/** Adds one line, or folds it into the last line when it continues the same slider drag. */
export function appendLensEntry(log: readonly LensLogEntry[], entry: Omit<LensLogEntry, "seq">): LensLogEntry[] {
  const last = log.at(-1);
  if (entry.merge && last?.merge === entry.merge) return [...log.slice(0, -1), { ...entry, seq: last.seq }];
  return [...log, { ...entry, seq: (last?.seq ?? 0) + 1 }];
}

export type Pt = { x: number; y: number };
export type SpecialRay = {
  id: RayId;
  /** From the object point B to the lens plane. */
  from: Pt;
  atLens: Pt;
  /** Unit direction after the lens; null when the ray does not exist (the focus ray when the object sits on F). */
  out: Pt | null;
};

/**
 * The three special rays from the object point B = (−d, h) through a thin lens at x = 0 (mm, y up, f < 0 diverging):
 * the parallel ray leaves with slope −h/f (through F′, or away from it for a diverging lens), the centre ray keeps the slope
 * of B→O, and the focus ray (aimed at F = (−f, 0)) leaves parallel to the axis. They meet at the image the sim computes.
 */
export function specialRays(focalMm: number, distanceMm: number, heightMm: number): SpecialRay[] {
  const B: Pt = { x: -distanceMm, y: heightMm };
  const unit = (dx: number, dy: number): Pt => { const n = Math.hypot(dx, dy); return { x: dx / n, y: dy / n }; };
  const parallel: SpecialRay = { id: "parallel", from: B, atLens: { x: 0, y: heightMm }, out: unit(1, -heightMm / focalMm) };
  const centre: SpecialRay = { id: "centre", from: B, atLens: { x: 0, y: 0 }, out: unit(distanceMm, -heightMm) };
  // Line from B through the object-side focus F = (−f, 0) meets the lens at y = h·f/(f − d); it leaves parallel to the axis.
  const focus: SpecialRay = Math.abs(focalMm - distanceMm) < 1e-9
    ? { id: "focus", from: B, atLens: { x: 0, y: heightMm }, out: null }
    : { id: "focus", from: B, atLens: { x: 0, y: (heightMm * focalMm) / (focalMm - distanceMm) }, out: { x: 1, y: 0 } };
  return [parallel, centre, focus];
}

/** Where two outgoing rays (or their backward extensions) meet: the image of B. Null when they are parallel. */
export function meetPoint(a: SpecialRay, b: SpecialRay): Pt | null {
  if (!a.out || !b.out) return null;
  const den = a.out.x * b.out.y - a.out.y * b.out.x;
  if (Math.abs(den) < 1e-12) return null;
  const w = { x: b.atLens.x - a.atLens.x, y: b.atLens.y - a.atLens.y };
  const t = (w.x * b.out.y - w.y * b.out.x) / den;
  return { x: a.atLens.x + a.out.x * t, y: a.atLens.y + a.out.y * t };
}
