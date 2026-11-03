import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { defineText } from "../../../../../i18n";
import "./EcoStage.css";
import { usePrefersReducedMotion } from "../../../shared/motion/usePrefersReducedMotion";
import { ECO_MOTION } from "./eco-motion";
import { ECO_SCENE } from "./eco-palette";
import { EcoQualityContext, ECO_TIERS, initialEcoTier, lowerEcoTier, type EcoTier } from "./eco-quality";

const text = defineText({
  vi: { unavailable: "Không hiển thị được cảnh 3D, em đang xem sơ đồ 2D.", retry: "Thử tải lại 3D" },
  en: { unavailable: "The 3D scene is unavailable; showing the 2D diagram.", retry: "Retry 3D" },
});

class StageBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

type Vec3 = [number, number, number];
/** What the camera frames: a box (scene units) around `target`, seen from `direction`. */
export type EcoView = { target: Vec3; direction: Vec3; width: number; height: number };
type Insets = { top: number; right: number; bottom: number; left: number };
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
const FOV = 34;

export function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Resolved light/dark theme from `<html data-theme>`, kept live. */
export function useDarkTheme() {
  const read = () => typeof document !== "undefined" && document.documentElement.dataset.theme === "dark";
  const [dark, setDark] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/**
 * Space the overlays leave free on the canvas. Each overlay counts against the
 * edge it hugs: tall ones (over 30 % of the height) in the right half are side
 * panels, the rest sit on the top or bottom.
 */
function measureInsets(host: HTMLElement, selectors: string[]): Insets {
  const box = host.getBoundingClientRect();
  if (box.width <= 720) return NO_INSETS;
  const insets = { ...NO_INSETS };
  for (const element of selectors.flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)))) {
    const r = element.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || getComputedStyle(element).visibility === "hidden") continue;
    if (r.right <= box.left || r.left >= box.right || r.bottom <= box.top || r.top >= box.bottom) continue;
    if (r.height > box.height * 0.3 && r.left > box.left + box.width / 2) insets.right = Math.max(insets.right, box.right - r.left + 12);
    else if (r.top + r.height / 2 < box.top + box.height / 2) insets.top = Math.max(insets.top, r.bottom - box.top + 8);
    else insets.bottom = Math.max(insets.bottom, box.bottom - r.top + 8);
  }
  return insets;
}

/**
 * Frames the view in the free area with an off-centre projection, glides there,
 * then hands the camera to the learner (orbit within limits, zoom, no pan).
 */
function FramedCamera({ view, insets, reset }: { view: EcoView; insets: Insets; reset: number }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const controls = useRef<OrbitControlsImpl>(null);
  const reduced = usePrefersReducedMotion();
  const travelling = useRef(true);
  const goal = useMemo(() => {
    const { width: W, height: H } = size;
    const freeW = Math.max(W - insets.left - insets.right, W * 0.35), freeH = Math.max(H - insets.top - insets.bottom, H * 0.3);
    const cx = insets.left + freeW / 2, cy = insets.top + freeH / 2;
    const fullW = W + Math.abs(W - 2 * cx), fullH = H + Math.abs(H - 2 * cy);
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // Pixels per unit at distance d: fullH / (2 d tan); the box must fit freeW × freeH.
    const distance = Math.max((view.height * fullH) / (2 * tan * freeH), (view.width * fullH) / (2 * tan * freeW));
    const target = new THREE.Vector3(...view.target);
    const position = new THREE.Vector3(...view.direction).normalize().multiplyScalar(distance).add(target);
    return { position, target, distance, offset: { fullW, fullH, x: fullW / 2 - cx, y: fullH / 2 - cy, W, H } };
  }, [view, insets, size]);
  useLayoutEffect(() => {
    const { fullW, fullH, x, y, W, H } = goal.offset;
    camera.aspect = fullW / fullH;
    camera.setViewOffset(fullW, fullH, x, y, W, H);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, goal, invalidate]);
  useEffect(() => { travelling.current = true; invalidate(); }, [goal.position, reset, invalidate]);
  useFrame((state, delta) => {
    const orbit = controls.current;
    if (!orbit || !travelling.current) return;
    if (reduced) { camera.position.copy(goal.position); orbit.target.copy(goal.target); travelling.current = false; }
    else {
      const alpha = 1 - Math.exp(-ECO_MOTION.cameraLambda * Math.min(delta, 0.1));
      camera.position.lerp(goal.position, alpha);
      orbit.target.lerp(goal.target, alpha);
      if (camera.position.distanceToSquared(goal.position) < 1e-4) travelling.current = false;
    }
    orbit.update();
    state.invalidate();
  });
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={0.08}
    minDistance={goal.distance * 0.55} maxDistance={goal.distance * 1.3}
    minAzimuthAngle={-0.75} maxAzimuthAngle={0.75} minPolarAngle={0.65} maxPolarAngle={1.62}
    onStart={() => { travelling.current = false; }} />;
}

