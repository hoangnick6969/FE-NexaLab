import type { ReactNode } from "react";
import type { K3Instruments, K3Material, K3Specimen } from "../k3-config";
import { cylinderGraduations, cylinderHeightMm, cylinderLevelMm, formatReading, MENISCUS_RISE_MM } from "../k3-geometry";

type Locale = "vi" | "en";

/**
 * 2D electronic balance: the same model reading as the 3D view, as text and drawing.
 * `load` is SVG drawn standing on the pan (use the glyphs below; origin is the pan centre-top).
 */
export function Balance2D({ instrument, readingG, label, locale = "vi", load }: { instrument: K3Instruments["balance"]; readingG: number | null; label: string; locale?: Locale; load?: ReactNode }) {
  const shown = readingG === null ? "0" : formatReading(readingG, instrument.resolutionG, locale);
  return <svg className="k3-2d" viewBox="0 -70 240 220" role="img" aria-label={`${label}: ${shown} g`}>
    <g transform="translate(120 18)">{load}</g>
    <rect x="70" y="18" width="100" height="10" rx="5" fill="var(--k3-metal)" />
    <rect x="114" y="28" width="12" height="16" fill="var(--k3-metal-dark)" />
    <rect x="20" y="44" width="200" height="86" rx="14" fill="var(--k3-body)" stroke="var(--k3-stroke)" strokeWidth="2" />
    <rect x="44" y="72" width="152" height="40" rx="6" fill="var(--k3-lcd)" />
    <text x="186" y="101" textAnchor="end" className="k3-2d-lcd">{shown} g</text>
  </svg>;
}

/** Deterministic closed blob for an irregular specimen; same seed, same outline. */
export function blobPath(seed: number, rx: number, ry: number) {
  let a = seed >>> 0;
  const random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const count = 9;
  const points = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const radius = 0.82 + random() * 0.28;
    return [Math.cos(angle) * rx * radius, Math.sin(angle) * ry * radius] as const;
  });
  const mid = (i: number) => { const [x1, y1] = points[i % count]; const [x2, y2] = points[(i + 1) % count]; return [(x1 + x2) / 2, (y1 + y2) / 2] as const; };
  const [sx, sy] = mid(count - 1);
  return `M${sx.toFixed(1)} ${sy.toFixed(1)}` + points.map((point, i) => { const [mx, my] = mid(i); return ` Q${point[0].toFixed(1)} ${point[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`; }).join("") + " Z";
}

/** Specimen standing on its origin (bottom-centre), fitted into `fit` SVG units. */
export function Specimen2D({ specimen, material, fit = 56 }: { specimen: K3Specimen; material: K3Material; fit?: number }) {
  const fill = material.appearance.color;
  if (specimen.shape === "box") {
    const [x, , z] = specimen.sizeMm;
    const scale = Math.min(2.4, fit / Math.max(x, z));
    return <g className="k3-specimen"><rect x={-(x * scale) / 2} y={-z * scale} width={x * scale} height={z * scale} rx="2" fill={fill} stroke="var(--k3-specimen-outline)" strokeWidth="1.5" /></g>;
  }
  const radius = Math.min(fit / 2, 26);
  return <g className="k3-specimen" transform={`translate(0 ${-radius * 0.7})`}><path d={blobPath(specimen.seed, radius, radius * 0.7)} fill={fill} stroke="var(--k3-specimen-outline)" strokeWidth="1.5" /></g>;
}

/** Glass cup (beaker) with optional water, drawn as a pan load or standalone. */
export function CupGlyph({ waterMl, capacityMl }: { waterMl: number; capacityMl: number }) {
  const height = 52;
  const fill = height * Math.min(1, Math.max(0, waterMl / capacityMl));
  return <g className="k3-cup">
    {fill > 0 && <rect x="-21" y={-fill - 2} width="42" height={fill} fill="var(--k3-water)" />}
    <path d="M-24 -58 V-2 Q-24 0 -22 0 H22 Q24 0 24 -2 V-58" fill="none" stroke="var(--k3-glass-edge)" strokeWidth="3" strokeLinecap="round" />
  </g>;
}

/**
 * Ruler with an object edge laid along it from the 0 mark. The edge is drawn to
 * scale so the length is read from the graduations (1 mm divisions).
 */
