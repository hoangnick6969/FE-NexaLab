/** Learner notebook of the optics bench: local, unscored, never evidence. Also the pure formatting and ray geometry the scenes share. */
import { createObservationLogStore } from "../../../shared/explore/observation-log";

export type StationId = "into-block" | "out-of-block" | "prism";
/** What one ray looks like for the panel, the scenes and the notebook (angles in degrees, unrounded). */
export type RayView = {
  station: StationId;
  mediumId: string;
  mediumVi: string;
  indexMilli: number;
  incidenceDeg: number;
  /** null under total internal reflection. */
  refractionDeg: number | null;
  /** Fraction of light reflected (1 when total), for drawing only. */
  reflectance: number;
  criticalDeg: number | null;
};
/** One path through the prism (sim tracePrism, angles in degrees, unrounded). */
export type PrismPath =
  | { kind: "exits"; firstRefractionDeg: number; secondIncidenceDeg: number; exitDeg: number; deviationDeg: number }
  | { kind: "total"; firstRefractionDeg: number; secondIncidenceDeg: number };
export type PrismColourView = { id: string; labelVi: string; indexMilli: number; path: PrismPath };
export type PrismView = {
  incidenceDeg: number;
  apexDeg: number;
  mediumVi: string;
  indexMilli: number;
  light: "laser" | "white";
  laser: PrismPath;
  /** Red to violet (least to most deviated); empty with the laser. */
  spectrum: PrismColourView[];
};
export type Prediction = "base" | "apex" | "straight";
export const PREDICTION_VI: Record<Prediction, string> = { base: "Lệch về phía đáy", apex: "Lệch về phía đỉnh", straight: "Đi thẳng, không lệch" };

export type RefractionLogEntry = {
  seq: number;
  at: number;
  station: StationId;
  actionVi: string;
  phenomenaVi: string[];
  ray?: RayView;
  prism?: PrismView;
  /** Consecutive angle changes fold into one line. */
  merge?: string;
};

export const refractionLogStore = createObservationLogStore<RefractionLogEntry>("nexalab-refraction-explore");

export const STATION_VI: Record<StationId, string> = { "into-block": "Trạm 1 · Từ không khí vào khối", "out-of-block": "Trạm 2 · Từ khối ra không khí", prism: "Trạm 3 · Lăng kính" };

