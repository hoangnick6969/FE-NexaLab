import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PhysicsStage, type BenchViewPreset } from "../../shared/PhysicsStage";
import { Wire } from "../CircuitBulb3DStage";
import { EmAnimContext, LAYOUT, type EmAnim } from "./apparatus/anim";
import { BarMagnet3D } from "./apparatus/BarMagnet3D";
import { Coil3D } from "./apparatus/Coil3D";
import { Galvanometer3D, Generator3D, LedPair3D } from "./apparatus/Meters3D";
import { currentLevel, drawnRotorAngle, magnetTravel, type EmCue } from "./choreography";
import type { EmObservation } from "./em-evidence";
import type { EmManual, EmManualState } from "./manual";

const VIEW: BenchViewPreset = {
  wide: { position: [.3, 2.35, 4.2], target: [.1, .3, 0] },
  narrow: { position: [.35, 4.1, 7.4], target: [0, -.35, 0] },
  minDistance: 2.2,
  maxDistance: 13,
  // Magnet at rest to the LED board, with a little air on each side.
  fitWidth: 4.4,
  // The question panel covers the right side on wide screens and the lower part on phones.
  // Panel width mirrors --em-panel-w in EmInductionActivity.css.
  insets: ({ width, height }) => width <= 720
    ? { right: 0, bottom: Math.round(height * .42 + 130), top: 120 }
    : { right: Math.min(380, Math.max(300, width * .34)) + 36, bottom: 130, top: 110 },
};

/** World position of a point given in an apparatus' local frame (rotation about y only). */
function place(base: [number, number, number], rotationY: number, local: [number, number, number]): [number, number, number] {
  const point = new THREE.Vector3(...local).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
  return [base[0] + point.x, base[1] + point.y, base[2] + point.z];
}
const G = LAYOUT.galvanometer, L = LAYOUT.leds;
const galvanometerPost = (x: number) => place(G.position, G.rotationY, [x, .46 + .07, .04]);
const ledPost = (x: number) => place(L.position, L.rotationY, [x, .1, .09]);
// Constant endpoints: Wire rebuilds its tube whenever an endpoint array changes identity.
const WIRES = [
  { start: [-.15, .15, .36] as [number, number, number], end: galvanometerPost(-.18), color: "#25292c", sag: .12 },
  { start: galvanometerPost(.18), end: ledPost(.18), color: "#b72d24", sag: .1 },
  { start: ledPost(-.18), end: [.15, .15, .36] as [number, number, number], color: "#25292c", sag: .08 },
];
// Open circuit (free explore): the return lead is unplugged from the coil terminal and lies on the bench.
const OPEN_LEAD = { ...WIRES[2], end: [.42, .06, .66] as [number, number, number], sag: .02 };

/** Writes presentation values once per frame; apparatus read them through refs. */
function Driver({ anim, cue, observation, restTravel, reduced, manual }: { anim: React.MutableRefObject<EmAnim>; cue: EmCue & { startedAt: number }; observation: EmObservation | null; restTravel: number; reduced: boolean; manual?: React.MutableRefObject<EmManualState> }) {
  useFrame(() => {
    const current = anim.current;
    current.reduced = reduced;
    // A drag by the student (and its settling) draws its own values; otherwise the cue choreography runs.
    const hand = manual?.current;
    if (!cue.action && hand?.active) {
      current.travel = hand.travel;
      current.rotor = hand.rotor;
      current.level = hand.level;
      return;
    }
    const ms = cue.action ? performance.now() - cue.startedAt : Number.POSITIVE_INFINITY;
    current.travel = magnetTravel(cue.action, ms, reduced) ?? restTravel;
    current.rotor = cue.action ? drawnRotorAngle(cue, ms, reduced) : hand?.rotor ?? 0;
    current.level = currentLevel(cue.action, ms, observation, reduced);
  });
  return null;
}

export function EmInduction3DStage({ cue, observation, restTravel, reduced, showField, pole, circuit, activeTarget, onActivate, viewResetSignal, manual }: {
  cue: EmCue & { startedAt: number };
  observation: EmObservation | null;
  restTravel: number;
  reduced: boolean;
  showField: boolean;
  pole: "N" | "S";
  circuit: "CLOSED" | "OPEN";
  activeTarget: "magnet" | "generator" | null;
  onActivate: () => void;
  viewResetSignal: number;
  manual?: EmManual;
}) {
  const anim = useRef<EmAnim>({ level: 0, travel: restTravel, rotor: 0, reduced });
  return <PhysicsStage view={VIEW} reflections viewResetSignal={viewResetSignal}>
    <EmAnimContext.Provider value={anim}>
      <Driver anim={anim} cue={cue} observation={observation} restTravel={restTravel} reduced={reduced} manual={manual?.state} />
      <Coil3D />
      <BarMagnet3D showField={showField} pole={pole} actionable={activeTarget === "magnet"} onActivate={onActivate} manual={manual} />
      <Generator3D actionable={activeTarget === "generator"} onActivate={onActivate} manual={manual} />
      <Galvanometer3D />
      <LedPair3D />
      {/* Series loop: coil → galvanometer → LED pair → coil */}
      {WIRES.map((wire, index) => <Wire key={index} {...(index === 2 && circuit === "OPEN" ? OPEN_LEAD : wire)} />)}
    </EmAnimContext.Provider>
  </PhysicsStage>;
}
export default EmInduction3DStage;
