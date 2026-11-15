/**
 * K2 3D bench composed on the shared `PhysicalLabEnvironment` (through `PhysicsStage`).
 * What the learner holds is the real model of that tool, following the pointer and snapping to the nearest
 * valid zone. A press without movement is a click and follows the same two-step path as the DOM controls.
 */
import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode } from "react";
import type { Group } from "three";
import * as THREE from "three";
import { measure, observeVessel, reagentById, SPECIES } from "@nexalab/sim/wet-bench";
import { PhysicsStage, type BenchViewPreset } from "../../../physics/shared/PhysicsStage";
import { K2_APPARATUS, isVesselKind } from "./apparatus-manifest";
import { FIXTURE_RENDERERS, HELD_TOOL_RENDERERS, VESSEL_RENDERERS } from "./apparatus-renderers";
import { Collider, Droplet, DropperUpright, PhMeter3D, prefersReducedMotion, ReagentBottle3D, SpatulaHolding, TargetRing, TongsHolding } from "./apparatus3d";
import { BENCH_TOP_Y, shelfPosition, slotById } from "./bench-layout";
import { apparatusLabel, DROPPER_CAPACITY_MICROLITERS, scaleDisplayMicrograms, validTargets, type BenchAction, type BenchUiState, type Held, type Target } from "./bench-reducer";
import { bottleCategory, LITMUS_HEX, reagentLook, vesselLook, visualFill } from "./liquid-look";
import { formatGrams, formatPh } from "./observation-log";

const VIEW: BenchViewPreset = {
  wide: { position: [0.15, 2.05, 3.05], target: [0.15, 0.2, 0.05] },
  narrow: { position: [0.15, 3.1, 4.7], target: [0.1, 0.0, 0.1] },
  minDistance: 1.6, maxDistance: 7, fitWidth: 4.9,
  insets: (size, narrow) => narrow ? { right: 0, bottom: Math.round(size.height * 0.42) } : { right: Math.min(380, size.width * 0.3), bottom: 150, top: 70 },
};
const CLICK_SLOP = 5;
const SNAP_RADIUS = 0.26;
const CURSOR_PLANE_Y = BENCH_TOP_Y + 0.12;
const BOTTLE_TOP = 0.32;

export const shortReagent = (id: string) => (reagentById(id)?.labelVi ?? id).replace(/^Dung dịch /, "");
/** Formula-only tag for a bottle in the 3D scene. */
export const bottleTag = (id: string) => {
  const composition = reagentById(id)?.composition;
  if (composition?.kind === "solution") return composition.solute ? SPECIES[composition.solute].formulaDisplay : "H₂O";
  if (composition?.kind === "solid" || composition?.kind === "powder") return SPECIES[composition.species].formulaDisplay;
  if (composition?.kind === "indicator") return "Phenol.";
  return id;
};

const QUY_NAME = { red: "đỏ", purple: "tím", blue: "xanh" } as const;

type Grab = { held: Held; label: string };
type Carry = { pos: THREE.Vector3; tilt: number };

const targetKey = (target: Target | null) => (target ? JSON.stringify(target) : "");

function targetPoint(state: BenchUiState, target: Target) {
  if (target.kind === "bottle") {
    const at = state.config.availableReagents.find((item) => item.reagentId === target.reagentId);
    if (!at) return null;
    const shelf = shelfPosition(at.shelfPosition);
    return new THREE.Vector3(shelf.x, BENCH_TOP_Y + 0.03, shelf.z);
  }
  const slotId = target.kind === "slot" ? target.slotId : state.current.positions[target.vesselId];
  const slot = slotById(slotId ?? "");
  return slot ? new THREE.Vector3(slot.x, slot.y ?? BENCH_TOP_Y, slot.z) : null;
}

function Tooltip({ title, detail, y }: { title: string; detail?: string; y: number }) {
  return <Html position={[0, y, 0]} center zIndexRange={[30, 20]} style={{ pointerEvents: "none" }}>
    <div className="k2-tooltip" role="presentation"><b>{title}</b>{detail && <span>{detail}</span>}</div>
  </Html>;
}

