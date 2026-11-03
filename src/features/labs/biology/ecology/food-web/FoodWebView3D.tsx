import { useLayoutEffect, useMemo, useRef, type ComponentType } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html, QuadraticBezierLine } from "@react-three/drei";
import { ArrowDown, ArrowUp } from "lucide-react";
import { FOOD_WEB_EDGES } from "@nexalab/sim";
import {
  Caterpillar, Decomposers, Eagle, EcoStage, Fox, Frog, GrassClump, Grasshopper, MeadowDiorama3D, Placed, Rabbit, Snake, Songbird, Tree,
  type CritterProps, type EcoView,
} from "../kit";
import { FOOD_WEB_LINKS } from "../kit/eco-palette";
import { FoodWebScene, nodeHandlers, type SceneProps } from "./FoodWebScene";
import type { SpeciesId } from "./fw-evidence";

type Vec3 = [number, number, number];
/**
 * Where each organism lives on the meadow and which way it faces; `label` is
 * the label's offset from that spot (clear of the neighbours), `link` the
 * height where arrows start and end.
 */
const SPOTS: Record<SpeciesId, { at: Vec3; facing?: number; label: Vec3; link: number; Figure: ComponentType<CritterProps> }> = {
  // Front row
  co: { at: [-6.3, 0, 1.9], label: [0, 1.0, 0], link: 0.45, Figure: GrassClump },
  ech: { at: [-2.4, 0, 1.9], facing: 0.6, label: [0, 0.75, 0], link: 0.25, Figure: Frog },
  tho: { at: [2.6, 0, 1.9], facing: Math.PI - 0.3, label: [0, 1.15, 0], link: 0.45, Figure: Rabbit },
  "nam-vi-khuan": { at: [6.3, 0, 1.9], label: [0, 0.85, 0], link: 0.3, Figure: Decomposers },
  // Middle row
  "chau-chau": { at: [-5.0, 0, 0], facing: 0.3, label: [0, 0.75, 0], link: 0.3, Figure: Grasshopper },
  ran: { at: [-0.3, 0, 0.5], facing: 0.4, label: [0.2, 0.6, 0], link: 0.15, Figure: Snake },
  // Back row: the tree with its caterpillar and bird, the fox; the eagle above
  "cay-xanh": { at: [0, 0, -1.8], label: [0.5, 4.45, 0], link: 2.6, Figure: Tree },
  sau: { at: [0.86, 2.36, -1.8], facing: 2.8, label: [1.2, 0.1, 0], link: 0.12, Figure: Caterpillar },
  "chim-sau": { at: [-0.62, 3.08, -1.45], facing: -0.4, label: [-1.35, 0.35, 0], link: 0.3, Figure: Songbird },
  cao: { at: [4.6, 0, -1.3], facing: Math.PI + 0.4, label: [0, 1.25, 0], link: 0.5, Figure: Fox },
  "dai-bang": { at: [2.8, 5.0, -0.9], facing: Math.PI - 0.5, label: [0, 0.65, 0], link: 0, Figure: Eagle },
};
/** Remains and waste reach the decomposers from every level; three representative dashed links show it. */
const DECAY_FROM: SpeciesId[] = ["cay-xanh", "tho", "cao"];
const VIEW: EcoView = { target: [0, 1.6, 0.3], direction: [0, 0.72, 1], width: 18.6, height: 8.6 };
const AVOID = [".lab-space-header", ".lab-space-header-actions", ".fw-dock", ".lab-space .lab-actions", ".fw-panel[data-open='true']", ".lab-aside", ".fw-card"];
/** Free spots for the tufts: organisms on the ground and the tree trunk. */
const CLEAR: Array<[number, number, number]> = (Object.keys(SPOTS) as SpeciesId[]).filter((id) => SPOTS[id].at[1] === 0).map((id) => [SPOTS[id].at[0], SPOTS[id].at[2], 0.7]);
const PUDDLE: [number, number, number] = [-3.5, 1.5, 0.55];

const linkEnd = (id: SpeciesId) => { const { at, link } = SPOTS[id]; return new THREE.Vector3(at[0], at[1] + link, at[2]); };
const labelAt = (id: SpeciesId): Vec3 => { const { at, label } = SPOTS[id]; return [at[0] + label[0], at[1] + label[1], at[2] + label[2]]; };

/** A food → eater arrow arched over the meadow, ending in a cone, shortened so it stops beside each organism. */
function Link({ from, to, color, width, dashed = false, opacity = 1, head = true, flow = false }: {
  from: SpeciesId; to: SpeciesId; color: string; width: number; dashed?: boolean; opacity?: number; head?: boolean;
  /** Dots running from food to eater, so the direction reads without the arrowhead. */
  flow?: boolean;
}) {
  const { start, end, mid, curve, quaternion } = useMemo(() => {
    const a = linkEnd(from), b = linkEnd(to);
    const dir = b.clone().sub(a).normalize();
    const start = a.clone().addScaledVector(dir, 0.45), end = b.clone().addScaledVector(dir, -0.55);
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.5 + start.distanceTo(end) * 0.12, 0.3));
    const tangent = end.clone().sub(mid).normalize();
    return { start, end, mid, curve: new THREE.QuadraticBezierCurve3(start, mid, end), quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent) };
  }, [from, to]);
  const dots = useRef<THREE.Group>(null);
  const time = useRef(0);
  const place = () => dots.current?.children.forEach((dot, i) => dot.position.copy(curve.getPoint((time.current * 0.35 + i / 3) % 1)));
  useLayoutEffect(place, [curve, flow]);
  useFrame((state, delta) => {
    if (!flow || !dots.current) return;
    time.current += Math.min(delta, 0.1);
    place();
    state.invalidate();
  });
  return <group>
    <QuadraticBezierLine start={start} end={end} mid={mid} color={color} lineWidth={width} dashed={dashed} dashSize={0.18} gapSize={0.14} transparent opacity={opacity} />
    {head && <mesh position={end} quaternion={quaternion}>
      <coneGeometry args={[0.1 + width * 0.02, 0.34, 12]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>}
    {flow && <group ref={dots}>
      {[0, 1, 2].map((i) => <mesh key={i}><sphereGeometry args={[0.035 + width * 0.008, 8, 6]} /><meshBasicMaterial color={color} transparent opacity={opacity} /></mesh>)}
    </group>}
  </group>;
}

