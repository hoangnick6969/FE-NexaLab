import { formatDeciC, type EcoObservation } from "./eco-evidence";

type Comparison = Extract<EcoObservation, { setup: "import-comparison" }>;
const LEFT = 88, RIGHT = 616;
const x = (deciC: number) => LEFT + (deciC / 500) * (RIGHT - LEFT);
const TICKS = [0, 100, 200, 300, 400, 500];

function Axis({ y }: { y: number }) {
  return <g className="eco-axis">
    <line x1={LEFT} y1={y} x2={RIGHT} y2={y} />
    {TICKS.map((tick) => <g key={tick}>
      <line x1={x(tick)} y1={y} x2={x(tick)} y2={y + 6} />
      <text x={x(tick)} y={y + 22} textAnchor="middle">{tick / 10}</text>
    </g>)}
    <text x={RIGHT} y={y + 40} textAnchor="end">°C</text>
  </g>;
}

/**
 * One species: an illustrative growth curve between the limits (no y values,
 * no optimum in v1). Limit markers appear only once the learner has read them.
 */
export function ToleranceGraph({ limits, valueDeciC, showLimits, labels }: {
  limits: { minDeciC: number; maxDeciC: number };
  valueDeciC: number | null;
  showLimits: boolean;
  labels: { title: string; curve: string; lower: string; upper: string; illustrative: string };
}) {
  const { minDeciC: min, maxDeciC: max } = limits;
  const base = 150;
  const curve = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return `${x(min + t * (max - min)).toFixed(1)},${(base - Math.pow(Math.sin(Math.PI * t), 0.7) * 104).toFixed(1)}`;
  }).join(" ");
  return <figure className="eco-graph" data-testid="eco-graph">
    <svg viewBox="0 0 640 200" role="img" aria-label={labels.title}>
      <text className="eco-graph-y" x={LEFT - 10} y="40" textAnchor="end">{labels.curve}</text>
      {showLimits && <polyline className="eco-curve" points={curve} />}
      {showLimits && <g className="eco-limits" data-testid="eco-limit-markers">
        {[[min, labels.lower], [max, labels.upper]].map(([value, name]) => <g key={String(value)}>
          <line x1={x(Number(value))} y1="30" x2={x(Number(value))} y2={base} />
          <text x={x(Number(value))} y="22" textAnchor="middle">{name} {formatDeciC(Number(value))} °C</text>
        </g>)}
      </g>}
      {valueDeciC !== null && <g className="eco-cursor" style={{ transform: `translateX(${x(valueDeciC) - LEFT}px)` }}>
        <line x1={LEFT} y1="30" x2={LEFT} y2={base} />
        <circle cx={LEFT} cy={base} r="6" />
      </g>}
      <Axis y={base} />
    </svg>
    <figcaption>{labels.illustrative}</figcaption>
  </figure>;
}

/** Hypothetical fish A, B, C against the site's yearly water range. */
export function ComparisonGraph({ comparison, revealed, labels }: {
  comparison: Comparison;
  revealed: boolean;
  labels: { title: string; site: string; to: string; fish: Record<string, string>; suitable: string; cold: string; heat: string; both: string; illustrative: string };
}) {
  const rows = comparison.candidates;
  const top = 34, gap = 40, bottom = top + rows.length * gap + 6;
  const verdict = (candidate: Comparison["candidates"][number]) => candidate.suitable ? labels.suitable
    : candidate.failsOn === "COLD" ? labels.cold : candidate.failsOn === "HEAT" ? labels.heat : labels.both;
  return <figure className="eco-graph" data-testid="eco-comparison">
    <svg viewBox={`0 0 640 ${bottom + 50}`} role="img" aria-label={labels.title}>
      <rect className="eco-site" x={x(comparison.site.minDeciC)} y={top - 14} width={x(comparison.site.maxDeciC) - x(comparison.site.minDeciC)} height={bottom - top + 10} />
      <text className="eco-site-label" x={x(comparison.site.minDeciC) + 6} y={top - 18}>{labels.site}: {formatDeciC(comparison.site.minDeciC)} {labels.to} {formatDeciC(comparison.site.maxDeciC)} °C</text>
      {rows.map((candidate, i) => {
        const y = top + i * gap;
        return <g key={candidate.speciesId} data-suitable={revealed ? String(candidate.suitable) : undefined}>
          <text className="eco-row-label" x={LEFT - 10} y={y + 14} textAnchor="end">{labels.fish[candidate.speciesId]}</text>
          <rect className="eco-range" x={x(candidate.limits.minDeciC)} y={y} width={x(candidate.limits.maxDeciC) - x(candidate.limits.minDeciC)} height="20" rx="4" />
          <text className="eco-range-value" x={x(candidate.limits.minDeciC) + 6} y={y + 14}>{formatDeciC(candidate.limits.minDeciC)} {labels.to} {formatDeciC(candidate.limits.maxDeciC)}</text>
          {revealed && <text className="eco-row-verdict" x={RIGHT} y={y + 14} textAnchor="end">{verdict(candidate)}</text>}
        </g>;
      })}
      <Axis y={bottom} />
    </svg>
    <figcaption>{labels.illustrative}</figcaption>
  </figure>;
}
