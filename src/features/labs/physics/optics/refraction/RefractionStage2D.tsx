/**
 * FL-23 main view (catalog "2D-first"): the protractor disk seen from above, 1° ticks, the half-cylinder on the lower half,
 * the normal and the three rays drawn with the model's brightness. Students read the angles here.
 */
import { describeRay, formatAngle, rayGeometry, type RayView } from "./refraction-log";

const SIZE = 400;
const C = SIZE / 2;
const R = 150;
const RAD = Math.PI / 180;
const LABEL_AT = 0.48;

/** Ticks every 1° (longer every 5° and 10°), built once: angle θ from the top, clockwise. */
const TICKS = (() => {
  let d = "";
  for (let theta = 0; theta < 360; theta++) {
    const len = theta % 10 === 0 ? 12 : theta % 5 === 0 ? 8 : 4;
    const sx = Math.sin(theta * RAD);
    const sy = -Math.cos(theta * RAD);
    d += `M${(C + R * sx).toFixed(2)} ${(C + R * sy).toFixed(2)}L${(C + (R - len) * sx).toFixed(2)} ${(C + (R - len) * sy).toFixed(2)}`;
  }
  return d;
})();
/** Labels every 10°, read from the nearest normal (0° on the normal, 90° on the surface). */
const LABELS = Array.from({ length: 36 }, (_, index) => {
  const theta = index * 10;
  const fromNormal = theta % 180 <= 90 ? theta % 180 : 180 - (theta % 180);
  return { theta, text: String(fromNormal), x: C + (R - 24) * Math.sin(theta * RAD), y: C - (R - 24) * Math.cos(theta * RAD) + 3.5 };
});

const opacity = (share: number) => Math.max(0.12, Math.min(1, share));

export function RefractionDiagram({ ray }: { ray: RayView }) {
  const geometry = rayGeometry(ray, C, C, R);
  const transmitted = ray.refractionDeg === null ? 0 : 1 - ray.reflectance;
  // The laser sits just outside the disk, on the incident ray.
  const lx = C + (geometry.incident.x - C) * 1.12;
  const ly = C + (geometry.incident.y - C) * 1.12;
  const laserAngle = Math.atan2(C - ly, C - lx) / RAD;
  const water = ray.mediumId === "water";
  return <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="fl23-svg" role="img" aria-label={describeRay(ray)} data-station={ray.station} data-total={ray.refractionDeg === null}>
    <circle cx={C} cy={C} r={R} className="fl23-disk" />
    <path d={`M${C - R + 2} ${C} A ${R - 2} ${R - 2} 0 0 0 ${C + R - 2} ${C} Z`} className={`fl23-block${water ? " fl23-block-water" : ""}`} />
    <path d={TICKS} className="fl23-ticks" />
    {LABELS.map((label) => <text key={label.theta} x={label.x} y={label.y} className="fl23-tick-label">{label.text}</text>)}
    <line x1={C} y1={C - R} x2={C} y2={C + R} className="fl23-normal" />
    <line x1={C - R} y1={C} x2={C + R} y2={C} className="fl23-surface" />
    {/* Text labels stay inside the ring of tick numbers (radius R - 24). */}
    <text x={C + 6} y={C - 62} className="fl23-small">Pháp tuyến</text>
    <text x={C - 104} y={C - 8} className="fl23-small">Không khí</text>
    <text x={C - 104} y={C + 18} className="fl23-small">{ray.mediumVi}</text>
    <line x1={geometry.incident.x} y1={geometry.incident.y} x2={C} y2={C} className="fl23-ray" data-ray="incident" />
    <line x1={C} y1={C} x2={geometry.reflected.x} y2={geometry.reflected.y} className="fl23-ray" data-ray="reflected" style={{ opacity: opacity(ray.reflectance) }} />
    {geometry.refracted && <line x1={C} y1={C} x2={geometry.refracted.x} y2={geometry.refracted.y} className="fl23-ray" data-ray="refracted" style={{ opacity: opacity(transmitted) }} />}
    <g transform={`translate(${lx} ${ly}) rotate(${laserAngle})`}><rect x={-22} y={-6} width={24} height={12} rx={3} className="fl23-laser" /></g>
    {/* Angle labels sit beside each ray at 0.48 R, well inside the tick numbers and clear of the laser; a halo keeps them legible over ticks. */}
    <text x={C + (geometry.incident.x - C) * LABEL_AT - 8} y={C + (geometry.incident.y - C) * LABEL_AT + 4} textAnchor="end" className="fl23-angle">i = {formatAngle(ray.incidenceDeg)}</text>
    {geometry.refracted && ray.refractionDeg !== null && <text x={C + (geometry.refracted.x - C) * LABEL_AT + 8} y={C + (geometry.refracted.y - C) * LABEL_AT + 4} className="fl23-angle">r = {formatAngle(ray.refractionDeg)}</text>}
    {!geometry.refracted && <text x={C + 64} y={ray.station === "into-block" ? C + 40 : C - 30} textAnchor="middle" className="fl23-angle fl23-total">Phản xạ toàn phần</text>}
    <circle cx={C} cy={C} r={3} className="fl23-centre" />
  </svg>;
}
