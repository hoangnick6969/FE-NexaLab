/**
 * Display-only optics for the FL-16 eye Lab. The server (`eye-optics@1.0.0`,
 * BE `packages/sim/eye-optics.ts`) computes every score; this file only draws
 * rays so the learner can see where the image lands. Keep the constants in sync
 * with the server model. Parity was checked numerically: at the required power the
 * marginal and chief rays cross on the retina within 0.05 mm for all three scenarios.
 *
 * Coordinates are millimetres. The optical axis is +y (anterior at the top) and
 * the sagittal plane is x–y. The equivalent refracting surface sits at
 * `EQUIVALENT_SURFACE_Y_MM`, one axial length in front of the retina.
 */

export const VITREOUS_INDEX = 1.336;
export const EQUIVALENT_SURFACE_Y_MM = 11;
/** Small marginal aperture: a single-surface trace keeps spherical error near 0.05 mm, against about 1 mm at 2 mm. */
export const MARGINAL_HEIGHT_MM = 0.5;
export const CORNEA_POWER_D = 43;
/** Same tolerance as the server rubric: the image counts as on the retina within ±0.5 D. */
export const FOCUS_TOLERANCE_D = 0.5;

export type Vec2 = [number, number];

/** Retina plane height (mm) for an eye of the given axial length. */
export const retinaY = (axialMm: number) => EQUIVALENT_SURFACE_Y_MM - axialMm;

/** P_req = n / L + 1 / d in dioptres; `null` distance means an object at infinity. */
export function requiredPowerD(axialMm: number, objectDistanceM: number | null) {
  return VITREOUS_INDEX / (axialMm / 1000) + (objectDistanceM === null ? 0 : 1 / objectDistanceM);
}

const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
const scale = (a: Vec2, s: number): Vec2 => [a[0] * s, a[1] * s];
const dot = (a: Vec2, b: Vec2) => a[0] * b[0] + a[1] * b[1];
const unit = (a: Vec2): Vec2 => {
  const length = Math.hypot(a[0], a[1]);
  return [a[0] / length, a[1] / length];
};

/**
 * Vector Snell law at a point of a spherical surface. `direction` is the unit
 * travel direction, `normal` a unit normal opposing it. Returns the refracted unit
 * direction, or null on total internal reflection (not reached in this model).
 */
export function refract(direction: Vec2, normal: Vec2, n1: number, n2: number): Vec2 | null {
  const eta = n1 / n2;
  const cosI = -dot(normal, direction);
  const k = 1 - eta * eta * (1 - cosI * cosI);
  if (k < 0) return null;
  return unit(add(scale(direction, eta), scale(normal, eta * cosI - Math.sqrt(k))));
}

/** Two-line intersection; null when the lines are parallel. */
function intersect(p: Vec2, d: Vec2, q: Vec2, e: Vec2): Vec2 | null {
  const det = d[0] * -e[1] - d[1] * -e[0];
  if (Math.abs(det) < 1e-12) return null;
  const rhs = sub(q, p);
  const s = (rhs[0] * -e[1] - rhs[1] * -e[0]) / det;
  return add(p, scale(d, s));
}

/**
 * Visible ray fan for drawing. A fan wide enough to see (±1.5 mm) would show
 * about 0.5 mm of spherical aberration on the single equivalent surface, so it
 * is refracted with the paraxial (small-angle) Snell relation n′u′ = nu − hP.
 * Those rays meet exactly at the image point of the power equation; the
 * readout keeps using the exact trace above. Returns points in the axis frame.
 */
export function paraxialFan({ axialMm, objectDistanceM, providedPowerD, heightsMm = [-1.5, 0, 1.5], objectHeightMm = 3, drawObjectMm = 25 }: {
  axialMm: number;
  objectDistanceM: number | null;
  providedPowerD: number;
  heightsMm?: number[];
  objectHeightMm?: number;
  drawObjectMm?: number;
}) {
  const powerPerMm = providedPowerD / 1000;
  const objectMm = objectDistanceM === null ? null : objectDistanceM * 1000;
  const tipX = objectMm === null ? 0 : objectHeightMm;
  const start = -Math.min(objectMm ?? Infinity, drawObjectMm);
  return heightsMm.map((h) => {
    const slope = objectMm === null ? 0 : (h - tipX) / objectMm;
    const refracted = (slope - h * powerPerMm) / VITREOUS_INDEX;
    const toAxisFrame = (s: number, x: number): Vec2 => [x, EQUIVALENT_SURFACE_Y_MM - s];
    return [toAxisFrame(start, h + slope * start), toAxisFrame(0, h), toAxisFrame(axialMm, h + refracted * axialMm)];
  });
}

export type TraceResult = {
  /** Chief and marginal rays from the object tip, sampled from the object to the retina. */
  rays: Array<{ kind: "chief" | "marginal"; points: Vec2[] }>;
  /** Axial position where the two rays cross, minus the retina (mm). Zero means in focus. */
  imageOffsetMm: number | null;
  /** Lateral spread of the two rays on the retina (mm); a sharp image gives ~0. */
  blurMm: number;
  /** Where the image point falls on the retina (mm, x). */
  imageXMm: number | null;
};

/**
 * Traces the chief ray (through the surface centre) and a marginal ray through
 * the surface at MARGINAL_HEIGHT_MM. The surface is a sphere whose power equals
 * the total provided power, so the trace uses Snell's law at a real curved interface.
 */
export function traceEye({ axialMm, objectDistanceM, providedPowerD, objectHeightMm = 3 }: {
  axialMm: number;
  objectDistanceM: number | null;
  providedPowerD: number;
  objectHeightMm?: number;
}): TraceResult {
  const yEq = EQUIVALENT_SURFACE_Y_MM;
  const yRet = retinaY(axialMm);
  const power = Math.max(providedPowerD, 1);
  const radius = ((VITREOUS_INDEX - 1) / power) * 1000; // mm; the apex sits on yEq
  const centre: Vec2 = [0, yEq - radius];
  const objectY = objectDistanceM === null ? yEq + 1e6 : yEq + objectDistanceM * 1000;
  const tip: Vec2 = [objectHeightMm, objectY];
  const surfaceAt = (height: number): Vec2 => [height, centre[1] + Math.sqrt(radius * radius - height * height)];

  const build = (kind: "chief" | "marginal", height: number) => {
    const surfacePoint = surfaceAt(height);
    const incoming = unit(sub(surfacePoint, tip));
    const normal = unit(sub(surfacePoint, centre));
    const refracted = refract(incoming, normal, 1, VITREOUS_INDEX) ?? incoming;
    const toRetina = (yRet - surfacePoint[1]) / refracted[1];
    const end: Vec2 = [surfacePoint[0] + refracted[0] * toRetina, yRet];
    return { ray: { kind, points: [tip, surfacePoint, end] as Vec2[] }, surfacePoint, refracted, end };
  };

  const chief = build("chief", 0);
  const marginal = build("marginal", MARGINAL_HEIGHT_MM);
  const crossing = intersect(chief.surfacePoint, chief.refracted, marginal.surfacePoint, marginal.refracted);
  return {
    rays: [chief.ray, marginal.ray],
    imageOffsetMm: crossing === null ? null : crossing[1] - yRet,
    blurMm: Math.abs(marginal.end[0] - chief.end[0]),
    imageXMm: crossing === null ? null : crossing[0],
  };
}
