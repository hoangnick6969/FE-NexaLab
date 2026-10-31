import { createPortal } from "react-dom";
import { LabSceneContext } from "../../shared/LabSpace";
import { PhysicalLabEnvironment } from "../../shared/PhysicalLabEnvironment";
import { Component, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { defineText } from "../../../../i18n";

const text = defineText({ vi: { unavailable: "Không thể hiển thị không gian 3D. Em vẫn có thể dùng các điều khiển bên cạnh.", retry: "Thử tải lại 3D" }, en: { unavailable: "The 3D space is unavailable. You can still use the controls alongside it.", retry: "Retry 3D" } });
class StageBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
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

export type StageView = { position: [number, number, number]; narrowPosition: [number, number, number]; target: [number, number, number]; narrowTarget: [number, number, number]; minDistance: number; maxDistance: number };

/** On-demand scenes request their first frames (and after a resize) so IBL and shadows bake before input. */
function DemandWarmup() {
  const invalidate = useThree((state) => state.invalidate);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  useEffect(() => {
    let frames = 0;
    let id = 0;
    const tick = () => { invalidate(); if (++frames < 8) id = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(id);
  }, [invalidate, width, height]);
  return null;
}

/**
 * Image-based studio lighting built in-scene (no downloaded HDR), plus soft
 * contact shadows. Needed for glass transmission and metal reflections.
 */
function StudioLighting() {
  return <>
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.4} position={[0, 5, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 3, 1]} />
      <Lightformer form="rect" intensity={1.2} position={[-6, 2, 1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
      <Lightformer form="rect" intensity={0.8} position={[6, 1.5, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 2, 1]} />
      <Lightformer form="ring" intensity={0.6} position={[0, 2, -4]} scale={2} />
    </Environment>
    <ContactShadows position={[0, .021, 0]} scale={[5.4, 3]} opacity={.45} blur={2.2} far={1.2} resolution={512} frames={1} />
  </>;
}


export function PhysicsStage({ children, view = DEFAULT_VIEW, reflections = false, viewResetSignal = 0, realism = false, frameloop = "always" }: { children: ReactNode; view?: BenchViewPreset | StageView; reflections?: boolean; viewResetSignal?: number; realism?: boolean; frameloop?: "always" | "demand" }) {
  const preset = useMemo<BenchViewPreset>(() => "wide" in view ? view : ({ wide: { position: view.position, target: view.target }, narrow: { position: view.narrowPosition, target: view.narrowTarget }, minDistance: view.minDistance, maxDistance: view.maxDistance }), [view]);
  const sceneRoot = useContext(LabSceneContext);
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false);
  const t = text();
  const fallback = <div className="physics-unavailable" role="status"><p>{t.unavailable}</p><button type="button" className="secondary" onClick={() => { setLost(false); setGeneration(v => v+1); }}>{t.retry}</button></div>;
  const stage = <div className="physics-stage" data-testid="physics-stage">
    {lost ? fallback : <StageBoundary key={generation} fallback={fallback}><Canvas shadows frameloop={frameloop} gl={realism ? { alpha: false, toneMapping: THREE.AgXToneMapping } : { alpha: false }} camera={{ position: preset.wide.position, fov: FOV, near: realism ? .01 : .1 }} dpr={[1, 1.5]} fallback={fallback} onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", event => { event.preventDefault(); setLost(true); }); }}>
      <LabRoomEnvironment />{realism ? <StudioLighting /> : reflections && <BenchReflections />}{children}
      <BenchView preset={preset} resetSignal={viewResetSignal} />
      {frameloop === "demand" && <DemandWarmup />}
    </Canvas></StageBoundary>}
  </div>;
  return sceneRoot ? createPortal(stage, sceneRoot) : sceneRoot === null ? null : stage;
}
