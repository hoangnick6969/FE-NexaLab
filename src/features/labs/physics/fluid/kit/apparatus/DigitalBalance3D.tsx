import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { K3Instruments } from "../k3-config";
import { balanceSettleSequence, formatReading } from "../k3-geometry";
import { K3_MOTION, usePrefersReducedMotion } from "../k3-motion";

const BODY: [number, number, number] = [180, 42, 200];
const PAN_RADIUS = 60;
export const BALANCE_PAN_TOP_MM = BODY[1] + 14;

function useLcdTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, texture };
  }, []);
}

function drawLcd(canvas: HTMLCanvasElement, value: string, stable: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#a9b8a2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(20, 32, 24, .08)";
  ctx.font = "600 84px ui-monospace, Consolas, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("8888.8", 430, 66);
  ctx.fillStyle = "#16241a";
  ctx.fillText(value, 430, 66);
  ctx.font = "600 34px ui-monospace, Consolas, monospace";
  ctx.fillText("g", 488, 82);
  if (stable) {
    ctx.beginPath();
    ctx.arc(34, 34, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Electronic balance. `readingG` is the model's reading (null = nothing
 * weighed yet); the display settles on exactly that value. Units are mm.
 */
export function DigitalBalance3D({ instrument, readingG, onTare, children }: {
  instrument: K3Instruments["balance"];
  readingG: number | null;
  onTare?: () => void;
  children?: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const lcd = useLcdTexture();
  const pan = useRef<THREE.Group>(null);
  const motion = useRef({ start: 0, sequence: [0], shown: "", dip: 0, velocity: 0 });

  useEffect(() => {
    const value = readingG ?? 0;
    motion.current.start = performance.now();
    motion.current.sequence = reduced ? [value] : balanceSettleSequence(value, instrument.resolutionG);
    invalidate();
  }, [readingG, reduced, instrument.resolutionG, invalidate]);
  useEffect(() => () => lcd.texture.dispose(), [lcd]);

  useFrame((state, delta) => {
    const m = motion.current;
    const elapsed = performance.now() - m.start;
    const { sequence } = m;
    let display: string;
    let stable = false;
    if (!reduced && elapsed < K3_MOTION.balanceDashesMs && sequence.length > 1) display = "----";
    else {
      const progress = reduced ? 1 : Math.min(1, (elapsed - K3_MOTION.balanceDashesMs) / (K3_MOTION.balanceSettleMs - K3_MOTION.balanceDashesMs));
      const index = Math.min(sequence.length - 1, Math.floor(progress * sequence.length));
      stable = index === sequence.length - 1;
      display = formatReading(sequence[index], instrument.resolutionG, "en");
    }
    const key = display + (stable ? "|s" : "");
    if (key !== m.shown) {
      m.shown = key;
      drawLcd(lcd.canvas, display, stable);
      lcd.texture.needsUpdate = true;
    }
    // Pan deflection grows with load (≤ 1.2 mm), on a damped spring.
    const target = -1.2 * Math.min(1, (readingG ?? 0) / instrument.capacityG);
    if (reduced) m.dip = target;
    else {
      const { stiffness, damping } = K3_MOTION.panSpring;
      const dt = Math.min(delta, 1 / 30);
      m.velocity += (stiffness * (target - m.dip) - damping * m.velocity) * dt;
      m.dip += m.velocity * dt;
    }
    if (pan.current) pan.current.position.y = BALANCE_PAN_TOP_MM - 2 + m.dip;
    if (!stable || Math.abs(m.velocity) > 1e-3 || Math.abs(target - m.dip) > 1e-3) state.invalidate();
  });

  return <group>
    <RoundedBox args={BODY} radius={8} smoothness={4} position={[0, BODY[1] / 2, 0]} castShadow receiveShadow>
      <meshStandardMaterial color="#e9ecea" roughness={0.55} />
    </RoundedBox>
    {/* Display bezel on the front face, tilted slightly up towards the learner. */}
    <group position={[0, BODY[1] * 0.5, BODY[2] / 2 + 2]} rotation={[-0.18, 0, 0]}>
      <RoundedBox args={[150, 34, 6]} radius={3} smoothness={3}>
        <meshStandardMaterial color="#2c3532" roughness={0.4} />
      </RoundedBox>
      <mesh position={[-22, 0, 3.2]}>
        <planeGeometry args={[88, 22]} />
        <meshStandardMaterial map={lcd.texture} roughness={0.25} emissive="#ffffff" emissiveMap={lcd.texture} emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[48, 0, 3.4]} onClick={(event) => { event.stopPropagation(); onTare?.(); }}>
        <cylinderGeometry args={[6, 6, 2, 24]} />
        <meshStandardMaterial color="#cfd6d2" roughness={0.35} />
      </mesh>
      <mesh position={[63, 0, 3.4]}>
        <cylinderGeometry args={[6, 6, 2, 24]} />
        <meshStandardMaterial color="#b9473d" roughness={0.35} />
      </mesh>
    </group>
    <mesh position={[0, BODY[1] + 4, -12]}>
      <cylinderGeometry args={[10, 12, 8, 24]} />
      <meshStandardMaterial color="#9aa3a0" metalness={0.6} roughness={0.35} />
    </mesh>
    <group ref={pan} position={[0, BALANCE_PAN_TOP_MM - 2, -12]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[PAN_RADIUS, PAN_RADIUS - 2, 3, 64]} />
        <meshStandardMaterial color="#e4e8eb" metalness={0.65} roughness={0.28} />
      </mesh>
      <group position={[0, 1.5, 0]}>{children}</group>
    </group>
  </group>;
}