/** Eases a group from its resting place to wherever the pointer or a snap target says. */
function FollowGroup({ home, active, getTarget, children, scale = 1 }: { home: [number, number, number]; active: boolean; getTarget: () => Carry | null; children: ReactNode; scale?: number }) {
  const ref = useRef<Group>(null);
  const homeVector = useMemo(() => new THREE.Vector3(...home), [home[0], home[1], home[2]]);
  const reduced = prefersReducedMotion();
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const carry = active ? getTarget() : null;
    const k = 1 - Math.exp(-delta * (reduced ? 80 : 14));
    group.position.lerp(carry?.pos ?? homeVector, k);
    group.rotation.z += ((carry?.tilt ?? 0) - group.rotation.z) * k;
  });
  return <group ref={ref} position={home} scale={scale}>{children}</group>;
}

export function WetBenchKitStage({ state, dispatch, hovered, onHover, viewResetSignal, view = VIEW }: {
  state: BenchUiState; dispatch: Dispatch<BenchAction>; hovered: string | null; onHover: (id: string | null) => void; viewResetSignal: number;
  /** Camera override; only the lab-card thumbnail capture uses it. */
  view?: BenchViewPreset;
}) {
  return <PhysicsStage view={view} viewResetSignal={viewResetSignal}>
    <BenchScene state={state} dispatch={dispatch} hovered={hovered} onHover={onHover} />
  </PhysicsStage>;
}

