/** FL-24 2D diagram: the same state as the 3D bench, drawn as SVG (pendulum with its energy bars, hoist with its instruments). */
import { POSITION_VI, formatNewtons, formatSeconds, pendulumAngle, type LiftView, type PendulumView } from "./energy-log";

const W = 400;
const H = 300;
const BAR_KEYS = [["kinetic", "Wđ"], ["potential", "Wt"], ["mechanical", "W"]] as const;
const share = (value: number, scaleMj: number) => scaleMj > 0 ? Math.max(0, Math.min(1, value / scaleMj)) : 0;

export function Pendulum2D({ view, lengthMm, scaleMj }: { view: PendulumView; lengthMm: number; scaleMj: number }) {
  // Pivot and string length keep a swing of up to ±60° (h₀ = L/2) inside the left 300 px; the bars sit to the right of it.
  const pivot = { x: 150, y: 30 };
  const len = 170;
  const angle = pendulumAngle(lengthMm, view.heightMm, view.position);
  const bob = { x: pivot.x + len * Math.sin(angle), y: pivot.y + len * Math.cos(angle) };
  const releaseAngle = pendulumAngle(lengthMm, view.dropHeightMm, "release");
  const lowestY = pivot.y + len;
  const hScale = len / lengthMm;
  const values = { kinetic: view.kineticMj, potential: view.potentialMj, mechanical: view.mechanicalMj };
  return <svg viewBox={`0 0 ${W} ${H}`} className="fl24-svg" role="img" aria-label={`Con lắc ở ${POSITION_VI[view.position]}, độ cao ${view.heightMm} mm, quả nặng ${view.massG} g`}>
    <line x1={100} x2={200} y1={pivot.y} y2={pivot.y} className="fl24-frame" />
    <path className="fl24-arc" d={`M ${pivot.x + len * Math.sin(releaseAngle)} ${pivot.y + len * Math.cos(releaseAngle)} A ${len} ${len} 0 0 0 ${pivot.x - len * Math.sin(releaseAngle)} ${pivot.y + len * Math.cos(releaseAngle)}`} />
    <line x1={10} x2={296} y1={lowestY} y2={lowestY} className="fl24-ground" />
    <line x1={10} x2={296} y1={lowestY - view.dropHeightMm * hScale} y2={lowestY - view.dropHeightMm * hScale} className="fl24-level" />
    <text x={14} y={lowestY - view.dropHeightMm * hScale - 4} className="fl24-small">h₀ = {view.dropHeightMm} mm</text>
    <line x1={pivot.x} y1={pivot.y} x2={bob.x} y2={bob.y} className="fl24-string" />
    <circle cx={bob.x} cy={bob.y} r={8 + view.massG / 100} className="fl24-bob" data-position={view.position} />
    {BAR_KEYS.map(([key, label], index) => {
      const height = 220 * share(values[key], scaleMj);
      return <g key={key} className={`fl24-bar fl24-bar-${key}`} data-kind={key}>
        <rect x={314 + index * 28} y={250 - 220} width={22} height={220} className="fl24-bar-track" />
        <rect x={314 + index * 28} y={250 - height} width={22} height={height} />
        <text x={325 + index * 28} y={268} className="fl24-label">{label}</text>
      </g>;
    })}
  </svg>;
}

export function Hoist2D({ lift, maxDistanceMm, lifted }: { lift: LiftView; maxDistanceMm: number; lifted: boolean }) {
  const ground = 270;
  const top = 40;
  const scale = (ground - top - 70) / maxDistanceMm;
  const rise = lifted ? lift.distanceMm * scale : 0;
  const box = 22 + Math.min(18, lift.massG / 120);
  const loadTop = ground - box - rise;
  return <svg viewBox={`0 0 ${W} ${H}`} className="fl24-svg" role="img" aria-label={`Tời ${lifted ? "đã kéo" : "sẵn sàng kéo"} vật ${lift.massG} g lên ${lift.distanceMm} mm bằng ${lift.motorVi.toLowerCase()}`}>
    <line x1={120} x2={120} y1={ground} y2={top} className="fl24-frame" />
    <line x1={100} x2={200} y1={top} y2={top} className="fl24-frame" />
    <circle cx={180} cy={top + 8} r={10} className="fl24-pulley" />
    <rect x={60} y={ground - 30} width={50} height={30} rx={4} className="fl24-motor" />
    <text x={85} y={ground + 18} className="fl24-label">{lift.motorVi}</text>
    <line x1={190} x2={190} y1={top + 8} y2={loadTop - 34} className="fl24-string" />
    <rect x={183} y={loadTop - 34} width={14} height={26} rx={3} className="fl24-gauge" />
    <line x1={190} x2={190} y1={loadTop - 8} y2={loadTop} className="fl24-string" />
    <rect x={190 - box / 2} y={loadTop} width={box} height={box} className="fl24-load" />
    <text x={176} y={loadTop - 18} textAnchor="end" className="fl24-small">F = {formatNewtons(lift.forceMilliNewtons)}</text>
    <line x1={250} x2={250} y1={ground} y2={ground - maxDistanceMm * scale} className="fl24-ruler" />
    {Array.from({ length: Math.floor(maxDistanceMm / 100) + 1 }, (_, index) => <g key={index} className="fl24-tick">
      <line x1={250} x2={258} y1={ground - index * 100 * scale} y2={ground - index * 100 * scale} />
      {index % 2 === 0 && <text x={262} y={ground - index * 100 * scale + 4} className="fl24-small">{index * 100}</text>}
    </g>)}
    <line x1={20} x2={W - 20} y1={ground} y2={ground} className="fl24-ground" />
    <text x={340} y={60} className="fl24-label">t = {lifted ? formatSeconds(lift.durationMs) : "0 s"}</text>
  </svg>;
}
