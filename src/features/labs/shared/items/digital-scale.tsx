/**
 * Shared digital scale: body, weighing pan and a display.
 * The bench computes the reading with its own engine and unit, formats it and passes the text.
 * What rests on the pan (a beaker, a specimen) is the bench's, passed as `children` and drawn at the `pan` anchor.
 * Motion stays with the bench too: it may move the pan (with its load) through `panRef`, and says when the reading is stable.
 */
import { Html } from "@react-three/drei";
import type { ReactNode, Ref } from "react";
import type { Group } from "three";
import { SHARED_ITEM_META } from "./catalog";
import type { LabItemAnchor, SharedLabItem } from "./item";
import "./items.css";

/** `pan` is where a load rests; `display` is the centre of the readout. */
export const DIGITAL_SCALE_ANCHORS = { base: [0, 0, 0], pan: [0, 0.1, -0.04], display: [0, 0.06, 0.27] } as const satisfies Record<string, LabItemAnchor>;

export type DigitalScaleProps = {
  /** Formatted reading with its unit, for example "120,00 g". Omit for a blank display. */
  reading?: string;
  /** Load on the pan, in the item's local frame with y = 0 on the pan surface. */
  children?: ReactNode;
  /** Shows a tare key on the front; the bench decides what taring means for its reading. */
  onTare?: () => void;
  /** The pan and its load. The bench may offset `position.y` (item units) to show the pan dipping under load. */
  panRef?: Ref<Group>;
  /** Shows the stable mark beside the reading, as on a real balance once it settles. */
  stable?: boolean;
};

export function DigitalScale3D({ reading, children, onTare, panRef, stable }: DigitalScaleProps) {
  return <group>
    <mesh position={[0, 0.04, 0]} castShadow receiveShadow><boxGeometry args={[0.78, 0.08, 0.5]} /><meshStandardMaterial color="#e2e8f0" roughness={0.5} /></mesh>
    <group name="digital-scale-pan" ref={panRef}>
      <mesh position={[0, 0.09, -0.04]}><boxGeometry args={[0.72, 0.012, 0.36]} /><meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} /></mesh>
      {children !== undefined && <group position={[DIGITAL_SCALE_ANCHORS.pan[0], 0.096, DIGITAL_SCALE_ANCHORS.pan[2]]}>{children}</group>}
    </group>
    <mesh position={[0, 0.05, 0.252]}><planeGeometry args={[0.3, 0.05]} /><meshStandardMaterial color="#bcd9a8" emissive="#5f8c4c" emissiveIntensity={0.3} /></mesh>
    {onTare && <mesh name="digital-scale-tare" position={[0.25, 0.05, 0.252]} rotation={[Math.PI / 2, 0, 0]} onClick={(event) => { event.stopPropagation(); onTare(); }}>
      <cylinderGeometry args={[0.025, 0.025, 0.01, 20]} /><meshStandardMaterial color="#cfd6d2" roughness={0.35} />
    </mesh>}
    {reading !== undefined && <Html position={[...DIGITAL_SCALE_ANCHORS.display]} center zIndexRange={[12, 10]} style={{ pointerEvents: "none" }}>
      <span className={stable ? "lab-item-lcd lab-item-lcd--stable" : "lab-item-lcd"}>{reading}</span>
    </Html>}
  </group>;
}

export const digitalScaleItem: SharedLabItem<DigitalScaleProps> = { ...SHARED_ITEM_META["digital-scale"], Component3D: DigitalScale3D, anchors: DIGITAL_SCALE_ANCHORS };
