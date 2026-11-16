/**
 * FL-23 main view (catalog "2D-first"): the protractor disk seen from above, 1° ticks, the half-cylinder on the lower half,
 * the normal and the three rays drawn with the model's brightness. Students read the angles here.
 */
import { describePrism, describeRay, formatAngle, prismGeometry, rayGeometry, type PrismView, type RayView } from "./refraction-log";

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

/** Colours of the spectrum rays by id (the config names them; unknown ids fall back to white). */
const SPECTRUM_FILL: Record<string, string> = { red: "#e0221f", orange: "#f08a24", yellow: "#e8c51c", green: "#2e9d4f", blue: "#2f6fd1", indigo: "#4b3aa8", violet: "#8a3fc4" };
const PRISM_SIDE = 190;
const SCREEN_X = 370;

/** Station 3: the prism with its normals, the incident ray, and (once revealed) the path inside, the exit ray or the spectrum on the screen. */
export function PrismDiagram({ view, revealed }: { view: PrismView; revealed: boolean }) {
  const indices = view.light === "white" && view.spectrum.length ? view.spectrum.map((colour) => colour.indexMilli) : [view.indexMilli];
  const g = prismGeometry(view.apexDeg, view.incidenceDeg, indices, 170, 215, PRISM_SIDE, SCREEN_X);
  const start = { x: g.entry.x - g.incident.x * 150, y: g.entry.y - g.incident.y * 150 };
  const normal = (at: { x: number; y: number }, n: { x: number; y: number }) => <line x1={at.x - n.x * 40} y1={at.y - n.y * 40} x2={at.x + n.x * 40} y2={at.y + n.y * 40} className="fl23-normal" />;
  const first = g.rays[0];
  const deviation = view.laser.kind === "exits" ? view.laser.deviationDeg : null;
  const colourOf = (k: number) => view.light === "white" && view.spectrum[k] ? SPECTRUM_FILL[view.spectrum[k].id] ?? "#ffffff" : "#e0221f";
  return <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="fl23-svg" role="img" aria-label={describePrism(view, revealed)} data-station="prism" data-revealed={revealed} data-light={view.light}>
    <rect x={SCREEN_X} y={60} width={8} height={300} rx={2} className="fl23-screen" />
    <text x={SCREEN_X + 4} y={52} textAnchor="middle" className="fl23-small">Màn</text>
    <polygon points={`${g.apex.x},${g.apex.y} ${g.left.x},${g.left.y} ${g.right.x},${g.right.y}`} className="fl23-prism" />
    <text x={g.apex.x} y={g.apex.y - 8} textAnchor="middle" className="fl23-small">A = {formatAngle(view.apexDeg)}</text>
    <text x={(g.left.x + g.right.x) / 2} y={g.left.y + 16} textAnchor="middle" className="fl23-small">Đáy</text>
    {normal(g.entry, g.n1)}
    <line x1={start.x} y1={start.y} x2={g.entry.x} y2={g.entry.y} className="fl23-ray" data-ray="incident" style={view.light === "white" ? { stroke: "#f2f2f2", filter: "drop-shadow(0 0 1px #555)" } : undefined} />
    {!revealed && <text x={g.entry.x + 30} y={g.entry.y + 4} className="fl23-angle">?</text>}
    {revealed && <>
      {/* Dashed continuation of the incident ray: the exit ray turns away from it towards the base by D. */}
      {deviation !== null && <line x1={g.entry.x} y1={g.entry.y} x2={g.entry.x + g.incident.x * 230} y2={g.entry.y + g.incident.y * 230} className="fl23-guide" />}
      {g.rays.map((ray, k) => <g key={ray.indexMilli} data-colour={view.light === "white" ? view.spectrum[k]?.id : "laser"}>
        {ray.exit && <line x1={ray.entry.x} y1={ray.entry.y} x2={ray.exit.x} y2={ray.exit.y} className="fl23-ray fl23-ray-thin" style={{ stroke: colourOf(k), opacity: view.light === "white" ? 0.7 : 1 }} />}
        {ray.exit && ray.out && (() => { const end = g.toScreen(ray.exit, ray.out); return <line x1={ray.exit.x} y1={ray.exit.y} x2={end.x} y2={end.y} className="fl23-ray" data-ray="exit" style={{ stroke: colourOf(k) }} />; })()}
      </g>)}
      {first.exit && normal(first.exit, (() => { const f = { x: g.right.x - g.apex.x, y: g.right.y - g.apex.y }; const len = Math.hypot(f.x, f.y); return { x: f.y / len, y: -f.x / len }; })())}
      {deviation !== null && view.light === "laser" && <text x={20} y={380} className="fl23-angle">Góc lệch D = {formatAngle(deviation)}</text>}
      {view.light === "white" && <SpectrumInset view={view} landings={g.rays.map((ray) => ray.exit && ray.out ? g.toScreen(ray.exit, ray.out).y : null)} />}
      {view.laser.kind === "total" && <text x={20} y={380} className="fl23-angle fl23-total">Phản xạ toàn phần ở mặt bên thứ hai</text>}
    </>}
    <text x={20} y={24} className="fl23-angle">i₁ = {formatAngle(view.incidenceDeg)}</text>
  </svg>;
}

/** The colours land about 2° apart, too close to read on the screen itself: this inset magnifies the strip, keeping their real relative positions. */
function SpectrumInset({ view, landings }: { view: PrismView; landings: (number | null)[] }) {
  const ys = landings.filter((y): y is number => y !== null);
  if (ys.length < 2) return null;
  const top = Math.min(...ys);
  const span = Math.max(...ys) - top || 1;
  const x = 20, y = 318, w = 170, h = 56;
  return <g className="fl23-inset" data-testid="optics-spectrum-inset">
    <rect x={x - 6} y={y - 18} width={w + 12} height={h + 26} rx={6} className="fl23-inset-box" />
    <text x={x} y={y - 6} className="fl23-small">Dải màu trên màn (phóng to)</text>
    {landings.map((landing, k) => landing === null ? null : <rect key={view.spectrum[k]?.id ?? k} x={x} y={y + ((landing - top) / span) * (h - 7)} width={w} height={7}
      style={{ fill: SPECTRUM_FILL[view.spectrum[k]?.id ?? ""] ?? "#999" }} data-colour={view.spectrum[k]?.id} />)}
  </g>;
}
