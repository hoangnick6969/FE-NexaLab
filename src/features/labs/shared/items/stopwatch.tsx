/**
 * Shared stopwatch: a round digital timer lying on the bench, with a display and a start button.
 * The bench owns the clock (simulated time from its engine, never the browser clock), formats the text and says whether it runs.
 * Pressing the button is the bench's interaction: it passes a click area as `children` or handles the pointer itself.
 */
import { Html } from "@react-three/drei";
import type { ReactNode } from "react";
import { SHARED_ITEM_META } from "./catalog";
import type { SharedLabItem } from "./item";
import { STOPWATCH_ANCHORS } from "./item-layout";
import "./items.css";

export { STOPWATCH_ANCHORS };

export type StopwatchProps = {
  /** Formatted time with its unit, for example "01:23,4" or "83,4 s". Omit for a blank display. */
  reading?: string;
  /** Whether the bench's clock is running; lights the indicator. */
  running?: boolean;
  children?: ReactNode;
};

export function Stopwatch3D({ reading, running = false, children }: StopwatchProps) {
  return <group>
    <mesh position={[0, 0.02, 0]} castShadow receiveShadow><cylinderGeometry args={[0.1, 0.1, 0.04, 40]} /><meshStandardMaterial color="#334155" roughness={0.5} /></mesh>
    <mesh position={[0, 0.0405, 0.01]}><cylinderGeometry args={[0.082, 0.082, 0.002, 40]} /><meshStandardMaterial color="#bcd9a8" emissive="#5f8c4c" emissiveIntensity={0.25} /></mesh>
    <mesh position={[0, 0.045, -0.075]}><cylinderGeometry args={[0.014, 0.014, 0.01, 16]} /><meshStandardMaterial color="#ef4444" roughness={0.4} /></mesh>
    <mesh position={[0, 0.043, 0.085]}><sphereGeometry args={[0.005, 10, 8]} /><meshStandardMaterial color={running ? "#22c55e" : "#64748b"} emissive={running ? "#16a34a" : "#000000"} emissiveIntensity={running ? 0.8 : 0} /></mesh>
    {reading !== undefined && <Html position={[...STOPWATCH_ANCHORS.display]} center zIndexRange={[12, 10]} style={{ pointerEvents: "none" }}>
      <span className="lab-item-lcd">{reading}</span>
    </Html>}
    {children}
  </group>;
}

export const stopwatchItem: SharedLabItem<StopwatchProps> = { ...SHARED_ITEM_META.stopwatch, Component3D: Stopwatch3D, anchors: STOPWATCH_ANCHORS };
