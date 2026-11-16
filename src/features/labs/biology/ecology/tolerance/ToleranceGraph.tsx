import { useRef } from "react";
import { formatDeciC, type EcoObservation } from "./eco-evidence";
import { nudgeKey, svgDrag } from "../../../shared/explore/svg-drag";

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
export type LimitGuess = { minDeciC: number; maxDeciC: number };
const toDeciC = (px: number) => Math.min(500, Math.max(0, Math.round(((px - LEFT) / (RIGHT - LEFT)) * 50) * 10));

/**
 * Explore adds direct manipulation (both optional, the Guided Lab passes neither): `onValueChange` lets the student drag
 * the temperature cursor along the axis; `guess` + `onGuessChange` draw two amber lines the student drags to bracket
 * where the fish can live, before the real limits are shown.
 */
export function ToleranceGraph({ limits, valueDeciC, showLimits, labels, onValueChange, guess, onGuessChange }: {
  limits: { minDeciC: number; maxDeciC: number };
  valueDeciC: number | null;
  showLimits: boolean;
  labels: { title: string; curve: string; lower: string; upper: string; illustrative: string };
  onValueChange?: (deciC: number) => void;
  guess?: LimitGuess | null;
  onGuessChange?: (guess: LimitGuess) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const frame = () => svg.current;
  const cursorDrag = onValueChange ? svgDrag((point) => onValueChange(toDeciC(point.x)), frame) : null;
  const clampGuess = (side: "minDeciC" | "maxDeciC", value: number): LimitGuess => side === "minDeciC"
    ? { ...guess!, minDeciC: Math.min(value, guess!.maxDeciC - 10) }
    : { ...guess!, maxDeciC: Math.max(value, guess!.minDeciC + 10) };
  const { minDeciC: min, maxDeciC: max } = limits;
  const base = 150;
  const curve = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return `${x(min + t * (max - min)).toFixed(1)},${(base - Math.pow(Math.sin(Math.PI * t), 0.7) * 104).toFixed(1)}`;
  }).join(" ");
  return <figure className="eco-graph" data-testid="eco-graph">
    <svg ref={svg} viewBox="0 0 640 200" role="img" aria-label={labels.title}>
      {guess && <rect className="eco-guess-band" x={x(guess.minDeciC)} y="30" width={x(guess.maxDeciC) - x(guess.minDeciC)} height={base - 30} />}
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
      {cursorDrag && valueDeciC !== null && <rect className="eco-axis-grip" x={LEFT - 12} y={base - 14} width={RIGHT - LEFT + 24} height="44" role="slider" tabIndex={0}
        aria-label="Kéo trên trục để đổi nhiệt độ" aria-valuemin={0} aria-valuemax={50} aria-valuenow={valueDeciC / 10} aria-valuetext={`${formatDeciC(valueDeciC)} °C`}
        data-testid="eco-axis-drag" onKeyDown={(event) => nudgeKey(event, valueDeciC, 10, 0, 500, onValueChange!)} {...cursorDrag} />}
      {guess && onGuessChange && (["minDeciC", "maxDeciC"] as const).map((side) => {
        const value = guess[side];
        const drag = svgDrag((point) => onGuessChange(clampGuess(side, toDeciC(point.x))), frame);
        const name = side === "minDeciC" ? "Em khoanh dưới" : "Em khoanh trên";
        return <g key={side} className="eco-guess" data-side={side} data-testid={`eco-guess-${side === "minDeciC" ? "min" : "max"}`}>
          <line x1={x(value)} y1="34" x2={x(value)} y2={base - 16} />
          <text x={x(value)} y={base - 2} textAnchor="middle">{formatDeciC(value)}</text>
          <circle cx={x(value)} cy="34" r="7" />
          <rect className="eco-guess-grip" x={x(value) - 14} y="26" width="28" height={base - 34} rx="8" role="slider" tabIndex={0}
            aria-label={`${name} (kéo để khoanh vùng sống)`} aria-valuemin={0} aria-valuemax={50} aria-valuenow={value / 10} aria-valuetext={`${formatDeciC(value)} °C`}
            onKeyDown={(event) => nudgeKey(event, value, 10, 0, 500, (next) => onGuessChange(clampGuess(side, next)))} {...drag} />
        </g>;
      })}
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
