import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { ECO_MOTION } from "./eco-motion";
import { ECO_COLORS } from "./eco-palette";

const LENGTH = 3.2, SCALE_MAX = 500;

/**
 * Glass thermometer dipped into the pond: the column follows the shown
 * temperature (0–50 °C), with a tick every 10 °C. The label repeats a value
 * that is also in the DOM, so it is hidden from assistive technology.
 */
export function Thermometer3D({ valueDeciC, label, animate, position, onDrag }: { valueDeciC: number; label: string; animate: boolean; position: [number, number, number]; onDrag?: (deciC: number) => void }) {
  const invalidate = useThree((state) => state.invalidate);
  const controls = useThree((state) => state.controls) as unknown as { enabled: boolean } | null;
  const holder = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  // Explore only: drag along the tube; the pointer ray meets the thermometer's own plane, local y maps to 0–50 °C.
  const dragTo = (event: ThreeEvent<PointerEvent>) => {
    const node = holder.current;
    if (!node || !onDrag) return;
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(node.getWorldQuaternion(new THREE.Quaternion()));
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, node.getWorldPosition(new THREE.Vector3()));
    const hit = event.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) return;
    onDrag(Math.min(SCALE_MAX, Math.max(0, Math.round((node.worldToLocal(hit).y / LENGTH) * 50) * 10)));
  };
  const release = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    dragging.current = false;
    (event.target as unknown as Element).releasePointerCapture?.(event.pointerId);
    if (controls) controls.enabled = true;
    document.body.style.cursor = "";
  };
  const column = useRef<THREE.Mesh>(null);
  const shown = useRef(valueDeciC);
  // Base at the bulb, so scaling y grows the column upwards.
  const columnGeometry = useMemo(() => new THREE.CylinderGeometry(0.055, 0.055, LENGTH, 10).translate(0, LENGTH / 2, 0), []);
  useEffect(() => () => columnGeometry.dispose(), [columnGeometry]);
  const ticks = useMemo(() => Array.from({ length: 6 }, (_, i) => (i / 5) * LENGTH), []);
  useEffect(() => { invalidate(); }, [valueDeciC, invalidate]);
  useFrame((state, delta) => {
    const k = animate ? 1 - Math.exp(-ECO_MOTION.valueLambda * Math.min(delta, 0.1)) : 1;
    shown.current += (valueDeciC - shown.current) * k;
    if (column.current) column.current.scale.y = Math.max(0.02, shown.current / SCALE_MAX);
    if (Math.abs(valueDeciC - shown.current) > 0.5) state.invalidate();
  });
  return <group position={position} rotation={[0, 0, -0.12]} ref={holder}>
    {onDrag && <mesh position={[0, LENGTH / 2, 0.05]}
      onPointerOver={() => { document.body.style.cursor = "ns-resize"; }} onPointerOut={() => { if (!dragging.current) document.body.style.cursor = ""; }}
      onPointerDown={(event) => { event.stopPropagation(); dragging.current = true; (event.target as unknown as Element).setPointerCapture?.(event.pointerId); if (controls) controls.enabled = false; dragTo(event); }}
      onPointerMove={(event) => { if (dragging.current) dragTo(event); }} onPointerUp={release} onPointerCancel={release}>
      <boxGeometry args={[0.9, LENGTH + 0.8, 0.5]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>}
    <mesh position={[0, LENGTH / 2, 0]} castShadow>
      <cylinderGeometry args={[0.13, 0.13, LENGTH + 0.3, 20, 1, true]} />
      <meshPhysicalMaterial color={ECO_COLORS.glass} transparent opacity={0.45} roughness={0.05} clearcoat={1} depthWrite={false} />
    </mesh>
    <mesh position={[0, LENGTH + 0.16, 0]}>
      <sphereGeometry args={[0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshPhysicalMaterial color={ECO_COLORS.glass} transparent opacity={0.35} roughness={0.05} depthWrite={false} />
    </mesh>
    <mesh position={[0, -0.12, 0]} castShadow>
      <sphereGeometry args={[0.2, 20, 14]} />
      <meshStandardMaterial color={ECO_COLORS.mercury} roughness={0.3} />
    </mesh>
    <mesh ref={column}>
      <primitive object={columnGeometry} attach="geometry" />
      <meshStandardMaterial color={ECO_COLORS.mercury} roughness={0.3} />
    </mesh>
    {/* Scale plate behind the tube, one mark every 10 °C */}
    <mesh position={[0, LENGTH / 2, -0.16]} castShadow>
      <boxGeometry args={[0.46, LENGTH + 0.5, 0.04]} />
      <meshStandardMaterial color={ECO_COLORS.plate} roughness={0.6} />
    </mesh>
    {ticks.map((y) => <mesh key={y} position={[0.15, y, -0.13]}>
      <boxGeometry args={[0.12, 0.022, 0.01]} />
      <meshStandardMaterial color={ECO_COLORS.tick} />
    </mesh>)}
    {label && <Html position={[0, LENGTH + 0.6, 0]} center zIndexRange={[5, 0]}>
      <span className="eco-thermo-chip">{label}</span>
    </Html>}
  </group>;
}
