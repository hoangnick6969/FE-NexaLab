/**
 * Shared thermometer: a glass stem with a bulb at the bottom, a liquid column and a scale plate with evenly spaced marks.
 * Stands upright with the bulb at the origin; the bench positions it so the bulb is where it measures (dipped in a liquid).
 * The bench computes the temperature, maps it to `fill` (0–1 of the scale) and formats the optional readout.
 * The scale range and its numbers belong to the bench; this item does not know any units.
 */
import { Html } from "@react-three/drei";
import type { ReactNode } from "react";
import { SHARED_ITEM_META } from "./catalog";
import type { SharedLabItem } from "./item";
import { THERMOMETER_DEFAULT_DIVISIONS, THERMOMETER_DEFAULT_LENGTH, thermometerAnchors, thermometerScaleHeight } from "./item-layout";
import "./items.css";

export { THERMOMETER_DEFAULT_LENGTH, thermometerAnchors, thermometerScaleHeight };

const STEM_RADIUS = 0.011;
const BULB_RADIUS = 0.02;
const LIQUID = "#dc2626";

export type ThermometerProps = {
  /** Total length of the stem; default 0.6. */
  length?: number;
  /** 0–1 of the scale, already mapped by the bench from its own temperature and range. */
  fill: number;
  /** Formatted reading with its unit, for example "25,0 °C". Omit for no readout. */
  reading?: string;
  /** Number of equal scale intervals. Default 10. */
  divisions?: number;
  children?: ReactNode;
};

export function Thermometer3D({ length = THERMOMETER_DEFAULT_LENGTH, fill, reading, divisions = THERMOMETER_DEFAULT_DIVISIONS, children }: ThermometerProps) {
  const scale = thermometerScaleHeight(length);
  const level = Math.min(1, Math.max(0, fill));
  const marks = Array.from({ length: Math.max(0, Math.floor(divisions)) + 1 }, (_, index) => (scale * index) / Math.max(1, Math.floor(divisions)));
  return <group>
    <mesh position={[0, length / 2, 0]}><cylinderGeometry args={[STEM_RADIUS, STEM_RADIUS, length, 16, 1, true]} /><meshPhysicalMaterial color="#e0f2fe" transparent opacity={0.4} roughness={0.1} depthWrite={false} /></mesh>
    <mesh position={[0, length, 0]}><sphereGeometry args={[STEM_RADIUS, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#e0f2fe" transparent opacity={0.4} roughness={0.1} depthWrite={false} /></mesh>
    <mesh><sphereGeometry args={[BULB_RADIUS, 16, 12]} /><meshStandardMaterial color={LIQUID} roughness={0.3} /></mesh>
    {/* Column grows upwards from the bulb: a unit cylinder, its base at the group origin, stretched along y. */}
    <group scale-y={Math.max(level * scale, 0.001)}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[STEM_RADIUS * 0.45, STEM_RADIUS * 0.45, 1, 10]} /><meshStandardMaterial color={LIQUID} roughness={0.3} /></mesh>
    </group>
    <mesh position={[0, length / 2, -STEM_RADIUS - 0.006]}><boxGeometry args={[0.04, length, 0.004]} /><meshStandardMaterial color="#f8fafc" roughness={0.6} /></mesh>
    {marks.map((y, index) => <mesh key={index} position={[0.012, y, -STEM_RADIUS - 0.003]}><boxGeometry args={[index % 5 === 0 ? 0.022 : 0.012, 0.0015, 0.002]} /><meshStandardMaterial color="#334155" /></mesh>)}
    {reading !== undefined && <Html position={[...thermometerAnchors(length).display]} center zIndexRange={[12, 10]} style={{ pointerEvents: "none" }}>
      <span className="lab-item-lcd">{reading}</span>
    </Html>}
    {children}
  </group>;
}

export const thermometerItem: SharedLabItem<ThermometerProps> = { ...SHARED_ITEM_META.thermometer, Component3D: Thermometer3D, anchors: thermometerAnchors() };