/** 19.47 → "19,5°"; whole degrees stay whole ("30°"). */
export const formatAngle = (deg: number) => {
  const tenth = Math.round(deg * 10) / 10;
  return `${tenth.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}°`;
};
/** Index in thousandths → "1,50", "1,333" (at least two decimals, as SGK writes them). */
export const formatIndex = (milli: number) => (milli / 1000).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
/** Speed in km/s: exact when whole thousands, otherwise "≈" to the thousand (spec G-09). */
export function formatSpeed(kmPerS: number) {
  const thousands = Math.round(kmPerS / 1000) * 1000;
  const exact = Math.abs(kmPerS - thousands) < 0.5;
  return `${exact ? "" : "≈ "}${thousands.toLocaleString("vi-VN")} km/s`;
}
export const formatSine = (value: number) => value.toLocaleString("vi-VN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
export const formatRatio = (value: number) => value.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const from = (ray: RayView) => ray.station === "into-block" ? "không khí" : ray.mediumVi.toLowerCase();
const to = (ray: RayView) => ray.station === "into-block" ? ray.mediumVi.toLowerCase() : "không khí";

/** One sentence for the scene label and the screen reader. */
export function describeRay(ray: RayView) {
  const head = `Tia sáng từ ${from(ray)} sang ${to(ray)}, góc tới ${formatAngle(ray.incidenceDeg)}`;
  return ray.refractionDeg === null ? `${head}: phản xạ toàn phần, không có tia khúc xạ` : `${head}, góc khúc xạ ${formatAngle(ray.refractionDeg)}`;
}

/** What the student sees change when the angle moves. */
export function describeRayChange(before: RayView, after: RayView): string[] {
  const lines: string[] = [];
  if (after.refractionDeg === null) {
    lines.push(before.refractionDeg === null ? "Vẫn phản xạ toàn phần: chỉ còn tia phản xạ" : "Tia khúc xạ biến mất: phản xạ toàn phần, tia phản xạ sáng rõ");
  } else if (after.incidenceDeg === 0) {
    lines.push("Tia tới vuông góc với mặt phân cách: tia sáng đi thẳng, không bị lệch");
  } else if (after.station === "into-block") {
    lines.push(`Góc khúc xạ nhỏ hơn góc tới: tia khúc xạ lệch lại gần pháp tuyến`);
  } else {
    lines.push(before.refractionDeg === null ? "Tia khúc xạ xuất hiện lại, rất mờ, gần sát mặt phân cách" : "Góc khúc xạ lớn hơn góc tới: tia khúc xạ lệch xa pháp tuyến");
  }
  if (after.station === "out-of-block" && after.refractionDeg !== null && after.incidenceDeg > before.incidenceDeg) lines.push("Tia khúc xạ mờ dần, tia phản xạ sáng dần");
  return lines;
}

export function describeReading(ray: RayView, sineColumns: boolean): string[] {
  if (ray.refractionDeg === null) return [];
  const read = `Ghi vào bảng: ${ray.mediumVi}, i = ${formatAngle(ray.incidenceDeg)}, r = ${formatAngle(ray.refractionDeg)}`;
  if (!sineColumns || ray.incidenceDeg === 0) return [read];
  const sinI = Math.sin(ray.incidenceDeg * Math.PI / 180);
  const sinR = Math.sin(ray.refractionDeg * Math.PI / 180);
  return [read, `sin i = ${formatSine(sinI)}, sin r = ${formatSine(sinR)}, sin i / sin r = ${formatRatio(sinI / sinR)}`];
}

/** Parses a typed angle ("42", "41,8"); null when empty, NaN when not a number. */
export function parseAngle(typed: string): number | null {
  const text = typed.trim().replace(",", ".").replace("°", "");
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : Number.NaN;
}

/** Adds one line, or folds it into the last line when it continues the same angle change. */
export function appendRefractionEntry(log: readonly RefractionLogEntry[], entry: Omit<RefractionLogEntry, "seq">): RefractionLogEntry[] {
  const last = log.at(-1);
  if (entry.merge && last?.merge === entry.merge) return [...log.slice(0, -1), { ...entry, seq: last.seq }];
  return [...log, { ...entry, seq: (last?.seq ?? 0) + 1 }];
}

export type Point = { x: number; y: number };
/**
 * The three rays on a disk centred at (cx, cy) with radius `radius`, in screen coordinates (y down). The block is the lower half,
 * its flat face on the horizontal diameter, the normal vertical. Station 1 lights from the upper left (air), station 2 from the lower left (inside the block).
 */
export function rayGeometry(ray: Pick<RayView, "station" | "incidenceDeg" | "refractionDeg">, cx: number, cy: number, radius: number) {
  const rad = (deg: number) => deg * Math.PI / 180;
  const side = ray.station === "into-block" ? -1 : 1; // -1: incident side is above (air), +1: below (block)
  const at = (deg: number, sx: number, sy: number): Point => ({ x: cx + sx * radius * Math.sin(rad(deg)), y: cy + sy * radius * Math.cos(rad(deg)) });
  return {
    incident: at(ray.incidenceDeg, -1, side),
    reflected: at(ray.incidenceDeg, 1, side),
    refracted: ray.refractionDeg === null ? null : at(ray.refractionDeg, 1, -side),
  };
}

/* ---------- Prism (station 3) ---------- */

export function describePrism(view: PrismView, revealed: boolean) {
  const head = `Tia sáng ${view.light === "white" ? "trắng" : "laser"} tới lăng kính ${view.mediumVi.toLowerCase()} (A = ${formatAngle(view.apexDeg)}), góc tới ${formatAngle(view.incidenceDeg)}`;
  if (!revealed) return `${head}; đường truyền đang ẩn để em dự đoán`;
  if (view.laser.kind === "total") return `${head}: phản xạ toàn phần ở mặt bên thứ hai`;
  if (view.light === "white") return `${head}: tách thành dải màu từ đỏ đến tím, tím lệch nhiều nhất`;
  return `${head}, tia ló ${formatAngle(view.laser.exitDeg)}, góc lệch D = ${formatAngle(view.laser.deviationDeg)}`;
}

/** Lines of the notebook once the path is shown: two refractions, deviation towards the base, and the colours with white light. */
export function describePrismPath(view: PrismView): string[] {
  const path = view.laser;
  if (path.kind === "total") return ["Tia sáng phản xạ toàn phần ở mặt bên thứ hai, không ló ra ở mặt này"];
  const lines = [
    `Khúc xạ hai lần: r₁ = ${formatAngle(path.firstRefractionDeg)}, r₂ = ${formatAngle(path.secondIncidenceDeg)}, tia ló i₂ = ${formatAngle(path.exitDeg)}`,
    `Tia ló lệch về phía đáy lăng kính, góc lệch D = ${formatAngle(path.deviationDeg)}`,
  ];
  if (view.light === "white" && view.spectrum.length) lines.push(`Trên màn từ trên xuống: ${view.spectrum.map((colour) => colour.labelVi.toLowerCase()).join(", ")}; ${view.spectrum.at(-1)!.labelVi.toLowerCase()} lệch nhiều nhất, ${view.spectrum[0].labelVi.toLowerCase()} lệch ít nhất`);
  return lines;
}

/** The model's answer to "which way does the ray leave?" (a prism in air always bends light towards its base). */
export const prismAnswer = (view: PrismView): Prediction | null => view.laser.kind === "exits" ? (view.laser.deviationDeg > 0 ? "base" : view.laser.deviationDeg < 0 ? "apex" : "straight") : null;

type Vec = { x: number; y: number };
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const unit = (a: Vec): Vec => mul(a, 1 / Math.hypot(a.x, a.y));
const rotate = (a: Vec, deg: number): Vec => { const r = deg * Math.PI / 180; return { x: a.x * Math.cos(r) - a.y * Math.sin(r), y: a.x * Math.sin(r) + a.y * Math.cos(r) }; };
/** Vector Snell law: `normal` points back towards the incident side; null under total internal reflection. */
function refractVec(d: Vec, normal: Vec, eta: number): Vec | null {
  const cosI = -dot(normal, d);
  const k = 1 - eta * eta * (1 - cosI * cosI);
  return k < 0 ? null : unit(add(mul(d, eta), mul(normal, eta * cosI - Math.sqrt(k))));
}
/** Where the ray p + t·d crosses segment a→b (t > 0), or null. */
function hit(p: Vec, d: Vec, a: Vec, b: Vec): Vec | null {
  const e = sub(b, a);
  const den = d.x * e.y - d.y * e.x;
  if (Math.abs(den) < 1e-12) return null;
  const w = sub(a, p);
  const t = (w.x * e.y - w.y * e.x) / den;
  const u = (w.x * d.y - w.y * d.x) / den;
  return t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 ? add(p, mul(d, t)) : null;
}

export type PrismRay = { indexMilli: number; entry: Vec; inside: Vec; exit: Vec | null; out: Vec | null };
/**
 * Prism drawing in screen coordinates (y down): apex up, base horizontal, faces of length `side` about (cx, cy). The ray enters the middle
 * of the left face from the base side at `incidenceDeg` and leaves through the right face; `screenX` is the vertical screen it lands on.
 */
export function prismGeometry(apexDeg: number, incidenceDeg: number, indices: readonly number[], cx: number, cy: number, side: number, screenX: number) {
  const half = apexDeg * Math.PI / 360;
  const height = side * Math.cos(half);
  const apex: Vec = { x: cx, y: cy - height * 2 / 3 };
  const left: Vec = { x: cx - side * Math.sin(half), y: apex.y + height };
  const right: Vec = { x: cx + side * Math.sin(half), y: apex.y + height };
  const centroid = mul(add(add(apex, left), right), 1 / 3);
  const outward = (a: Vec, b: Vec, at: Vec) => { const f = sub(b, a); const n = unit({ x: f.y, y: -f.x }); return dot(n, sub(at, centroid)) > 0 ? n : mul(n, -1); };
  const entry = mul(add(apex, left), 0.5);
  const n1 = outward(apex, left, entry);
  // Incident direction: the inward normal turned by i₁ towards the base side, so the path crosses to the right face.
  const inward = mul(n1, -1);
  const candidates = [rotate(inward, incidenceDeg), rotate(inward, -incidenceDeg)];
  const towardsBase = (d: Vec) => { const t = refractVec(d, n1, 1000 / indices[0]); return t ? hit(entry, t, apex, right) : null; };
  const incident = candidates.find(towardsBase) ?? candidates[0];
  const rays: PrismRay[] = indices.map((indexMilli) => {
    const inside = refractVec(incident, n1, 1000 / indexMilli)!;
    const exit = hit(entry, inside, apex, right);
    if (!exit) return { indexMilli, entry, inside, exit: null, out: null };
    const n2 = outward(apex, right, exit);
    const out = refractVec(inside, mul(n2, -1), indexMilli / 1000);
    return { indexMilli, entry, inside, exit, out };
  });
  const toScreen = (from: Vec, d: Vec) => d.x > 1e-9 ? add(from, mul(d, (screenX - from.x) / d.x)) : add(from, mul(d, side));
  return { apex, left, right, entry, incident, n1, rays, toScreen };
}
