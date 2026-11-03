import { useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/** Shared studio for the anatomy kit (FL-16 and FL-17): lights, orbit camera, focus rig, callouts. */
export type FocusTarget = { point: [number, number, number]; key: number } | null;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Glides the orbit target to the focused callout. The camera moves by the same
 * offset, so the viewing angle stays the same. Renders on demand: each step
 * requests one more frame, and the loop stops once the target arrives.
 */
export function FocusRig({ target }: { target: FocusTarget }) {
  const { camera, invalidate, controls } = useThree();
  const goal = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (!target) return;
    const c = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (!c) return;
    goal.current = new THREE.Vector3(...target.point);
    if (reducedMotion()) {
      const offset = goal.current.clone().sub(c.target);
      c.target.copy(goal.current);
      camera.position.add(offset);
      c.update();
      goal.current = null;
    }
    invalidate();
  }, [target, camera, controls, invalidate]);

  useFrame(() => {
    const c = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (!c || !goal.current) return;
    const delta = goal.current.clone().sub(c.target);
    if (delta.length() < 1e-3) {
      c.target.copy(goal.current);
      camera.position.add(delta);
      c.update();
      goal.current = null;
      return;
    }
    const step = delta.multiplyScalar(0.2);
    c.target.add(step);
    camera.position.add(step);
    c.update();
    invalidate();
  });

  return null;
}

/** Render statistics read by the dev preview and its Playwright benchmark. */
export type AnatomyStageStats = {
  frames: number;
  calls: number;
  triangles: number;
  vertices: number;
  meshes: number;
  geometries: number;
  textures: number;
  programs: number;
  frameloop: string;
};

/**
 * Dev-only probe. It counts rendered frames (useFrame runs only when a frame
 * is drawn, so an idle demand loop leaves the count unchanged) and exposes
 * three.js render info on window.__anatomyStage. Never mounted in production.
 */
function DevStageProbe() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const frameloop = useThree((state) => state.frameloop);
  const frames = useRef(0);
  const last = useRef({ calls: 0, triangles: 0 });
  useFrame(() => {
    frames.current += 1;
    // info.render resets before each render, so read the previous frame here.
    last.current = { calls: gl.info.render.calls, triangles: gl.info.render.triangles };
  });
  useEffect(() => {
    const read = (): AnatomyStageStats => {
      let vertices = 0;
      let meshes = 0;
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh || !mesh.visible) return;
        meshes += 1;
        vertices += mesh.geometry.attributes.position?.count ?? 0;
      });
      return {
        frames: frames.current,
        calls: last.current.calls,
        triangles: last.current.triangles,
        vertices,
        meshes,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
        frameloop,
      };
    };
    (window as unknown as { __anatomyStage?: { read: () => AnatomyStageStats } }).__anatomyStage = { read };
    return () => { delete (window as unknown as { __anatomyStage?: unknown }).__anatomyStage; };
  }, [gl, scene, frameloop]);
  return null;
}

export type Callout = {
  id: string;
  label: string;
  /** Scene position, in scene units. */
  position: [number, number, number];
  active: boolean;
  onSelect: () => void;
};

/** Keyboard-reachable callouts. They are DOM buttons, so no 3D pick is required. */
export function CalloutPins({ callouts }: { callouts: Callout[] }) {
  return (
    <>
      {callouts.map((callout) => (
        <Html key={callout.id} position={callout.position} center zIndexRange={[20, 0]} style={{ pointerEvents: "auto" }}>
          <button
            type="button"
            className={`anatomy-pin${callout.active ? " is-active" : ""}`}
            aria-pressed={callout.active}
            onClick={callout.onSelect}
          >
            {callout.label}
          </button>
        </Html>
      ))}
    </>
  );
}

export function AnatomyStage({ label, focus, children, cameraPosition = [5.5, 2.6, -7.5], target = [0, 0, 0], room = false }: {
  label: string;
  focus: FocusTarget;
  children: ReactNode;
  cameraPosition?: [number, number, number];
  /** Initial orbit centre, in world units. */
  target?: [number, number, number];
  /** The children draw a room (EyeLabRoom), so the studio backdrop is not painted and the camera may stand further back. */
  room?: boolean;
}) {
  return (
    <div className={`anatomy-stage${room ? " has-room" : ""}`} role="img" aria-label={label}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: cameraPosition, fov: 30, near: 0.05, far: 200 }}
        gl={{ localClippingEnabled: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      >
        {!room && <color attach="background" args={["#eef2ee"]} />}
        <hemisphereLight args={["#f7f9f4", "#c9cfc4", 0.9]} />
        <directionalLight position={[5, 7, 6]} intensity={1.6} />
        <pointLight position={[-6, 2, -4]} intensity={0.6} color="#dfeaff" />
        {/* Fill from the camera side, so the inside of a sectioned organ is not in shadow. */}
        <directionalLight position={[1.5, 2.5, -6]} intensity={1.3} color="#fff4ea" />
        <group scale={1}>{children}</group>
        <FocusRig target={focus} />
        {import.meta.env.DEV && <DevStageProbe />}
        <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={room ? 22 : 18} target={target} />
      </Canvas>
    </div>
  );
}
