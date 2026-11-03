import { ArrowDown, ArrowUp } from "lucide-react";
import { FOOD_WEB_EDGES } from "@nexalab/sim";
import type { BoardFocus, Effect, Role, SpeciesId } from "./fw-evidence";

/** Layout in a 720 × 520 box: producers at the bottom, top consumers at the top. */
const NODE_POSITIONS: Record<SpeciesId, [number, number]> = {
  co: [180, 470], "cay-xanh": [420, 470], "nam-vi-khuan": [640, 470],
  "chau-chau": [150, 360], sau: [420, 360], tho: [640, 360],
  ech: [200, 250], "chim-sau": [420, 250], cao: [640, 250],
  ran: [310, 150], "dai-bang": [470, 50],
};
const W = 720, H = 520, NODE_HALF_HEIGHT = 22;

export type SceneProps = {
  names: Record<SpeciesId, string>;
  roleNames: Record<Role, string>;
  effectNames: Record<Effect, string>;
  removedLabel: string;
  /** Learner's chain in order; numbered on the nodes and drawn as a highlighted path. */
  chain?: SpeciesId[];
  /** Index of the first link that does not exist in the web (after a check). */
  brokenAt?: number | null;
  removed?: SpeciesId | null;
  effects?: Partial<Record<SpeciesId, Effect>> | null;
  roles?: Partial<Record<SpeciesId, Role>> | null;
  /** Species that can be tapped now; others are inert. */
  pickable?: (id: SpeciesId) => boolean;
  onPick?: (id: SpeciesId) => void;
  /** Species and links brought forward; the rest is dimmed. */
  focus?: BoardFocus | null;
  /** Show what a species eats and what eats it (hover, keyboard focus or a tap when it cannot be picked). */
  onInspect?: (id: SpeciesId | null) => void;
  label: string;
  illustrative: string;
};

function arrow(from: [number, number], to: [number, number]) {
  // Stop short of the node boxes so the arrowhead stays visible.
  const [x1, y1] = from, [x2, y2] = to;
  const length = Math.hypot(x2 - x1, y2 - y1);
  const pad = (NODE_HALF_HEIGHT + 6) / Math.max(0.35, Math.abs((y2 - y1) / length));
  const k = Math.min(0.45, pad / length);
  return { x1: x1 + (x2 - x1) * k, y1: y1 + (y2 - y1) * k, x2: x2 - (x2 - x1) * k, y2: y2 - (y2 - y1) * k };
}

/** Pointer and keyboard handlers shared by the 2D nodes and the 3D labels. */
export function nodeHandlers(id: SpeciesId, canPick: boolean, onPick?: (id: SpeciesId) => void, onInspect?: (id: SpeciesId | null) => void) {
  return {
    onClick: () => { if (canPick) onPick!(id); else onInspect?.(id); },
    onPointerEnter: (event: { pointerType: string }) => { if (event.pointerType === "mouse") onInspect?.(id); },
    onPointerLeave: (event: { pointerType: string }) => { if (event.pointerType === "mouse") onInspect?.(null); },
    onFocus: () => onInspect?.(id),
    onBlur: () => onInspect?.(null),
  };
}

export function FoodWebScene({ names, roleNames, effectNames, removedLabel, chain = [], brokenAt = null, removed = null, effects = null, roles = null, pickable, onPick, focus = null, onInspect, label, illustrative }: SceneProps) {
  const inChain = (food: SpeciesId, eater: SpeciesId) => chain.some((id, i) => i > 0 && chain[i - 1] === food && id === eater);
  const brokenPair = brokenAt !== null && brokenAt > 0 ? [chain[brokenAt - 1], chain[brokenAt]] as const : null;
  return <figure className="fw-scene" data-testid="fw-scene">
    <div className="fw-board" role="group" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          {["fw-head", "fw-head-on", "fw-head-focus"].map((id) => <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className={id} />
          </marker>)}
        </defs>
        {FOOD_WEB_EDGES.map(([food, eater]) => {
          const line = arrow(NODE_POSITIONS[food], NODE_POSITIONS[eater]);
          const on = inChain(food, eater);
          const cut = removed === food || removed === eater;
          const lit = !on && focus?.link(food, eater);
          const dim = focus && !on && !lit;
          return <line key={food + eater} {...line} className={"fw-edge" + (on ? " is-chain" : "") + (lit ? " is-focus" : "") + (dim ? " is-dim" : "") + (cut ? " is-cut" : "")} markerEnd={`url(#${on ? "fw-head-on" : lit ? "fw-head-focus" : "fw-head"})`} />;
        })}
        {brokenPair && (() => {
          const line = arrow(NODE_POSITIONS[brokenPair[0]], NODE_POSITIONS[brokenPair[1]]);
          return <line {...line} className="fw-edge is-missing" data-testid="fw-missing-link" />;
        })()}
        {/* Decomposers receive the remains of every level */}
        <path className="fw-decay" d="M560 470 C 520 420, 600 300, 640 290" />
      </svg>
      {(Object.keys(NODE_POSITIONS) as SpeciesId[]).map((id) => {
        const [x, y] = NODE_POSITIONS[id];
        const order = chain.indexOf(id);
        const effect = effects?.[id];
        const canPick = Boolean(onPick && pickable?.(id));
        const role = roles?.[id];
        const description = [names[id], role ? roleNames[role] : null, removed === id ? removedLabel : null, effect && effect !== "NO_DIRECT_EFFECT" ? effectNames[effect] : null].filter(Boolean).join(", ");
        return <button key={id} type="button" className="fw-node" data-species={id}
          data-removed={removed === id} data-effect={effect ?? undefined} data-in-chain={order >= 0} data-role={role ?? undefined}
          data-dim={Boolean(focus && order < 0 && !focus.species.has(id))}
          style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
          aria-disabled={!canPick} aria-label={description}
          {...nodeHandlers(id, canPick, onPick, onInspect)}>
          {order >= 0 && <span className="fw-order" aria-hidden="true">{order + 1}</span>}
          <span className="fw-name">{names[id]}</span>
          {role && <small className="fw-role">{roleNames[role]}</small>}
          {effect === "INCREASE" && <ArrowUp size={14} className="fw-effect" aria-hidden="true" />}
          {effect === "DECREASE" && <ArrowDown size={14} className="fw-effect" aria-hidden="true" />}
        </button>;
      })}
    </div>
    <figcaption>{illustrative}</figcaption>
  </figure>;
}

/** Four bars, widest at the producer; widths are not to scale. */
export function EnergyPyramid({ names, levelsKJ, heatKJ, labels }: {
  names: string[];
  levelsKJ: number[] | null;
  heatKJ: number[] | null;
  labels: { title: string; unit: string; heat: string; unknown: string; note: string };
}) {
  const widths = [100, 72, 48, 28];
  return <figure className="fw-pyramid" data-testid="fw-pyramid">
    <div role="group" aria-label={labels.title}>
      {names.map((_, i) => names.length - 1 - i).map((level) => <div key={level} className="fw-bar-row">
        <div className="fw-bar" style={{ width: `${widths[level]}%` }} data-level={level}>
          <span>{names[level]}</span>
          <b>{levelsKJ ? `${levelsKJ[level].toLocaleString("vi-VN")} ${labels.unit}` : labels.unknown}</b>
        </div>
        {heatKJ && level < heatKJ.length && <small className="fw-heat">{labels.heat} {heatKJ[level].toLocaleString("vi-VN")} {labels.unit}</small>}
      </div>)}
    </div>
    <figcaption>{labels.note}</figcaption>
  </figure>;
}
