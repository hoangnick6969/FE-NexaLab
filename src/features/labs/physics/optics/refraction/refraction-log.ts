/** Learner notebook of the optics bench: local, unscored, never evidence. Also the pure formatting and ray geometry the scenes share. */
import { createObservationLogStore } from "../../../shared/explore/observation-log";

export type StationId = "into-block" | "out-of-block";
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
export type RefractionLogEntry = {
  seq: number;
  at: number;
  station: StationId;
  actionVi: string;
  phenomenaVi: string[];
  ray?: RayView;
  /** Consecutive angle changes fold into one line. */
  merge?: string;
};

export const refractionLogStore = createObservationLogStore<RefractionLogEntry>("nexalab-refraction-explore");

export const STATION_VI: Record<StationId, string> = { "into-block": "Trạm 1 · Từ không khí vào khối", "out-of-block": "Trạm 2 · Từ khối ra không khí" };

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
