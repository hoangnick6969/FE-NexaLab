/**
 * Profiles (millimetres, optical axis = +y) for the lathe-built eye. Each function
 * returns [radius, height] pairs; `LatheGeometry` revolves them around y.
 * Procedural on purpose: no external mesh, and the axial length can change per scenario.
 */

export type Profile = Array<[number, number]>;

export const SCLERA_RADIUS_MM = 12;
export const CORNEA_RADIUS_MM = 7.8;
export const CORNEA_EDGE_RADIUS_MM = 5.75;
export const LENS_EQUATOR_MM = 4.5;
export const LENS_CENTRE_Y_MM = 7.7;
export const IRIS_Y_MM = 9.9;
export const IRIS_OUTER_MM = 6;
export const RETINA_RADIUS_MM = 11.6;
const CORNEA_CENTRE_Y = 5.25;
const SCLERA_OPENING_Y = CORNEA_CENTRE_Y + Math.sqrt(CORNEA_RADIUS_MM ** 2 - CORNEA_EDGE_RADIUS_MM ** 2);

/** Posterior semi-axis of the globe from the centre to the back pole. */
export const posteriorSemiAxisMm = (axialMm: number) => axialMm - 11;

const SEGMENTS = 32;

/** Sclera: sphere in front (with the cornea opening), ellipsoid behind to the back pole. */
export function scleraProfile(axialMm: number): Profile {
  const back = posteriorSemiAxisMm(axialMm);
  const openingAngle = Math.asin(SCLERA_OPENING_Y / SCLERA_RADIUS_MM);
  const points: Profile = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const phi = -Math.PI / 2 + ((openingAngle + Math.PI / 2) * i) / SEGMENTS;
    const r = SCLERA_RADIUS_MM * Math.cos(phi);
    const y = phi >= 0 ? SCLERA_RADIUS_MM * Math.sin(phi) : back * Math.sin(phi);
    points.push([r, y]);
  }
  return points;
}

/** Cornea: anterior sphere cap from the apex to the scleral limbus. */
export function corneaProfile(): Profile {
  const edge = Math.asin(CORNEA_EDGE_RADIUS_MM / CORNEA_RADIUS_MM);
  const points: Profile = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const beta = (edge * i) / SEGMENTS;
    points.push([CORNEA_RADIUS_MM * Math.sin(beta), CORNEA_CENTRE_Y + CORNEA_RADIUS_MM * Math.cos(beta)]);
  }
  return points;
}

/** Anterior chamber: aqueous humour between the inner cornea and the iris plane. */
export function aqueousProfile(): Profile {
  const innerRadius = CORNEA_RADIUS_MM - 0.52;
  const edge = Math.asin(CORNEA_EDGE_RADIUS_MM / innerRadius);
  const points: Profile = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const beta = (edge * i) / SEGMENTS;
    points.push([innerRadius * Math.sin(beta), CORNEA_CENTRE_Y + innerRadius * Math.cos(beta)]);
  }
  points.push([CORNEA_EDGE_RADIUS_MM, IRIS_Y_MM]);
  points.push([0, IRIS_Y_MM]);
  return points;
}

/** Iris: an annulus from the pupil to the outer iris, flat at IRIS_Y_MM. */
export function irisProfile(pupilRadiusMm: number): Profile {
  return [[pupilRadiusMm, IRIS_Y_MM], [IRIS_OUTER_MM, IRIS_Y_MM]];
}

/**
 * Lens: an ellipsoid of revolution. Accommodation (0 relaxed, 1 fully bulged)
 * makes it thicker, so its anterior surface curves more. Only the shape is visual;
 * the server and the ray trace use the dioptre values.
 */
export function lensProfile(accommodation: number): Profile {
  const half = 1.8 + 0.5 * clamp01(accommodation);
  const points: Profile = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const phi = -Math.PI / 2 + (Math.PI * i) / SEGMENTS;
    points.push([LENS_EQUATOR_MM * Math.cos(phi), LENS_CENTRE_Y_MM + half * Math.sin(phi)]);
  }
  return points;
}

/** Inner shell (choroid, retina): ellipsoid behind the equator, sphere in front, up to `frontY`. */
function shellProfile(radius: number, back: number, frontY: number): Profile {
  const front = Math.asin(Math.min(frontY / radius, 1));
  const points: Profile = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const phi = -Math.PI / 2 + ((front + Math.PI / 2) * i) / SEGMENTS;
    points.push([radius * Math.cos(phi), phi < 0 ? back * Math.sin(phi) : radius * Math.sin(phi)]);
  }
  return points;
}

export const CHOROID_RADIUS_MM = 11.8;
/** Ora serrata: where the retina ends in front, just behind the ciliary body. */
export const ORA_SERRATA_Y_MM = 6.2;

/** Choroid: the dark vascular layer between sclera and retina, up to the ciliary body. */
export function choroidProfile(axialMm: number): Profile {
  return shellProfile(CHOROID_RADIUS_MM, posteriorSemiAxisMm(axialMm) - 0.2, 7);
}

/** Retina: inner surface from the back pole to the ora serrata. */
export function retinaProfile(axialMm: number): Profile {
  return shellProfile(RETINA_RADIUS_MM, posteriorSemiAxisMm(axialMm) - 0.4, ORA_SERRATA_Y_MM);
}

/** Vitreous: the inner volume from the retina forward to just behind the lens, closed along the axis. */
export function vitreousProfile(axialMm: number): Profile {
  return [...shellProfile(RETINA_RADIUS_MM - 0.1, posteriorSemiAxisMm(axialMm) - 0.5, 5), [4, 5.7], [0, 5.85]];
}

