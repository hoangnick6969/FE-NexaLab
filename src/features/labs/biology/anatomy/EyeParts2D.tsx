/**
 * FL-16 studio, 2D: a schematic longitudinal section of the eye with the eight parts of `eye@1.0.0` as pickable regions.
 * Same part ids and names as the 3D `EyeModel`; the 2D view and the no-WebGL fallback of the structure stations.
 */
import type { ReactElement } from "react";
import type { EyePartId } from "./kit/eye-parts";

type Props = {
  selected: EyePartId | null;
  /** Parts drawn faded (the student hid the outer layers). */
  hidden?: ReadonlySet<EyePartId>;
  /** Names shown on the drawing; a part without one shows a number tag. */
  names: Partial<Record<EyePartId, string>>;
  onPick?: (id: EyePartId) => void;
  label: string;
};

/** Number order of the tags (front to back, as light goes); `PAINT` is the drawing order, outer layers first. */
const ORDER: EyePartId[] = ["cornea", "aqueous", "pupil", "lens", "vitreous", "retina", "sclera", "nerve"];
const PAINT: EyePartId[] = ["nerve", "sclera", "vitreous", "retina", "aqueous", "lens", "pupil", "cornea"];
const TAG: Record<EyePartId, [number, number]> = {
  cornea: [92, 118], aqueous: [150, 58], pupil: [150, 318], lens: [262, 40], vitreous: [392, 150], retina: [520, 40], sclera: [420, 352], nerve: [560, 262],
};
const ANCHOR: Record<EyePartId, [number, number]> = {
  cornea: [152, 168], aqueous: [200, 140], pupil: [218, 180], lens: [240, 130], vitreous: [392, 190], retina: [503, 112], sclera: [420, 320], nerve: [584, 186],
};

export function EyeParts2D({ selected, hidden, names, onPick, label }: Props) {
  const shapes: Record<EyePartId, ReactElement> = {
    nerve: <path d="M520 158 L 624 148 L 624 214 L 520 204 Z" />,
    sclera: <ellipse cx="362" cy="180" rx="172" ry="142" />,
    vitreous: <ellipse cx="378" cy="180" rx="146" ry="122" />,
    retina: <path d="M452 72 A 146 122 0 0 1 452 288" />,
    aqueous: <ellipse cx="204" cy="180" rx="22" ry="64" />,
    lens: <ellipse cx="240" cy="180" rx="24" ry="60" />,
    pupil: <g><rect className="eye-iris-piece" x="213" y="110" width="10" height="44" rx="3" /><rect className="eye-iris-piece" x="213" y="206" width="10" height="44" rx="3" /><rect className="eye-pupil-gap" x="211" y="156" width="14" height="48" rx="4" /></g>,
    cornea: <path d="M198 104 C 140 128 140 232 198 256 L 203 247 C 156 226 156 134 203 113 Z" />,
  };
  return <figure className="eye-parts-2d" data-testid="eye-parts-2d">
    <svg viewBox="0 0 660 370" role="img" aria-label={label}>
      <rect className="eye-diagram-bg" x="0" y="0" width="660" height="370" rx="16" />
      {PAINT.map((id) => {
        const dim = hidden?.has(id);
        return <g key={id} className="eye-part" data-part={id} data-selected={selected === id} data-hidden={dim || undefined}
          role={onPick ? "button" : undefined} tabIndex={onPick && !dim ? 0 : undefined} aria-label={names[id] ?? `Bộ phận ${ORDER.indexOf(id) + 1}`}
          onClick={onPick && !dim ? () => onPick(id) : undefined}
          onKeyDown={onPick && !dim ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPick(id); } } : undefined}>
          {shapes[id]}
        </g>;
      })}
      {ORDER.filter((id) => !hidden?.has(id)).map((id, index) => {
        const [tx, ty] = TAG[id];
        const [ax, ay] = ANCHOR[id];
        const text = names[id] ?? String(ORDER.indexOf(id) + 1);
        return <g key={`tag-${id}`} className="eye-part-tag" data-selected={selected === id} aria-hidden="true">
          <line x1={tx} y1={ty} x2={ax} y2={ay} />
          <circle cx={ax} cy={ay} r="3" />
          <text x={tx} y={ty - 6} textAnchor="middle" data-index={index}>{text}</text>
        </g>;
      })}
    </svg>
  </figure>;
}