/**
 * FL-21 food web as a K8 meadow diorama: each organism stands where it lives,
 * arrows run from food to eater. Labels are real buttons in a DOM overlay (same
 * `.fw-node` contract as the 2D board); the canvas itself is decorative.
 */
export function FoodWebView3D(props: SceneProps & { layoutKey: string }) {
  const { names, roleNames, effectNames, removedLabel, chain = [], brokenAt = null, removed = null, effects = null, roles = null, pickable, onPick, focus = null, onInspect, label, illustrative, layoutKey } = props;
  const overlay = useRef<HTMLDivElement>(null!);
  const inChain = (food: SpeciesId, eater: SpeciesId) => chain.some((id, i) => i > 0 && chain[i - 1] === food && id === eater);
  const brokenPair = brokenAt !== null && brokenAt > 0 ? [chain[brokenAt - 1], chain[brokenAt]] as const : null;
  const canPick = (id: SpeciesId) => Boolean(onPick && pickable?.(id));
  return <div className="fw-meadow" data-testid="fw-scene" role="group" aria-label={label}>
    <EcoStage view={VIEW} avoid={AVOID} layoutKey={layoutKey}
      fallback={<FoodWebScene {...props} />}
      scene={({ animate, dark }) => {
        const colors = dark ? FOOD_WEB_LINKS.dark : FOOD_WEB_LINKS.light;
        return <>
          <MeadowDiorama3D dark={dark} puddle={PUDDLE} clear={CLEAR} />
          {(Object.keys(SPOTS) as SpeciesId[]).map((id) => {
            const { at, facing, Figure } = SPOTS[id];
            const effect = effects?.[id];
            const ring = chain.includes(id) ? colors.chain : effect === "INCREASE" ? colors.increase : effect === "DECREASE" ? colors.decrease : null;
            return <group key={id}
              onClick={(event) => { event.stopPropagation(); if (canPick(id)) onPick!(id); else onInspect?.(id); }}
              onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; if (event.pointerType === "mouse") onInspect?.(id); }}
              onPointerOut={(event) => { document.body.style.cursor = ""; if (event.pointerType === "mouse") onInspect?.(null); }}>
              <Placed position={at} facing={facing} removed={removed === id}><Figure animate={animate && removed !== id} /></Placed>
              {ring && <mesh position={[at[0], at[1] + 0.03, at[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.55, 0.68, 36]} />
                <meshBasicMaterial color={ring} transparent opacity={0.85} />
              </mesh>}
            </group>;
          })}
          {FOOD_WEB_EDGES.map(([food, eater]) => {
            const on = inChain(food, eater), cut = removed === food || removed === eater;
            const lit = !on && Boolean(focus?.link(food, eater));
            const dim = cut || (focus && !on && !lit);
            return <Link key={food + eater} from={food} to={eater} color={on ? colors.chain : lit ? colors.focus : colors.edge}
              width={on ? 6 : lit ? 5 : 3} opacity={dim ? 0.14 : 1} flow={animate && !dim} />;
          })}
          {brokenPair && <Link from={brokenPair[0]} to={brokenPair[1]} color={colors.missing} width={3.5} dashed />}
          {DECAY_FROM.map((id) => <Link key={id} from={id} to="nam-vi-khuan" color={colors.decay} width={1.5} dashed head={false} opacity={0.8} />)}
          {(Object.keys(SPOTS) as SpeciesId[]).map((id) => {
            const order = chain.indexOf(id);
            const effect = effects?.[id];
            const role = roles?.[id];
            const description = [names[id], role ? roleNames[role] : null, removed === id ? removedLabel : null, effect && effect !== "NO_DIRECT_EFFECT" ? effectNames[effect] : null].filter(Boolean).join(", ");
            return <Html key={id} position={labelAt(id)} portal={overlay} zIndexRange={[10, 0]}>
              <button type="button" className="fw-node" data-species={id}
                data-removed={removed === id} data-effect={effect ?? undefined} data-in-chain={order >= 0} data-role={role ?? undefined}
                data-dim={Boolean(focus && order < 0 && !focus.species.has(id))}
                aria-disabled={!canPick(id)} aria-label={description}
                {...nodeHandlers(id, canPick(id), onPick, onInspect)}>
                {order >= 0 && <span className="fw-order" aria-hidden="true">{order + 1}</span>}
                <span className="fw-name">{names[id]}</span>
                {role && <small className="fw-role">{roleNames[role]}</small>}
                {effect === "INCREASE" && <ArrowUp size={14} className="fw-effect" aria-hidden="true" />}
                {effect === "DECREASE" && <ArrowDown size={14} className="fw-effect" aria-hidden="true" />}
              </button>
            </Html>;
          })}
        </>;
      }} />
    <div ref={overlay} className="fw-meadow-labels" />
    <p className="fw-meadow-note">{illustrative}</p>
  </div>;
}
