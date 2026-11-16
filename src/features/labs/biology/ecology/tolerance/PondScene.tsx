import { useRef } from "react";
import { formatDeciC } from "./eco-evidence";
import { nudgeKey, svgDrag } from "../../../shared/explore/svg-drag";

/** hidden: before the prediction is checked; persists / gone: from the model observation. */
export type FishState = "hidden" | "persists" | "gone";

const FISH: Array<{ x: number; y: number; flip?: boolean; delay: string }> = [
  { x: 150, y: 190, delay: "0s" },
  { x: 330, y: 240, flip: true, delay: "-2s" },
  { x: 250, y: 290, delay: "-4s" },
];

/** A cross-section of a pond with cá rô phi and a thermometer; drawn procedurally, illustration only. */
export function PondScene({ valueDeciC, fish, label, onValueChange }: { valueDeciC: number; fish: FishState; label: string; onValueChange?: (deciC: number) => void }) {
  const thermo = useRef<SVGGElement>(null);
  // Explore only: drag the mercury column (tube 10–250 in the thermometer frame = 50–0 °C), steps of 1 °C.
  const drag = onValueChange ? svgDrag((point) => onValueChange(Math.min(500, Math.max(0, Math.round(((250 - point.y) / 240) * 50) * 10))), () => thermo.current) : null;
  const warmth = Math.round((valueDeciC / 500) * 100);
  return <svg className="eco-pond" viewBox="0 0 640 360" role="img" aria-label={label} data-fish={fish}>
    <rect className="eco-sky" x="0" y="0" width="640" height="120" />
    <path className="eco-bank" d="M0 104 Q40 96 60 120 L60 360 L0 360 Z M560 120 Q580 96 640 104 L640 360 L560 360 Z" />
    <path className="eco-water" style={{ ["--eco-warmth" as string]: `${warmth}%` }} d="M40 120 L560 120 L540 300 Q300 352 60 300 Z" />
    <path className="eco-mud" d="M60 300 Q300 352 540 300 L548 330 Q300 372 52 330 Z" />
    <path className="eco-surface" d="M40 120 Q170 112 300 120 T560 120" />
    {[90, 120, 470, 505].map((x, i) => <path key={x} className="eco-weed" d={`M${x} 316 q${i % 2 ? -14 : 12} -46 ${i % 2 ? 4 : -2} -${92 + i * 8}`} />)}
    {FISH.map(({ x, y, flip, delay }, i) => <g key={i} transform={`translate(${x} ${y})${flip ? " scale(-1 1)" : ""}`}>
      <g className="eco-fish" style={{ animationDelay: delay }}>
        <path className="eco-fish-tail" d="M-46 0 L-70 -18 L-64 0 L-70 18 Z" />
        <ellipse className="eco-fish-body" cx="0" cy="0" rx="48" ry="22" />
        <path className="eco-fish-fin" d="M-10 -20 Q6 -38 22 -18 Z" />
        <circle className="eco-fish-eye" cx="30" cy="-5" r="3.5" />
      </g>
    </g>)}
    {fish === "hidden" && <text className="eco-question" x="420" y="185" textAnchor="middle">?</text>}
    <g transform="translate(596 40)" ref={thermo}>
      {drag && <rect className="eco-thermo-grip" x="-26" y="-6" width="52" height="290" rx="14" role="slider" tabIndex={0} aria-label="Kéo nhiệt kế để đổi nhiệt độ nước"
        aria-valuemin={0} aria-valuemax={50} aria-valuenow={valueDeciC / 10} aria-valuetext={`${formatDeciC(valueDeciC)} °C`} data-testid="pond-thermo-drag"
        onKeyDown={(event) => nudgeKey(event, valueDeciC, 10, 0, 500, onValueChange!)} {...drag} />}
      <rect className="eco-thermo-tube" x="-9" y="0" width="18" height="250" rx="9" />
      <rect className="eco-thermo-mercury" x="-4" y="10" width="8" height="240" rx="4" style={{ transform: `scaleY(${Math.max(0.02, valueDeciC / 500)})` }} />
      <circle className="eco-thermo-bulb" cx="0" cy="262" r="16" />
      <text className="eco-thermo-label" x="0" y="306" textAnchor="middle">{formatDeciC(valueDeciC)} °C</text>
    </g>
  </svg>;
}
