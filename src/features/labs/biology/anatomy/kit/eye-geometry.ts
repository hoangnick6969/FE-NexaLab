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

/** Retina: posterior inner surface from the back pole to the equator. */
export function retinaProfile(axialMm: number): Profile {
  const back = posteriorSemiAxisMm(axialMm) - 0.4;
  const points: Profile = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const phi = -Math.PI / 2 + ((Math.PI / 2) * i) / SEGMENTS;
    points.push([RETINA_RADIUS_MM * Math.cos(phi), back * Math.sin(phi)]);
  }
  return points;
}

/** Vitreous: the posterior inner volume, closed along the axis at the equator. */
export function vitreousProfile(axialMm: number): Profile {
  return [...retinaProfile(axialMm), [0, 0]];
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