/** Renders a few frames after mount and resize so on-demand scenes settle. */
function DemandWarmup() {
  const invalidate = useThree((state) => state.invalidate);
  const width = useThree((state) => state.size.width);
  useEffect(() => {
    let frames = 0, id = 0;
    const tick = () => { invalidate(); if (++frames < 10) id = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(id);
  }, [invalidate, width]);
  return null;
}

function Daylight({ dark, shadows }: { dark: boolean; shadows: boolean }) {
  const palette = dark ? ECO_SCENE.dark : ECO_SCENE.light;
  return <>
    <hemisphereLight args={[palette.sky, palette.ground, palette.hemi]} />
    <directionalLight position={[6, 11, 7]} intensity={palette.sunIntensity} color={palette.sun} castShadow={shadows}
      shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
      shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-near={1} shadow-camera-far={30} />
    <directionalLight position={[-8, 4, -6]} intensity={0.5} color="#bfe0ff" />
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={2} position={[0, 7, 4]} rotation={[Math.PI / 2.3, 0, 0]} scale={[16, 5, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#a8d8ff" position={[-9, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[8, 3, 1]} />
    </Environment>
  </>;
}

export type EcoStageScene = (context: { animate: boolean; dark: boolean }) => ReactNode;

/**
 * Canvas host for K8 ecology scenes. Owns the quality tier, light/dark daylight,
 * framing around the Lab's overlays and the 2D fallback. The canvas is
 * decorative (`aria-hidden`); every value it shows is also in the DOM.
 */
export function EcoStage({ view, scene, fallback, avoid = [], layoutKey = "", viewResetSignal = 0, motion = true, className = "" }: {
  view: EcoView;
  scene: EcoStageScene;
  /** The 2D diagram shown when WebGL fails. */
  fallback: ReactNode;
  /** Selectors of overlays the framing keeps clear of. */
  avoid?: string[];
  /** Changes whenever overlays may have moved (step, panel open). */
  layoutKey?: string;
  viewResetSignal?: number;
  /** Continuous animation wanted (fish swimming, ripples); off under reduced motion. */
  motion?: boolean;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const dark = useDarkTheme();
  const [tier, setTier] = useState<EcoTier>(initialEcoTier);
  const [visible, setVisible] = useState(() => document.visibilityState !== "hidden");
  const [lost, setLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  const insets = useInsets(host, avoid, layoutKey);
  const t = text();
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const settings = ECO_TIERS[tier];
  const animate = motion && !reduced;
  const frameloop = !visible ? "never" : animate ? "always" : "demand";
  const palette = dark ? ECO_SCENE.dark : ECO_SCENE.light;
  const failed = <div className="eco-stage-fallback">{fallback}<p className="eco-note" role="status">{t.unavailable} <button type="button" className="eco-link" onClick={() => { setLost(false); setGeneration((value) => value + 1); }}>{t.retry}</button></p></div>;
  return <div ref={host} className={`eco-3d ${className}`} data-testid="eco-3d" data-tier={tier} data-frameloop={frameloop} aria-hidden={lost ? undefined : "true"}>
    {lost ? failed : <StageBoundary key={generation} fallback={failed}>
      <Canvas frameloop={frameloop} dpr={settings.dpr} shadows={settings.shadows ? "soft" : false}
        gl={{ antialias: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.1 }}
        camera={{ fov: FOV, near: 0.1, far: 120, position: [0, 4, 24] }}
        onCreated={({ gl, camera }) => {
          // The framing rig owns aspect and view offset; R3F must not reset them on resize.
          (camera as THREE.PerspectiveCamera & { manual?: boolean }).manual = true;
          gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); setLost(true); });
        }}>
        <EcoQualityContext.Provider value={tier}>
          <color attach="background" args={[palette.background]} />
          <fog attach="fog" args={[palette.fog, 30, 70]} />
          <PerformanceMonitor onDecline={() => setTier(lowerEcoTier)} flipflops={2} />
          <Daylight dark={dark} shadows={settings.shadows} />
          {scene({ animate, dark })}
          <FramedCamera view={view} insets={insets} reset={viewResetSignal} />
          {frameloop === "demand" && <DemandWarmup />}
        </EcoQualityContext.Provider>
      </Canvas>
    </StageBoundary>}
  </div>;
}

function useInsets(host: RefObject<HTMLElement>, avoid: string[], layoutKey: string) {
  const [insets, setInsets] = useState<Insets>(NO_INSETS);
  const selectors = avoid.join("|");
  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const update = () => setInsets((previous) => {
      const next = measureInsets(element, avoid);
      return Object.keys(next).every((key) => Math.abs(next[key as keyof Insets] - previous[key as keyof Insets]) < 2) ? previous : next;
    });
    update();
    // Panels animate open/closed; measure again once they settle.
    const late = window.setTimeout(update, 260);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    return () => { window.clearTimeout(late); observer.disconnect(); window.removeEventListener("resize", update); };
  }, [host, selectors, layoutKey]);
  return insets;
}
