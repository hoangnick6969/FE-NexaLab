/**
 * Shared digital scale: body, weighing pan and a display.
 * The bench computes the reading with its own engine and unit, formats it and passes the text.
 */
import { Html } from "@react-three/drei";
import { SHARED_ITEM_META } from "./catalog";
import type { LabItemAnchor, SharedLabItem } from "./item";
import "./items.css";

/** `pan` is where a load rests; `display` is the centre of the readout. */
export const DIGITAL_SCALE_ANCHORS = { base: [0, 0, 0], pan: [0, 0.1, -0.04], display: [0, 0.06, 0.27] } as const satisfies Record<string, LabItemAnchor>;

export type DigitalScaleProps = {
  /** Formatted reading with its unit, for example "120,00 g". Omit for a blank display. */
  reading?: string;
};

export function DigitalScale3D({ reading }: DigitalScaleProps) {
  return <group>
    <mesh position={[0, 0.04, 0]} castShadow receiveShadow><boxGeometry args={[0.78, 0.08, 0.5]} /><meshStandardMaterial color="#e2e8f0" roughness={0.5} /></mesh>
    <mesh position={[0, 0.09, -0.04]}><boxGeometry args={[0.72, 0.012, 0.36]} /><meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} /></mesh>
    <mesh position={[0, 0.05, 0.252]}><planeGeometry args={[0.3, 0.05]} /><meshStandardMaterial color="#bcd9a8" emissive="#5f8c4c" emissiveIntensity={0.3} /></mesh>
    {reading !== undefined && <Html position={[...DIGITAL_SCALE_ANCHORS.display]} center zIndexRange={[12, 10]} style={{ pointerEvents: "none" }}>
      <span className="lab-item-lcd">{reading}</span>
    </Html>}
  </group>;
}

export const digitalScaleItem: SharedLabItem<DigitalScaleProps> = { ...SHARED_ITEM_META["digital-scale"], Component3D: DigitalScale3D, anchors: DIGITAL_SCALE_ANCHORS };
