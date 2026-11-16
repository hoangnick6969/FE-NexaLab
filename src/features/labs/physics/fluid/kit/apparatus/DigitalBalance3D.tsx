import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { DIGITAL_SCALE_ANCHORS, DigitalScale3D } from "../../../../shared/items/digital-scale";
import type { K3Instruments } from "../k3-config";
import { balanceSettleSequence, formatReading } from "../k3-geometry";
import { K3_MOTION, usePrefersReducedMotion, type BalanceSample } from "../k3-motion";

/** The shared scale is modelled in item units; the fluid bench works in mm (body ≈ 180 mm wide). */
const SCALE_MM = 230;
/** Pan surface height above the bench, in mm. */
export const BALANCE_PAN_TOP_MM = 0.096 * SCALE_MM;
/** Pan centre offset from the balance origin along z, in mm (a load placed in bench coordinates sits here). */
export const BALANCE_PAN_Z_MM = DIGITAL_SCALE_ANCHORS.pan[2] * SCALE_MM;
const MAX_DIP_MM = 1.2;

/**
 * FL-03 electronic balance on the shared digital scale (D1-2.3).
 * `readingG` is the model's reading (null = nothing weighed yet); the display
 * shows dashes, runs through a short settle sequence and stops on exactly
 * that value. With `liveReading` (pouring) it follows the sample instead.
 * The pan dips with load on a damped spring. Children are in mm with y = 0
 * on the pan surface.
 */
export function DigitalBalance3D({ instrument, readingG, liveReading, onTare, children }: {
  instrument: K3Instruments["balance"];
  readingG: number | null;
  liveReading?: MutableRefObject<BalanceSample>;
  onTare?: () => void;
  children?: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const pan = useRef<THREE.Group>(null);
  const motion = useRef({ start: 0, sequence: [0], shown: "", dip: 0, velocity: 0 });
  const [lcd, setLcd] = useState({ text: formatReading(readingG ?? 0, instrument.resolutionG, "en"), stable: true });

  useEffect(() => {
    const value = readingG ?? 0;
    motion.current.start = performance.now();
    motion.current.sequence = reduced ? [value] : balanceSettleSequence(value, instrument.resolutionG);
    invalidate();
  }, [readingG, reduced, instrument.resolutionG, invalidate]);

  useFrame((state, delta) => {
    const m = motion.current;
    const elapsed = performance.now() - m.start;
    const { sequence } = m;
    let text: string;
    let stable = false;
    if (liveReading) {
      text = formatReading(liveReading.current.readingG, instrument.resolutionG, "en");
      stable = !liveReading.current.flowing;
    }
    else if (!reduced && elapsed < K3_MOTION.balanceDashesMs && sequence.length > 1) text = "----";
    else {
      const progress = reduced ? 1 : Math.min(1, (elapsed - K3_MOTION.balanceDashesMs) / (K3_MOTION.balanceSettleMs - K3_MOTION.balanceDashesMs));
      const index = Math.min(sequence.length - 1, Math.floor(progress * sequence.length));
      stable = index === sequence.length - 1;
      text = formatReading(sequence[index], instrument.resolutionG, "en");
    }
    const key = text + (stable ? "|s" : "");
    if (key !== m.shown) {
      m.shown = key;
      setLcd({ text, stable });
    }
    // Pan deflection grows with load (≤ 1.2 mm), on a damped spring.
    const target = -MAX_DIP_MM * Math.min(1, (liveReading?.current.readingG ?? readingG ?? 0) / instrument.capacityG);
    if (reduced) m.dip = target;
    else {
      const { stiffness, damping } = K3_MOTION.panSpring;
      const dt = Math.min(delta, 1 / 30);
      m.velocity += (stiffness * (target - m.dip) - damping * m.velocity) * dt;
      m.dip += m.velocity * dt;
    }
    if (pan.current) pan.current.position.y = m.dip / SCALE_MM;
    if (!stable || Math.abs(m.velocity) > 1e-3 || Math.abs(target - m.dip) > 1e-3) state.invalidate();
  });

  return <group name="balance" scale={SCALE_MM}>
    <DigitalScale3D reading={`${lcd.text} g`} stable={lcd.stable} onTare={onTare} panRef={pan}>
      {children !== undefined && <group scale={1 / SCALE_MM}>{children}</group>}
    </DigitalScale3D>
  </group>;
}