/** Ciliary body: a wedge ring from the choroid to just outside the lens equator. */
export function ciliaryProfile(): Profile {
  // Outer edge stays inside the sclera (r ≈ 8.0 mm at y 8.9, 10.3 mm at y 6.1).
  return [[7.6, 8.9], [5.7, 8.1], [5.9, 7.6], [8.9, 6.1]];
}

/** Zonule fibres: radial segments from the lens equator to the ciliary body, as [r, y] pairs. */
export const ZONULE_SEGMENT: [[number, number], [number, number]] = [[LENS_EQUATOR_MM + 0.05, LENS_CENTRE_Y_MM], [5.8, 7.85]];

/**
 * Fundus map: (a, c) in radians from the back pole, a along local +x, c along +z
 * (the half kept by the sagittal section). Returns a local 3D point (mm) on the
 * retina, moved `insetMm` towards the centre so it sits on the inner surface.
 */
export function fundusPoint(axialMm: number, a: number, c: number, insetMm = 0.08): [number, number, number] {
  const back = posteriorSemiAxisMm(axialMm) - 0.4;
  const theta = Math.hypot(a, c);
  const psi = Math.atan2(c, a);
  const radius = RETINA_RADIUS_MM - insetMm;
  return [radius * Math.sin(theta) * Math.cos(psi), -(back - insetMm) * Math.cos(theta), radius * Math.sin(theta) * Math.sin(psi)];
}

/** Optic disc (blind spot) on the fundus map, about 15° from the fovea. The fovea is at the back pole. */
export const OPTIC_DISC: [number, number] = [0.27, 0];

/** Stylised retinal vessels leaving the disc and arching around the fovea; [a, c] polylines with a radius in mm. */
export const RETINAL_VESSELS: Array<{ points: Array<[number, number]>; radiusMm: number; artery: boolean }> = [
  { points: [[0.27, 0.02], [0.3, 0.18], [0.2, 0.36], [0, 0.44], [-0.25, 0.4], [-0.45, 0.3], [-0.62, 0.17]], radiusMm: 0.13, artery: false },
  { points: [[0.26, 0.03], [0.24, 0.15], [0.12, 0.3], [-0.08, 0.36], [-0.3, 0.32], [-0.5, 0.22]], radiusMm: 0.1, artery: true },
  { points: [[0.28, 0.02], [0.42, 0.12], [0.6, 0.25], [0.76, 0.45]], radiusMm: 0.11, artery: false },
  { points: [[0.29, 0.03], [0.38, 0.3], [0.42, 0.6], [0.34, 0.86]], radiusMm: 0.1, artery: true },
  { points: [[0, 0.44], [-0.05, 0.65], [-0.2, 0.9]], radiusMm: 0.07, artery: false },
  { points: [[-0.25, 0.4], [-0.45, 0.55], [-0.72, 0.6]], radiusMm: 0.06, artery: true },
  { points: [[0.26, 0.01], [0.15, 0.06], [0.05, 0.13], [-0.15, 0.17], [-0.35, 0.11]], radiusMm: 0.05, artery: true },
  { points: [[0.42, 0.6], [0.6, 0.72], [0.82, 0.74]], radiusMm: 0.06, artery: false },
];

/** Optic nerve centreline (local mm): leaves the disc outward, then runs back towards the orbit apex. */
export function opticNervePath(axialMm: number): Array<[number, number, number]> {
  const [x, y] = fundusPoint(axialMm, OPTIC_DISC[0], OPTIC_DISC[1], 0);
  const length = Math.hypot(x, y);
  const [nx, ny] = [x / length, y / length];
  return [
    [x - nx * 0.6, y - ny * 0.6, 0],
    [x + nx * 1.5, y + ny * 1.5, 0],
    [x + nx * 4 + 0.6, y + ny * 4 - 1.5, 0],
    [x + nx * 6 + 2.2, y + ny * 6 - 5, 0],
    [x + nx * 7 + 3.4, y + ny * 7 - 9, 0],
  ];
}

/** Superior and inferior rectus muscles along the outer sclera in the sagittal plane, local mm. */
export function rectusMusclePath(axialMm: number, side: 1 | -1): Array<[number, number, number]> {
  const back = posteriorSemiAxisMm(axialMm);
  const points: Array<[number, number, number]> = [];
  for (const phi of [0.5, 0.25, 0, -0.35, -0.7, -0.95]) {
    const r = (SCLERA_RADIUS_MM + 0.9) * Math.cos(phi);
    const y = phi >= 0 ? (SCLERA_RADIUS_MM + 0.9) * Math.sin(phi) : (back + 0.9) * Math.sin(phi);
    points.push([side * r, y, 0]);
  }
  points.push([side * 6.5, -(back + 6), 0], [side * 4.5, -(back + 14), 0]);
  return points;
}

/** Retinal point at `angleRad` from the back pole, on the eye's posterior surface. */
export function posteriorPoint(axialMm: number, angleRad: number): [number, number] {
  const back = posteriorSemiAxisMm(axialMm) - 0.4;
  const phi = -Math.PI / 2 + angleRad;
  return [RETINA_RADIUS_MM * Math.cos(phi), back * Math.sin(phi)];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Maps a lens power (16–26 D) to accommodation 0–1 for the shape. */
export const accommodationFromLensPower = (lensPowerD: number) => clamp01((lensPowerD - 16) / 10);
