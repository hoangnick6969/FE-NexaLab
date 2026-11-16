/** FL-04 2D cross-section: the same state as the 3D bench, drawn as an SVG diagram with arrows sized by level. */
import type { DepthProbeSettings, PistonSettings } from "@nexalab/sim/fluid";
import { OUTCOME_VI, positionVi, type PistonReading, type ProbeReading } from "./pressure-log";

const W = 360;
const H = 300;

function Arrow({ x, y, dx, dy, level }: { x: number; y: number; dx: number; dy: number; level: number }) {
  if (level === 0) return null;
  const len = 6 + level * 5;
  const x0 = x - dx * len;
  const y0 = y - dy * len;
  return <g className="fl04-arrow" data-level={level}>
    <line x1={x0} y1={y0} x2={x} y2={y} strokeWidth={2.4} />
    <polygon points={`${x},${y} ${x - dx * 6 - dy * 4},${y - dy * 6 + dx * 4} ${x - dx * 6 + dy * 4},${y - dy * 6 - dx * 4}`} />
  </g>;
}

export function DepthProbe2D({ settings, probe, levels }: { settings: DepthProbeSettings; probe: ProbeReading; levels: number }) {
  const scale = (H - 30) / settings.tankHeightMm;
  const floorY = H - 10;
  const surfaceY = floorY - settings.waterLevelMm * scale;
  const cx = W / 2 + probe.positionMm * 0.9;
  const bottomY = surfaceY + probe.depthMm * scale;
  const holeY = bottomY - settings.sideHoleOffsetMm * scale;
  const r = 26;
  const bulge = (level: number) => (level / levels) * 10;
  return <svg viewBox={`0 0 ${W} ${H}`} className="fl04-svg" role="img" aria-label={`Bình trụ ở độ sâu ${probe.depthMm} mm, ${positionVi(probe.positionMm)}`}>
    <rect x={30} y={floorY - settings.tankHeightMm * scale} width={W - 60} height={settings.tankHeightMm * scale} className="fl04-glass" />
    <rect x={32} y={surfaceY} width={W - 64} height={floorY - surfaceY} className="fl04-water" />
    {Array.from({ length: Math.floor(settings.waterLevelMm / 50) + 1 }, (_, index) => <g key={index} className="fl04-ruler">
      <line x1={W - 30} x2={W - 22} y1={surfaceY + index * 50 * scale} y2={surfaceY + index * 50 * scale} />
      <text x={W - 4} y={surfaceY + index * 50 * scale + 4} textAnchor="end">{index * 50}</text>
    </g>)}
    <rect x={cx - 5} y={8} width={10} height={Math.max(0, holeY - 30 - 8)} className="fl04-probe" />
    <path className="fl04-probe" d={`M ${cx - r} ${holeY - 30} H ${cx + r} V ${bottomY} H ${cx - r} Z`} />
    <path className="fl04-membrane" data-membrane="C" d={`M ${cx - r} ${bottomY} Q ${cx} ${bottomY - bulge(probe.levels.C) * 2} ${cx + r} ${bottomY}`} />
    <path className="fl04-membrane" data-membrane="A" d={`M ${cx - r} ${holeY - 10} Q ${cx - r + bulge(probe.levels.A) * 2} ${holeY} ${cx - r} ${holeY + 10}`} />
    <path className="fl04-membrane" data-membrane="B" d={`M ${cx + r} ${holeY - 10} Q ${cx + r - bulge(probe.levels.B) * 2} ${holeY} ${cx + r} ${holeY + 10}`} />
    <Arrow x={cx} y={bottomY + 2} dx={0} dy={-1} level={probe.levels.C} />
    <Arrow x={cx - r - 2} y={holeY} dx={1} dy={0} level={probe.levels.A} />
    <Arrow x={cx + r + 2} y={holeY} dx={-1} dy={0} level={probe.levels.B} />
    <text x={cx + 14} y={bottomY + 16} className="fl04-label">C</text>
    <text x={cx - r - 26} y={holeY - 8} className="fl04-label">A</text>
    <text x={cx + r + 20} y={holeY - 8} className="fl04-label">B</text>
  </svg>;
}

export function Pistons2D({ settings, pistons }: { settings: PistonSettings; pistons: PistonReading }) {
  const w1 = 80;
  const w2 = w1 * (settings.areasMm2[1] / settings.areasMm2[0]);
  const travel = 14;
  const y1 = 120 + (pistons.outcome === "piston1_down" ? travel : pistons.outcome === "piston2_down" ? -travel / 2 : 0);
  const y2 = 120 + (pistons.outcome === "piston2_down" ? travel : pistons.outcome === "piston1_down" ? -travel * 2 : 0);
  const x1 = 100;
  const x2 = 260;
  const stack = (x: number, y: number, count: number) => Array.from({ length: count }, (_, index) => <rect key={index} x={x - 9} y={y - 18 - index * 10} width={18} height={8} rx={2} className="fl04-weight" />);
  return <svg viewBox={`0 0 ${W} ${H}`} className="fl04-svg" role="img" aria-label={`${OUTCOME_VI[pistons.outcome]}. Đĩa (1) ${pistons.pan1} quả, đĩa (2) ${pistons.pan2} quả`}>
    <path className="fl04-water" d={`M ${x1 - w1 / 2} ${y1} V 250 H ${x2 + w2 / 2} V ${y2} H ${x2 - w2 / 2} V 230 H ${x1 + w1 / 2} V ${y1} Z`} />
    <path className="fl04-glass-line" d={`M ${x1 - w1 / 2} 60 V 250 H ${x2 + w2 / 2} V 60 M ${x2 - w2 / 2} 60 V 230 H ${x1 + w1 / 2} V 60`} />
    <rect x={x1 - w1 / 2} y={y1 - 8} width={w1} height={8} className="fl04-piston" data-piston="1" />
    <rect x={x2 - w2 / 2} y={y2 - 8} width={w2} height={8} className="fl04-piston" data-piston="2" />
    <line x1={x1} x2={x1} y1={y1 - 8} y2={y1 - 30} className="fl04-rod" />
    <line x1={x2} x2={x2} y1={y2 - 8} y2={y2 - 30} className="fl04-rod" />
    <rect x={x1 - 26} y={y1 - 34} width={52} height={4} className="fl04-pan" />
    <rect x={x2 - 26} y={y2 - 34} width={52} height={4} className="fl04-pan" />
    {stack(x1, y1 - 16, pistons.pan1)}
    {stack(x2, y2 - 16, pistons.pan2)}
    <text x={x1} y={280} className="fl04-label">(1)</text>
    <text x={x2} y={280} className="fl04-label">(2)</text>
  </svg>;
}