export function Ruler2D({ edgeMm, edgeLabel, color, label, windowMm = 120 }: { edgeMm: number; edgeLabel: string; color: string; label: string; windowMm?: number }) {
  const unit = 6;
  const x0 = 24;
  const width = windowMm * unit + x0 * 2;
  return <svg className="k3-2d" viewBox={`0 0 ${width} 118`} role="img" aria-label={label}>
    <rect x={x0} y="14" width={edgeMm * unit} height="34" rx="2" fill={color} stroke="var(--k3-specimen-outline)" strokeWidth="1.5" />
    <text x={x0 + (edgeMm * unit) / 2} y="36" textAnchor="middle" className="k3-2d-edge">{edgeLabel}</text>
    <rect x={x0 - 8} y="52" width={windowMm * unit + 16} height="52" rx="4" fill="var(--k3-ruler)" stroke="var(--k3-stroke)" />
    {Array.from({ length: windowMm + 1 }, (_, mm) => {
      const long = mm % 10 === 0;
      const medium = mm % 5 === 0;
      return <g key={mm}>
        <line x1={x0 + mm * unit} x2={x0 + mm * unit} y1="52" y2={52 + (long ? 22 : medium ? 16 : 10)} stroke="var(--k3-scale)" strokeWidth={long ? 1.4 : 0.8} />
        {long && <text x={x0 + mm * unit} y="92" textAnchor="middle" className="k3-2d-scale">{mm}</text>}
      </g>;
    })}
    <text x={width - 14} y="100" textAnchor="end" className="k3-2d-scale">mm</text>
  </svg>;
}

/**
 * 2D graduated cylinder drawn from the shared geometry. `zoom` crops around
 * the liquid surface so the learner reads the bottom of the meniscus.
 */
export function Cylinder2D({ cylinder, volumeMl, label, zoom = false }: { cylinder: K3Instruments["cylinder"]; volumeMl: number; label: string; zoom?: boolean }) {
  const pxPerMm = 2;
  const height = cylinderHeightMm(cylinder) * pxPerMm;
  const inner = (cylinder.innerDiameterMm / 2) * pxPerMm;
  const wall = cylinder.wallMm * pxPerMm;
  const cx = 60;
  const y = (mm: number) => height - mm * pxPerMm + 10;
  const surface = y(cylinder.baseMm + cylinderLevelMm(cylinder, volumeMl));
  const rise = MENISCUS_RISE_MM * pxPerMm;
  const viewBox = zoom ? `0 ${surface - 40} 140 80` : `0 0 140 ${height + 20}`;
  return <svg className="k3-2d" viewBox={viewBox} role="img" aria-label={label}>
    <path d={`M${cx - inner} ${y(cylinder.baseMm)} V${surface - rise} Q${cx - inner} ${surface} ${cx} ${surface} Q${cx + inner} ${surface} ${cx + inner} ${surface - rise} V${y(cylinder.baseMm)} Z`} fill="var(--k3-water)" />
    <rect x={cx - inner - wall} y={y(cylinderHeightMm(cylinder))} width={wall} height={y(cylinder.baseMm) - y(cylinderHeightMm(cylinder))} fill="var(--k3-glass)" />
    <rect x={cx + inner} y={y(cylinderHeightMm(cylinder))} width={wall} height={y(cylinder.baseMm) - y(cylinderHeightMm(cylinder))} fill="var(--k3-glass)" />
    <rect x={cx - inner - wall} y={y(cylinder.baseMm)} width={2 * (inner + wall)} height={wall * 2} fill="var(--k3-glass)" />
    {cylinderGraduations(cylinder).map((mark) => <g key={mark.volumeMl}>
      <line x1={cx + inner - (mark.length === "long" ? 16 : mark.length === "medium" ? 11 : 7)} x2={cx + inner} y1={y(mark.yMm)} y2={y(mark.yMm)} stroke="var(--k3-scale)" strokeWidth={mark.length === "short" ? 0.6 : 1} />
      {mark.label && <text x={cx + inner + wall + 4} y={y(mark.yMm) + 3} className="k3-2d-scale">{mark.label}</text>}
    </g>)}
  </svg>;
}
