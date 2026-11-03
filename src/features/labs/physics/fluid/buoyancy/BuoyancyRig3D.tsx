import { useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { FluidBench3D, OverflowCan3D, SpringDynamometer3D, ForceVectorOverlay3D, Specimen3D, k3Material } from "../kit";
import { RetortStand3D, RigRod } from "../kit/apparatus/RetortStand3D";
import { useBuoyancyStore, EXPLORATION_SPECIMENS } from "./useBuoyancyStore";
import type { BenchViewPreset } from "../../shared/PhysicsStage";

const BUOYANCY_VIEW: BenchViewPreset = { wide: { position: [.2, 1.55, 3.25], target: [-.1, .85, 0] }, narrow: { position: [0, 1.75, 4.2], target: [-.1, .85, 0] }, minDistance: .7, maxDistance: 5, enableDamping: false, fitWidth: 2.6, insets: ({ width, height }) => width <= 640 ? { right: 0, bottom: height * .48, top: 75 } : { right: Math.min(430, width * .32), bottom: 0, top: 70 } };

export function BuoyancyRig3D() {
  const state = useBuoyancyStore();
  return <FluidBench3D active={state.mode === "3d"} view={BUOYANCY_VIEW}><Rig /></FluidBench3D>;
}

function Rig() {
  const state = useBuoyancyStore(); const { camera, controls, invalidate, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const drag = useRef<{ plane: THREE.Plane; y: number; hoist: number } | null>(null);
  const samples = [...state.config.specimens, ...EXPLORATION_SPECIMENS];
  const sample = samples.find(s => s.id === state.specimenId)!;
  const meshSpecimen = state.config.kit.specimens.find(s => s.id === state.specimenId);
  const extra = EXPLORATION_SPECIMENS.find(s => s.id === state.specimenId);
  const height = meshSpecimen?.shape === "irregular" ? meshSpecimen.maxWidthMm : 25;
  const weight = sample.massG / 1000 * state.config.gravity;
  const buoyant = state.config.fluidDensityKgM3 * state.config.gravity * state.submergedVolumeMl / 1e6;
  const extension = Math.min(5, state.springForceN) * 10.4;
  const specimenY = state.specimenY;
  const dynamometerY = specimenY + height + 64 + extension;
  const orbit = controls as unknown as { enabled: boolean } | undefined;
  useEffect(() => { invalidate(); }, [state.targetHoistHeight, invalidate]);
  useEffect(() => () => { gl.domElement.style.cursor = ""; if (orbit) orbit.enabled = true; }, [gl, orbit]);
  const handlers = {
    onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHovered(true); gl.domElement.style.cursor = "grab"; },
    onPointerOut: () => { if (!drag.current) { setHovered(false); gl.domElement.style.cursor = ""; } },
    onPointerDown: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation(); const normal = camera.getWorldDirection(new THREE.Vector3()); normal.y = 0; normal.normalize();
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, event.point); const hit = event.ray.intersectPlane(plane, new THREE.Vector3());
      if (!hit) return; drag.current = { plane, y: hit.y, hoist: state.targetHoistHeight }; if (orbit) orbit.enabled = false;
      (event.target as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture(event.pointerId); gl.domElement.style.cursor = "grabbing";
    },
    onPointerMove: (event: ThreeEvent<PointerEvent>) => { if (!drag.current) return; event.stopPropagation(); const hit = event.ray.intersectPlane(drag.current.plane, new THREE.Vector3()); if (hit) state.setHoistHeight(drag.current.hoist - (hit.y - drag.current.y) / .34); },
    onPointerUp: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); drag.current = null; if (orbit) orbit.enabled = true; (event.target as unknown as { releasePointerCapture: (id: number) => void }).releasePointerCapture(event.pointerId); gl.domElement.style.cursor = "grab"; },
    onPointerCancel: () => { drag.current = null; if (orbit) orbit.enabled = true; gl.domElement.style.cursor = ""; },
  };
  return <group name="buoyancy-complete-rig">
    <group {...handlers}><RetortStand3D clampY={dynamometerY + 167} /></group>
    <OverflowCan3D collectedMl={state.overflowMl} submergedMl={state.submergedVolumeMl} />
    <group position={[0, dynamometerY, 0]} {...handlers}>
      <SpringDynamometer3D forceN={state.springForceN} massKg={sample.massG / 1000} />
      <Html position={[50, 90, 0]} center style={{ pointerEvents: "none" }}><span className="buoyancy-scene-badge">F = {state.springForceN.toFixed(3)} N</span></Html>
    </group>
    <RigRod from={[0, dynamometerY - 16 - extension, 0]} to={[0, specimenY + height + 5, 0]} radius={.45} />
    <group position={[0, specimenY, 0]} {...handlers} name="buoyancy-active-specimen">
      {meshSpecimen ? <Specimen3D specimen={meshSpecimen} material={k3Material(state.config.kit, meshSpecimen.materialId)} /> : <mesh position={[0, 12.5, 0]} castShadow><boxGeometry args={[20, 25, 20]} /><meshStandardMaterial color={extra?.color} metalness={extra?.metalness} roughness={.35} /></mesh>}
      {hovered && <mesh raycast={() => undefined} position={[0, height / 2, 0]}><sphereGeometry args={[22, 24, 16]} /><meshBasicMaterial color="#38bdf8" transparent opacity={.12} depthWrite={false} /></mesh>}
      <group position={[27, height / 2, 15]} scale={2.5}><ForceVectorOverlay3D weightN={weight} buoyantForceN={buoyant} position={[0, 0, 0]} /></group>
      <Html position={[65, -12, 20]} center style={{ pointerEvents: "none" }}><span className="buoyancy-scene-badge is-weight">P = {weight.toFixed(3)} N</span></Html>
      <Html position={[65, 48, 20]} center style={{ pointerEvents: "none" }}><span className="buoyancy-scene-badge is-buoyancy">F_A = {buoyant.toFixed(3)} N</span></Html>
    </group>
    <group position={[-210, 0, 90]} name="specimen-tray">
      <mesh position={[0, 3, 0]} receiveShadow castShadow><boxGeometry args={[165, 6, 90]} /><meshStandardMaterial color="#cad7dc" metalness={.35} roughness={.55} /></mesh>
      {samples.map((item, i) => { const x = (i % 3 - 1) * 48, z = Math.floor(i / 3) * 43 - 22; const spec = state.config.kit.specimens.find(s => s.id === item.id); const exploration = EXPLORATION_SPECIMENS.find(s => s.id === item.id); return <group key={item.id} position={[x, 7, z]} onClick={event => { event.stopPropagation(); state.selectSpecimen(item.id); }} onPointerOver={() => { gl.domElement.style.cursor = "pointer"; }} onPointerOut={() => { gl.domElement.style.cursor = ""; }}>
        {spec ? <Specimen3D specimen={spec} material={k3Material(state.config.kit, spec.materialId)} /> : <mesh position={[0, 12.5, 0]} castShadow><boxGeometry args={[20, 25, 20]} /><meshStandardMaterial color={exploration?.color} metalness={exploration?.metalness} roughness={.4} /></mesh>}
        <Html position={[0, -3, 18]} center><button className={`buoyancy-tray-label${state.specimenId === item.id ? " is-selected" : ""}`} onClick={() => state.selectSpecimen(item.id)}>{item.label}</button></Html>
      </group>; })}
    </group>
  </group>;
}
