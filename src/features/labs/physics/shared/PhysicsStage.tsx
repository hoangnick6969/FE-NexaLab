import { createPortal } from "react-dom";
import { LabSceneContext } from "../../shared/LabSpace";
import { Component, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { defineText } from "../../../../i18n";

const text = defineText({ vi: { unavailable: "Không thể hiển thị không gian 3D. Em vẫn có thể dùng các điều khiển bên cạnh.", retry: "Thử tải lại 3D" }, en: { unavailable: "The 3D space is unavailable. You can still use the controls alongside it.", retry: "Retry 3D" } });
class StageBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function LabRoomEnvironment() {
  return <group>
    <color attach="background" args={["#e4e8e5"]} />
    <ambientLight intensity={1.1} />
    <directionalLight position={[3, 7, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0003} />
    <mesh position={[0, -0.08, 0]} receiveShadow><boxGeometry args={[5.4, .2, 3]} /><meshStandardMaterial color="#ad794c" roughness={.5} /></mesh>
    <mesh position={[0, -.2, 0]}><boxGeometry args={[5.3, .08, 2.9]} /><meshStandardMaterial color="#63452e" /></mesh>
    {[-2.3, 2.3].flatMap(x => [-1.1, 1.1].map(z => <mesh key={`${x}:${z}`} position={[x, -.75, z]} castShadow><boxGeometry args={[.12, 1.1, .12]} /><meshStandardMaterial color="#47565b" metalness={.5} roughness={.4} /></mesh>))}
    <mesh position={[0, 1.8, -3]} receiveShadow><boxGeometry args={[15, 6, .12]} /><meshStandardMaterial color="#eeeee6" /></mesh>
    <mesh position={[-6, 1.8, 0]} receiveShadow><boxGeometry args={[.12, 6, 12]} /><meshStandardMaterial color="#dce4df" /></mesh>
    {Array.from({ length: 12 }, (_, x) => Array.from({ length: 10 }, (_, z) => <mesh key={`${x}:${z}`} rotation={[-Math.PI/2, 0, 0]} position={[x-5.5, -1.32, z-4.5]} receiveShadow><planeGeometry args={[.985, .985]} /><meshStandardMaterial color={(x+z)%2 ? "#c7d0cc" : "#e1e5de"} roughness={.8} /></mesh>))}
    {[-3.8, -2.2, 2.5, 4.1].map(x => <group key={x} position={[x, -.45, -2.35]}>
      <mesh castShadow receiveShadow><boxGeometry args={[1.5, 1.65, 1]} /><meshStandardMaterial color="#a8bcb2" /></mesh>
      <mesh position={[0,.86,0]} receiveShadow><boxGeometry args={[1.6,.1,1.1]} /><meshStandardMaterial color="#f1efe4" /></mesh>
      {[-.37,.37].map(dx => <group key={dx}><mesh position={[dx,0,.51]}><boxGeometry args={[.7,1.45,.03]} /><meshStandardMaterial color="#bbcbc3" /></mesh><mesh position={[dx,.4,.55]}><boxGeometry args={[.22,.04,.05]} /><meshStandardMaterial color="#596a6b" metalness={.8} /></mesh></group>)}
    </group>)}
    <group position={[2.5,.44,-2.35]}>
      <mesh rotation={[-Math.PI/2,0,0]}><boxGeometry args={[.85,.6,.08]} /><meshStandardMaterial color="#677779" metalness={.8} roughness={.3} /></mesh>
      <mesh position={[0,.23,-.32]}><cylinderGeometry args={[.025,.025,.5]} /><meshStandardMaterial color="#bcc8ca" metalness={.9} roughness={.2} /></mesh>
      <mesh position={[0,.47,-.2]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.025,.025,.26]} /><meshStandardMaterial color="#bcc8ca" metalness={.9} /></mesh>
    </group>
  </group>;
}

/** Camera framing for one apparatus; the default keeps the Circuit framing. */
export type BenchViewPreset = {
  wide: { position: [number, number, number]; target: [number, number, number] };
  narrow: { position: [number, number, number]; target: [number, number, number] };
  minDistance?: number;
  maxDistance?: number;
  /** Bench width (world units) that must fit in the part of the canvas left uncovered by overlays. */
  fitWidth?: number;
  /** Canvas pixels covered by overlay panels; the framing is centred in the remaining area. */
  insets?: (size: { width: number; height: number }, narrow: boolean) => { right: number; bottom: number; top?: number };
};
const DEFAULT_VIEW: BenchViewPreset = {
  wide: { position: [0, 3.2, 5.5], target: [0, .2, 0] },
  narrow: { position: [0, 5, 9], target: [0, -.7, 0] },
};

const FOV = 45;
const UP = new THREE.Vector3(0, 1, 0);

/** Pulls the camera back until `fitWidth` fits, then pans so the bench sits in the uncovered area. */
function frame(preset: BenchViewPreset, narrow: boolean, size: { width: number; height: number }) {
  const base = narrow ? preset.narrow : preset.wide;
  if (!preset.insets && !preset.fitWidth) return base;
  const { right, bottom, top = 0 } = preset.insets?.(size, narrow) ?? { right: 0, bottom: 0 };
  const target = new THREE.Vector3(...base.target);
  const offset = new THREE.Vector3(...base.position).sub(target);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const freeWidth = Math.max(size.width - right, size.width * .4), freeHeight = Math.max(size.height - bottom - top, size.height * .3);
  let distance = offset.length();
  if (preset.fitWidth) distance = Math.max(distance, preset.fitWidth / (2 * tanHalf * freeWidth / size.height), preset.fitWidth * .45 / (2 * tanHalf * freeHeight / size.height));
  distance = Math.min(distance, preset.maxDistance ?? 12);
  offset.setLength(distance);
  const unitsPerPixel = 2 * distance * tanHalf / size.height;
  const sideways = new THREE.Vector3().crossVectors(UP, offset).normalize();
  const upward = new THREE.Vector3().crossVectors(offset, sideways).normalize();
  // Moving the camera right/down moves the bench left/up on screen.
  const pan = sideways.multiplyScalar(right / 2 * unitsPerPixel).addScaledVector(upward, -(bottom - top) / 2 * unitsPerPixel);
  const shifted = target.add(pan);
  return { position: shifted.clone().add(offset).toArray() as [number, number, number], target: shifted.toArray() as [number, number, number] };
}

function BenchView({ preset, resetSignal }: { preset: BenchViewPreset; resetSignal: number }) {
  const { size, camera } = useThree();
  const narrow = size.width / size.height < .85;
  const framing = useMemo(() => frame(preset, narrow, size), [preset, narrow, size]);
  useEffect(() => { camera.position.set(...framing.position); camera.updateProjectionMatrix(); }, [camera, framing, resetSignal]);
  return <OrbitControls makeDefault key={resetSignal} target={framing.target} minDistance={preset.minDistance ?? 2.8} maxDistance={preset.maxDistance ?? 12} minPolarAngle={Math.PI/7} maxPolarAngle={Math.PI/2.2} enablePan={false} />;
}

/** Small baked studio reflections for metal apparatus; no network HDR. */
function BenchReflections() {
  return <Environment resolution={64} frames={1}>
    <Lightformer form="rect" intensity={2.4} position={[0, 4, 2]} scale={[8, 2, 1]} />
    <Lightformer form="rect" intensity={1.2} position={[-5, 2, -1]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
    <Lightformer form="rect" intensity={.8} color="#ffe7c2" position={[5, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[4, 1.5, 1]} />
  </Environment>;
}

export function PhysicsStage({ children, view = DEFAULT_VIEW, reflections = false, viewResetSignal = 0 }: { children: ReactNode; view?: BenchViewPreset; reflections?: boolean; viewResetSignal?: number }) {
  const sceneRoot = useContext(LabSceneContext);
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false);
  const t = text();
  const fallback = <div className="physics-unavailable" role="status"><p>{t.unavailable}</p><button type="button" className="secondary" onClick={() => { setLost(false); setGeneration(v => v+1); }}>{t.retry}</button></div>;
  const stage = <div className="physics-stage" data-testid="physics-stage">
    {lost ? fallback : <StageBoundary key={generation} fallback={fallback}><Canvas shadows gl={{ alpha: false }} camera={{ position: [0, 3.2, 5.5], fov: FOV }} dpr={[1, 1.5]} fallback={fallback} onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", event => { event.preventDefault(); setLost(true); }); }}>
      <LabRoomEnvironment />{reflections && <BenchReflections />}{children}
      <BenchView preset={view} resetSignal={viewResetSignal} />
    </Canvas></StageBoundary>}
  </div>;
  return sceneRoot ? createPortal(stage, sceneRoot) : sceneRoot === null ? null : stage;
}