function BenchScene({ state, dispatch, hovered, onHover }: { state: BenchUiState; dispatch: Dispatch<BenchAction>; hovered: string | null; onHover: (id: string | null) => void }) {
  const { camera, gl, controls } = useThree((s) => ({ camera: s.camera, gl: s.gl, controls: s.controls as { enabled: boolean } | null }));
  const [drag, setDrag] = useState<Grab | null>(null);
  const [hoverSnap, setHoverSnap] = useState<Target | null>(null);
  const cursor = useRef<THREE.Vector3 | null>(null);
  const snap = useRef<Target | null>(null);
  const config = state.config;
  const bench = state.current.bench;
  const carriedHeld = drag?.held ?? state.held;
  const latest = useRef({ state, held: carriedHeld });
  latest.current = { state, held: carriedHeld };
  const targets = useMemo(() => validTargets(state, carriedHeld), [state, carriedHeld]);

  // Lower exposure keeps the wooden bench a warm brown instead of washed out.
  useEffect(() => {
    const previous = gl.toneMappingExposure;
    gl.toneMappingExposure = 0.78;
    return () => { gl.toneMappingExposure = previous; };
  }, [gl]);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -CURSOR_PLANE_Y), []);
  const project = (event: { clientX: number; clientY: number }) => {
    const rect = gl.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), camera);
    return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  };
  const nearest = (point: THREE.Vector3, held: Held) => {
    let best: { target: Target; distance: number } | null = null;
    for (const target of validTargets(latest.current.state, held)) {
      const at = targetPoint(latest.current.state, target);
      if (!at) continue;
      const distance = Math.hypot(at.x - point.x, at.z - point.z);
      if (distance < SNAP_RADIUS && (!best || distance < best.distance)) best = { target, distance };
    }
    return best?.target ?? null;
  };
  const track = (event: { clientX: number; clientY: number }, held: Held | null) => {
    const point = project(event);
    if (!point) return;
    cursor.current = point;
    const next = held ? nearest(point, held) : null;
    if (targetKey(next) !== targetKey(snap.current)) { snap.current = next; setHoverSnap(next); }
  };
  const trackRef = useRef(track);
  trackRef.current = track;

  const holding = Boolean(carriedHeld);
  useEffect(() => {
    if (!holding) { cursor.current = null; snap.current = null; setHoverSnap(null); document.body.style.cursor = "auto"; return; }
    document.body.style.cursor = "grabbing";
    const move = (event: PointerEvent) => trackRef.current(event, latest.current.held);
    gl.domElement.addEventListener("pointermove", move);
    return () => { gl.domElement.removeEventListener("pointermove", move); document.body.style.cursor = "auto"; };
  }, [gl, holding]);

  /** Starts a gesture on an item: drag to drop, or click (two-step) when the pointer barely moves. */
  const begin = (source: Grab, onClick: () => void) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const down = event.nativeEvent;
    let moved = false;
    if (controls) controls.enabled = false; // moving an item must never turn the camera
    const move = (next: PointerEvent) => {
      if (next.pointerId !== down.pointerId) return;
      if (!moved && Math.hypot(next.clientX - down.clientX, next.clientY - down.clientY) < CLICK_SLOP) return;
      if (!moved) setDrag(source);
      moved = true;
      track(next, source.held);
    };
    const up = (next: PointerEvent) => {
      if (next.pointerId !== down.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (controls) controls.enabled = true;
      const dropOn = snap.current;
      setDrag(null);
      if (!moved) { if (next.type === "pointerup") onClick(); return; }
      if (next.type === "pointerup" && dropOn) {
        dispatch({ type: "hold", held: source.held });
        dispatch({ type: "apply", target: dropOn, now: Date.now(), release: true });
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const hover = (id: string) => ({
    onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onHover(id); if (!latest.current.held) document.body.style.cursor = "grab"; },
    onPointerOut: () => { onHover(null); if (!latest.current.held) document.body.style.cursor = "auto"; },
  });
  const isHeld = (held: Held) => !!carriedHeld && JSON.stringify(carriedHeld) === JSON.stringify(held);
  const ringFor = (target: Target): "valid" | "active" | null => {
    if (!targets.some((t) => targetKey(t) === targetKey(target))) return null;
    return targetKey(hoverSnap) === targetKey(target) ? "active" : "valid";
  };

  // Where carried things go: over the pointer, or magnetically above the snapped mouth.
  const carryAt = (snapLift: number, freeLift: number, tilt: number) => (): Carry | null => {
    const point = cursor.current;
    if (!point) return null;
    const target = snap.current;
    const current = latest.current.state;
    if (target?.kind === "vessel") {
      const at = targetPoint(current, target);
      const kind = current.current.bench.vessels[target.vesselId]?.kind;
      if (at && kind) return { pos: new THREE.Vector3(at.x, at.y + VESSEL_RENDERERS[kind].mouthY + snapLift, at.z), tilt };
    }
    if (target?.kind === "bottle") {
      const at = targetPoint(current, target);
      if (at) return { pos: new THREE.Vector3(at.x, at.y + BOTTLE_TOP + snapLift, at.z), tilt };
    }
    return { pos: new THREE.Vector3(point.x, BENCH_TOP_Y + freeLift, point.z), tilt: 0 };
  };
  const carryVessel = (): Carry | null => {
    const point = cursor.current;
    if (!point) return null;
    const target = snap.current;
    const current = latest.current.state;
    if (target?.kind === "vessel") {
      const at = targetPoint(current, target);
      const kind = current.current.bench.vessels[target.vesselId]?.kind;
      if (at && kind) return { pos: new THREE.Vector3(at.x + 0.2, at.y + VESSEL_RENDERERS[kind].mouthY + 0.06, at.z), tilt: 0.7 };
    }
    if (target?.kind === "slot") {
      const at = targetPoint(current, target);
      if (at) return { pos: new THREE.Vector3(at.x, at.y + 0.05, at.z), tilt: 0 };
    }
    return { pos: new THREE.Vector3(point.x, BENCH_TOP_Y + 0.12, point.z), tilt: 0 };
  };
  const dropperTarget = useMemo(() => carryAt(0.075, 0.2, -0.28), []);
  const penTarget = useMemo(() => carryAt(0.16, 0.2, 0), []);
  const stripTarget = useMemo(() => (): Carry | null => {
    const point = cursor.current;
    if (!point) return null;
    const target = snap.current;
    const current = latest.current.state;
    if (target?.kind === "vessel") {
      const at = targetPoint(current, target);
      const vessel = current.current.bench.vessels[target.vesselId];
      if (at && vessel) {
        // The lower end touches the liquid surface, so the strip is never longer than the glass is tall.
        const { floorY, innerHeight } = VESSEL_RENDERERS[vessel.kind];
        const surface = floorY + visualFill(vessel.solutionMicroliters / vessel.capacityMicroliters) * innerHeight;
        return { pos: new THREE.Vector3(at.x, at.y + surface, at.z), tilt: -0.1 };
      }
    }
    return { pos: new THREE.Vector3(point.x, BENCH_TOP_Y + 0.18, point.z), tilt: 0 };
  }, []);
  const tongsTarget = useMemo(() => carryAt(0.09, 0.2, -0.2), []);
  const stopperTarget = useMemo(() => carryAt(0.05, 0.14, 0), []);
  const spatulaTarget = useMemo(() => carryAt(0.09, 0.2, -0.3), []);
  const pourTarget = useMemo(() => carryAt(0.3, 0.32, 0.9), []);
  const rodTarget = useMemo(() => carryAt(0.06, 0.2, 0.2), []);

  const restOf = (kind: string) => {
    const item = config.enabledApparatus.find((entry) => entry.kind === kind);
    const slot = item && slotById(state.current.positions[item.id] ?? item.slot);
    return slot ? { id: item!.id, home: [slot.x, slot.y ?? BENCH_TOP_Y, slot.z] as [number, number, number] } : null;
  };
  const hidden = new Set<string>();
  let carriedNode: ReactNode = null;
  if (carriedHeld?.kind === "reagent") {
    const reagent = reagentById(carriedHeld.reagentId);
    const bottle = config.availableReagents.find((item) => item.reagentId === carriedHeld.reagentId);
    if (reagent && bottle) {
      const at = shelfPosition(bottle.shelfPosition);
      if (reagent.dispenser === "tongs") {
        const rest = restOf("tongs");
        if (rest) hidden.add(rest.id);
        const composition = reagent.composition;
        const piece = composition.kind === "solid" ? { color: SPECIES[composition.species].solidColor, shape: composition.shape } : { color: null, shape: null };
        carriedNode = <FollowGroup home={rest?.home ?? [at.x, BENCH_TOP_Y + 0.35, at.z]} active getTarget={tongsTarget} scale={1.5}>
          <TongsHolding piece={piece.color} shape={piece.shape} />
          <Html position={[0, 0.24, 0]} center style={{ pointerEvents: "none" }}><span className="k2-drag-tag">{shortReagent(reagent.id)}</span></Html>
        </FollowGroup>;
      } else if (reagent.dispenser === "pour") {
        carriedNode = <FollowGroup home={[at.x, BENCH_TOP_Y + 0.03, at.z]} active getTarget={pourTarget} scale={0.9}>
          <ReagentBottle3D look={reagentLook(reagent)} solid={false} category={bottleCategory(reagent)} />
          <Html position={[0, 0.42, 0]} center style={{ pointerEvents: "none" }}><span className="k2-drag-tag">{shortReagent(reagent.id)} · {(state.presetMicroliters / 1000).toFixed(1).replace(".", ",")} mL</span></Html>
        </FollowGroup>;
      } else if (reagent.dispenser === "spatula") {
        const rest = restOf("spatula");
        if (rest) hidden.add(rest.id);
        const powderColor = reagent.composition.kind === "powder" ? (reagent.bottleColor) : null;
        carriedNode = <FollowGroup home={rest?.home ?? [at.x, BENCH_TOP_Y + 0.35, at.z]} active getTarget={spatulaTarget} scale={1.5}>
          <SpatulaHolding powder={powderColor} />
          <Html position={[0, 0.3, 0]} center style={{ pointerEvents: "none" }}><span className="k2-drag-tag">{shortReagent(reagent.id)} · {(state.powderMilligrams / 1000).toFixed(3).replace(".", ",")} g</span></Html>
        </FollowGroup>;
      } else {
        const rest = restOf("dropper_pipette");
        if (rest) hidden.add(rest.id);
        carriedNode = <FollowGroup home={rest?.home ?? [at.x, BENCH_TOP_Y + 0.35, at.z]} active getTarget={dropperTarget} scale={1.6}>
          <DropperUpright liquid={reagentLook(reagent)} squeezeAt={state.drip?.at ?? null} fill={state.loadedMicroliters / DROPPER_CAPACITY_MICROLITERS} />
          <Html position={[0, 0.27, 0]} center style={{ pointerEvents: "none" }}><span className="k2-drag-tag">{shortReagent(reagent.id)} · {(state.loadedMicroliters / 1000).toFixed(2).replace(".", ",")} / 1,00 mL</span></Html>
        </FollowGroup>;
      }
    }
  } else if (carriedHeld?.kind === "tool") {
    const rest = config.enabledApparatus.find((item) => item.id === carriedHeld.apparatusId);
    const slot = rest && slotById(state.current.positions[rest.id] ?? rest.slot);
    const home: [number, number, number] = slot ? [slot.x, slot.y ?? BENCH_TOP_Y, slot.z] : [0, BENCH_TOP_Y, 0.8];
    const carriedTool = carriedHeld.tool;
    if (carriedTool !== "litmus_paper" && rest) hidden.add(rest.id);
    if (carriedTool === "ph_meter") for (const item of config.enabledApparatus) if (item.kind === "digital_ph_meter") hidden.add(item.id);
    const heldRenderer = HELD_TOOL_RENDERERS[carriedTool];
    const toolTargets = { dropper: dropperTarget, ph_meter: penTarget, litmus_paper: stripTarget, tongs: tongsTarget, stopper: stopperTarget, spatula: spatulaTarget, glass_rod: rodTarget };
    carriedNode = <FollowGroup home={home} active scale={heldRenderer.scale} getTarget={toolTargets[carriedTool]}>
      <heldRenderer.Body stripColour={state.stripColour} />
    </FollowGroup>;
  }
  const penHeld = carriedHeld?.kind === "tool" && carriedHeld.tool === "ph_meter";
  const penApparatusId = config.enabledApparatus.find((entry) => entry.kind === "digital_ph_meter")?.id ?? "";

  const scaleText = formatGrams(scaleDisplayMicrograms(state));
  const probeReading = (() => {
    if (!state.current.probeIn) return "—";
    const reading = measure(bench.vessels[state.current.probeIn], "ph_meter");
    return reading.ok && reading.kind === "ph_meter" ? formatPh(reading.tenthsPh) : "—";
  })();
  const showTooltip = (id: string) => hovered === id && !holding;

  const items: ReactNode[] = [];

  // Reagent shelf tray along the back of the bench.
  items.push(<mesh key="shelf" position={[shelfPosition(1).x + (config.availableReagents.length - 1) * 0.18, BENCH_TOP_Y + 0.015, shelfPosition(1).z]} receiveShadow>
    <boxGeometry args={[config.availableReagents.length * 0.36 + 0.1, 0.03, 0.34]} /><meshStandardMaterial color="#8c6a48" roughness={0.7} />
  </mesh>);
  for (const bottle of config.availableReagents) {
    const reagent = reagentById(bottle.reagentId);
    if (!reagent) continue;
    const at = shelfPosition(bottle.shelfPosition);
    const held: Held = { kind: "reagent", reagentId: reagent.id };
    const id = `reagent:${reagent.id}`;
    const ring = ringFor({ kind: "bottle", reagentId: reagent.id });
    const category = bottleCategory(reagent);
    items.push(<group key={id} position={[at.x, BENCH_TOP_Y + 0.03, at.z]} onPointerDown={begin({ held, label: shortReagent(reagent.id) }, () => dispatch({ type: "click_bottle", reagentId: reagent.id, now: Date.now() }))} {...hover(id)}>
      <ReagentBottle3D look={reagentLook(reagent)} solid={reagent.composition.kind === "solid" || reagent.composition.kind === "powder"} category={category} />
      {(isHeld(held) || ring) && <TargetRing radius={0.12} tone={ring ?? "held"} />}
      <Html position={[0, bottle.shelfPosition % 2 ? 0.4 : 0.52, 0]} center zIndexRange={[12, 10]} style={{ pointerEvents: "none" }}><span className={`k2-bottle-tag is-${category}`}>{bottleTag(reagent.id)}</span></Html>
      {showTooltip(id) && <Tooltip y={0.64} title={reagent.labelVi} detail={reagent.safetyNoteSim} />}
    </group>);
  }

  for (const item of config.enabledApparatus) {
    const slot = slotById(state.current.positions[item.id] ?? item.slot);
    if (!slot) continue;
    const home: [number, number, number] = [slot.x, slot.y ?? BENCH_TOP_Y, slot.z];
    const def = K2_APPARATUS[item.kind];
    const id = `apparatus:${item.id}`;
    const label = apparatusLabel(config, item.id);
    if (isVesselKind(item.kind)) {
      const vessel = bench.vessels[item.id];
      if (!vessel) continue;
      const visual = observeVessel(vessel, state.flashes[item.id]?.transition ?? null).visual;
      const look = vesselLook(vessel, visual);
      const flashAt = state.flashes[item.id]?.at ?? null;
      const target: Target = { kind: "vessel", vesselId: item.id };
      const ring = ringFor(target);
      const heldVessel = isHeld({ kind: "vessel", vesselId: item.id });
      const warning = state.banner?.vesselId === item.id;
      const renderer = VESSEL_RENDERERS[item.kind];
      const drip = state.drip?.vesselId === item.id ? state.drip : null;
      const dripReagent = drip ? reagentById(drip.reagentId) : null;
      const penHere = state.current.probeIn === item.id && !penHeld;
      const penHold: Held = { kind: "tool", tool: "ph_meter", apparatusId: penApparatusId };
      items.push(<FollowGroup key={id} home={home} active={heldVessel} getTarget={carryVessel}>
        <group onPointerDown={begin({ held: { kind: "vessel", vesselId: item.id }, label }, () => dispatch({ type: "click_vessel", vesselId: item.id, now: Date.now() }))} {...hover(id)}>
          <renderer.Body visual={visual} look={look} flashAt={flashAt} strip={state.current.strips[item.id]} wasteMicroliters={state.current.wasteMicroliters} />
          {(warning || heldVessel || ring || state.focusVesselId === item.id) && <TargetRing radius={renderer.ringRadius} tone={warning ? "warning" : heldVessel ? "held" : ring ?? "focus"} />}
          <Html position={[0, renderer.tagY, 0]} center zIndexRange={[12, 10]} style={{ pointerEvents: "none" }}><span className={`k2-vessel-tag${warning ? " is-warning" : ""}`}>{label}</span></Html>
          {showTooltip(id) && <Tooltip y={renderer.tooltipY} title={label} detail={def.purposeVi} />}
        </group>
        {state.current.strips[item.id] && <Html position={[0, renderer.tagY + 0.08, 0]} center zIndexRange={[12, 10]} style={{ pointerEvents: "none" }}>
          <span className="k2-strip-chip" title={`Kết quả giấy quỳ trên ${label}`}><i style={{ background: LITMUS_HEX[state.current.strips[item.id]!] }} aria-hidden="true" />Quỳ: {QUY_NAME[state.current.strips[item.id]!]}</span>
        </Html>}
        {drip && dripReagent && <Droplet key={drip.at} at={drip.at} color={reagentLook(dripReagent).color} fromY={renderer.mouthY + 0.07} toY={renderer.floorY + visualFill(visual.liquidLevel) * renderer.innerHeight} />}
        {penHere && <group position={[0.02, renderer.probeY, 0]} rotation={[0, 0, -0.06]}
          onPointerDown={begin({ held: penHold, label: "Bút đo pH" }, () => dispatch({ type: "hold", held: penHold }))}
          {...hover(`pen:${item.id}`)}>
          <PhMeter3D inserted />
          <Collider size={[0.1, 0.36, 0.08]} y={0.14} />
          <Html position={[0, 0.34, 0]} center style={{ pointerEvents: "none" }}><span className="k2-lcd">pH {probeReading}</span></Html>
        </group>}
      </FollowGroup>);
      continue;
    }
    if (hidden.has(item.id)) continue;
    const tool = def.tool;
    const held: Held | null = tool ? { kind: "tool", tool, apparatusId: item.id } : null;
    const onClick = () => { if (held) dispatch({ type: "hold", held: isHeld(held) ? null : held }); };
    if (item.kind === "digital_ph_meter" && (state.current.probeIn || penHeld)) continue;
    const renderer = FIXTURE_RENDERERS[item.kind];
    items.push(<group key={id} position={home} {...(held ? { onPointerDown: begin({ held, label }, onClick) } : { onPointerDown: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); } })} {...hover(id)}>
      <renderer.Body scaleReading={scaleText} />
      {held && isHeld(held) && <TargetRing radius={0.12} tone="held" />}
      {showTooltip(id) && <Tooltip y={renderer.tooltipY} title={label} detail={def.purposeVi} />}
    </group>);
  }

  // Empty placement slots for a carried beaker or flask.
  for (const target of targets.filter((t): t is Extract<Target, { kind: "slot" }> => t.kind === "slot")) {
    const slot = slotById(target.slotId)!;
    items.push(<group key={`slot:${slot.id}`} position={[slot.x, slot.y ?? BENCH_TOP_Y, slot.z]} onPointerDown={(event) => { event.stopPropagation(); dispatch({ type: "click_slot", slotId: slot.id, now: Date.now() }); }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}><circleGeometry args={[0.16, 32]} /><meshBasicMaterial color="#0d9488" transparent opacity={0.14} depthWrite={false} /></mesh>
      <TargetRing radius={0.16} tone={ringFor(target) ?? "valid"} />
    </group>);
  }

  return <group>
    {items}
    {carriedNode}
  </group>;
}
