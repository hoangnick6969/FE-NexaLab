import { Component, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { defineText } from "../../../../../i18n";
import { LabSceneContext } from "../../../shared/LabSpace";
import { usePrefersReducedMotion } from "../../../shared/motion/usePrefersReducedMotion";
import { K7_MOTION } from "./k7-motion";
import { K7_SCENE } from "./k7-palette";
import { K7QualityContext, K7_TIERS, initialK7Tier, lowerTier, type K7Tier } from "./k7-quality";
import { Nucleoplasm3D } from "./molecules/Nucleoplasm3D";

const text = defineText({
  vi: { unavailable: "Không thể hiển thị không gian 3D. Em vẫn làm bài được bằng sơ đồ 2D và các nút bên cạnh.", retry: "Thử tải lại 3D" },
  en: { unavailable: "The 3D space is unavailable. You can still work with the 2D diagram and the controls alongside.", retry: "Retry 3D" },
});

class StageBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

type Vec3 = [number, number, number];
/** Camera framing for one step of a molecular scene (nm); `fitWidth` is the subject width that must stay in view. */
export type MolecularView = { position: Vec3; target: Vec3; fitWidth?: number; minDistance?: number; maxDistance?: number };

const FOV = 38;
const UP = new THREE.Vector3(0, 1, 0);

/** Overlay panels covering the canvas; the subject is centred in what is left. */
function insetsFor(size: { width: number; height: number }) {
  if (size.width <= 640) return { right: 0, bottom: size.height * 0.52, top: 124 };
  return { right: Math.min(432, size.width * 0.42), bottom: 0, top: 72 };
}

/** Moves the camera back and sideways so the view's subject sits in the uncovered area. */
function frame(view: MolecularView, size: { width: number; height: number }) {
  const { right, bottom, top } = insetsFor(size);
  const target = new THREE.Vector3(...view.target);
  const offset = new THREE.Vector3(...view.position).sub(target);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  // Pull back until the subject width fits the part of the canvas the panels leave free.
  const freeAspect = Math.max(size.width - right, size.width * 0.4) / Math.max(size.height - bottom - top, size.height * 0.3);
  const fitHeight = ((view.fitWidth ?? 9) * 1.12) / freeAspect;
  const freeShare = Math.max(size.height - bottom - top, size.height * 0.3) / size.height;
  const distance = Math.max(offset.length(), fitHeight / freeShare / (2 * tanHalf));
  offset.setLength(Math.min(distance, view.maxDistance ?? 40));
  const unitsPerPixel = (2 * offset.length() * tanHalf) / size.height;
  const sideways = new THREE.Vector3().crossVectors(UP, offset).normalize();
  const upward = new THREE.Vector3().crossVectors(offset, sideways).normalize();
  const shift = sideways.multiplyScalar((right / 2) * unitsPerPixel).addScaledVector(upward, (-(bottom - top) / 2) * unitsPerPixel);
  const framedTarget = target.add(shift);
  return { position: framedTarget.clone().add(offset), target: framedTarget };
}

/**
 * Glides camera and orbit target to the active view when it changes, then
 * hands control back to the learner (orbit/zoom, no pan). Reduced motion cuts.
 */
function CameraRig({ view, reset }: { view: MolecularView; reset: number }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const reduced = usePrefersReducedMotion();
  const goal = useMemo(() => frame(view, size), [view, size]);
  const travelling = useRef(true);
  useEffect(() => { travelling.current = true; invalidate(); }, [goal, reset, invalidate]);
  useFrame((state, delta) => {
    const orbit = controls.current;
    if (!orbit || !travelling.current) return;
    if (reduced) {
      camera.position.copy(goal.position);
      orbit.target.copy(goal.target);
      travelling.current = false;
    } else {
      const alpha = 1 - Math.exp(-K7_MOTION.cameraLambda * Math.min(delta, 0.1));
      camera.position.lerp(goal.position, alpha);
      orbit.target.lerp(goal.target, alpha);
      if (camera.position.distanceToSquared(goal.position) < 1e-4 && orbit.target.distanceToSquared(goal.target) < 1e-4) travelling.current = false;
    }
    orbit.update();
    state.invalidate();
  });
  return <OrbitControls
    ref={controls}
    makeDefault
    enablePan={false}
    enableDamping
    dampingFactor={0.08}
    minDistance={view.minDistance ?? 4}
    maxDistance={view.maxDistance ?? 40}
    onStart={() => { travelling.current = false; }}
  />;
}

/** On-demand scenes render a few frames after mount and resize so lighting settles. */
function DemandWarmup() {
  const invalidate = useThree((state) => state.invalidate);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  useEffect(() => {
    let frames = 0, id = 0;
    const tick = () => { invalidate(); if (++frames < 8) id = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(id);
  }, [invalidate, width, height]);
  return null;
}

/** Soft studio reflections for clearcoat surfaces, built in-scene (no downloaded HDR). */
function MolecularLighting() {
  return <>
    <hemisphereLight args={["#cfe9ff", "#122430", 0.7]} />
    <directionalLight position={[6, 9, 10]} intensity={2.1} color="#fff1dc" />
    <directionalLight position={[-9, 3, -8]} intensity={1.4} color="#7fc4ff" />
    <pointLight position={[0, -6, 6]} intensity={14} distance={30} color="#5ab0c8" />
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={2.2} position={[0, 6, 4]} rotation={[Math.PI / 2.4, 0, 0]} scale={[12, 4, 1]} />
      <Lightformer form="rect" intensity={1.1} color="#9fd8ff" position={[-8, 1, 0]} rotation={[0, Math.PI / 2, 0]} scale={[8, 3, 1]} />
      <Lightformer form="ring" intensity={0.9} color="#ffd9a8" position={[7, 2, 3]} scale={3} />
    </Environment>
  </>;
}

/**
 * Canvas host for K7 scene-first Labs. Unlike the physics bench, there is no
 * shared room: the molecules float in a nucleoplasm backdrop. Owns Canvas
 * lifecycle, quality tier, camera rig and the WebGL fallback; the canvas is
 * decorative (`aria-hidden`), every value is also in the DOM.
 */
export function MolecularStage({ view, children, ambient = false, viewResetSignal = 0, entering = false }: { view: MolecularView; children: ReactNode; ambient?: boolean; viewResetSignal?: number; /** Opens like looking into an eyepiece (after the bench zoom). */ entering?: boolean }) {
  const sceneRoot = useContext(LabSceneContext);
  const reduced = usePrefersReducedMotion();
  const [tier, setTier] = useState<K7Tier>(initialK7Tier);
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false);
  const t = text();
  useEffect(() => {
    if (!sceneRoot) return;
    sceneRoot.setAttribute("aria-hidden", "true");
    return () => sceneRoot.removeAttribute("aria-hidden");
  }, [sceneRoot]);
  const settings = K7_TIERS[tier];
  const continuous = ambient && !reduced;
  const fallback = <div className="physics-unavailable" role="status"><p>{t.unavailable}</p><button type="button" className="secondary" onClick={() => { setLost(false); setGeneration((value) => value + 1); }}>{t.retry}</button></div>;
  const stage = <div className={`physics-stage k7-stage ${entering && !reduced ? "is-entering" : ""}`} data-testid="molecular-stage" data-tier={tier}>
    {lost ? fallback : <StageBoundary key={generation} fallback={fallback}>
      <Canvas
        frameloop={continuous ? "always" : "demand"}
        dpr={settings.dpr}
        gl={{ alpha: false, antialias: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.05 }}
        camera={{ position: view.position, fov: FOV, near: 0.05, far: 200 }}
        fallback={fallback}
        onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); setLost(true); }); }}
      >
        <K7QualityContext.Provider value={tier}>
          <color attach="background" args={[K7_SCENE.background]} />
          <fogExp2 attach="fog" args={[K7_SCENE.fog, 0.022]} />
          <PerformanceMonitor onDecline={() => setTier(lowerTier)} flipflops={2} />
          <MolecularLighting />
          <Nucleoplasm3D drift={continuous} />
          {children}
          <CameraRig view={view} reset={viewResetSignal} />
          {!continuous && <DemandWarmup />}
        </K7QualityContext.Provider>
      </Canvas>
    </StageBoundary>}
  </div>;
  return sceneRoot ? createPortal(stage, sceneRoot) : sceneRoot === null ? null : stage;
}
