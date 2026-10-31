import type { K3Instruments } from "../k3-config";
import { cylinderGraduations, cylinderHeightMm, cylinderLevelMm, formatReading, MENISCUS_RISE_MM } from "../k3-geometry";

type Locale = "vi" | "en";

/** 2D electronic balance: the same model reading as the 3D view, as text and drawing. */
export function Balance2D({ instrument, readingG, label, locale = "vi" }: { instrument: K3Instruments["balance"]; readingG: number | null; label: string; locale?: Locale }) {
  const shown = readingG === null ? "0" : formatReading(readingG, instrument.resolutionG, locale);
  return <svg className="k3-2d" viewBox="0 0 240 150" role="img" aria-label={`${label}: ${shown} g`}>
    <rect x="70" y="18" width="100" height="10" rx="5" fill="var(--k3-metal)" />
    <rect x="114" y="28" width="12" height="16" fill="var(--k3-metal-dark)" />
    <rect x="20" y="44" width="200" height="86" rx="14" fill="var(--k3-body)" stroke="var(--k3-stroke)" strokeWidth="2" />
    <rect x="44" y="72" width="152" height="40" rx="6" fill="var(--k3-lcd)" />
    <text x="186" y="101" textAnchor="end" className="k3-2d-lcd">{shown} g</text>
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
