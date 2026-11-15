/**
 * Shared beaker: an open glass cup with graduation marks and an optional liquid column.
 * The bench passes the size, how full it is and how the liquid looks. What the liquid is, its volume
 * and anything inside it (solids, precipitate, bubbles, probes) stay with the bench, as `children`.
 */
import type { ReactNode } from "react";
import { SHARED_ITEM_META } from "./catalog";
import { GLASS, LiquidColumn, type LiquidLook } from "./glass";
import type { LabItemAnchor, SharedLabItem } from "./item";

export type BeakerSize = { radius: number; height: number };
export const BEAKER_DEFAULT_SIZE: BeakerSize = { radius: 0.15, height: 0.3 };

const FLOOR = 0.02;
const RIM_CLEARANCE = 0.03;
const GRADUATIONS = [0.25, 0.5, 0.75] as const;

/** Height of the liquid column when the beaker is drawn full. */
export const beakerInnerHeight = (size: BeakerSize = BEAKER_DEFAULT_SIZE) => size.height - RIM_CLEARANCE;

/** Anchor points in the local frame of a beaker of the given size. */
export function beakerAnchors(size: BeakerSize = BEAKER_DEFAULT_SIZE): { base: LabItemAnchor; inside: LabItemAnchor; mouth: LabItemAnchor } {
  return { base: [0, 0, 0], inside: [0, FLOOR, 0], mouth: [0, size.height, 0] };
}

export type BeakerProps = Partial<BeakerSize> & {
  /** 0–1 of the inner height, already mapped by the bench (benches may clamp or ease small volumes). */
  fill: number;
  /** Liquid appearance; not drawn while `fill` is 0. */
  liquid: LiquidLook;
  /** Graduation marks as fractions of the height. */
  graduations?: readonly number[];
  children?: ReactNode;
};

export function Beaker3D({ radius = BEAKER_DEFAULT_SIZE.radius, height = BEAKER_DEFAULT_SIZE.height, fill, liquid, graduations = GRADUATIONS, children }: BeakerProps) {
  return <group>
    <mesh position={[0, height / 2, 0]}><cylinderGeometry args={[radius, radius * 0.94, height, 36, 1, true]} /><meshPhysicalMaterial {...GLASS} /></mesh>
    <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[radius * 0.94, radius * 0.94, FLOOR, 36]} /><meshPhysicalMaterial {...GLASS} opacity={0.5} /></mesh>
    <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, 0.008, 8, 36]} /><meshStandardMaterial color="#bae6fd" roughness={0.2} transparent opacity={0.85} /></mesh>
    {graduations.map((fraction) => <mesh key={fraction} position={[radius * 0.7, height * fraction, radius * 0.72]}><boxGeometry args={[0.05, 0.004, 0.002]} /><meshStandardMaterial color="#475569" /></mesh>)}
    <LiquidColumn fullHeight={height - RIM_CLEARANCE} y0={FLOOR} rBottom={radius * 0.88} rTop={radius * 0.9} fill={fill} look={liquid} />
    {children}
  </group>;
}

export const beakerItem: SharedLabItem<BeakerProps> = { ...SHARED_ITEM_META.beaker, Component3D: Beaker3D, anchors: beakerAnchors() };
