import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { ECO_COLORS as C } from "./eco-palette";

/**
 * Low-poly procedural organisms for K8 scenes, built from primitives (no
 * downloaded models). About 1 unit tall, facing +x, illustrative and not to
 * scale. Idle motion is small and stops when `animate` is false.
 */
export type CritterProps = { animate: boolean };

const Mat = ({ color, rough = 0.75 }: { color: string; rough?: number }) => <meshStandardMaterial color={color} roughness={rough} flatShading />;

/** Runs `step(t)` each frame while animating; `t` is seconds since mount. */
function useIdle(animate: boolean, step: (t: number) => void) {
  const time = useRef(0);
  useFrame((state, delta) => {
    if (!animate) return;
    time.current += Math.min(delta, 0.1);
    step(time.current);
    state.invalidate();
  });
}

export function Grasshopper({ animate }: CritterProps) {
  const body = useRef<THREE.Group>(null);
  // A short hop every few seconds.
  useIdle(animate, (t) => { if (body.current) body.current.position.y = Math.max(0, Math.sin((t % 3.2) * 3.6)) * 0.22 * Number(t % 3.2 < 0.87); });
  return <group ref={body} scale={0.55}>
    <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><capsuleGeometry args={[0.13, 0.55, 4, 8]} /><Mat color={C.grasshopper} /></mesh>
    <mesh position={[0.42, 0.38, 0]} castShadow><sphereGeometry args={[0.15, 10, 8]} /><Mat color={C.grasshopper} /></mesh>
    {[1, -1].map((side) => <group key={side}>
      {/* Long hind leg: thigh up and back, shin down */}
      <mesh position={[-0.12, 0.42, side * 0.12]} rotation={[0, 0, -0.9]}><boxGeometry args={[0.42, 0.06, 0.05]} /><Mat color={C.caterpillarHead} /></mesh>
      <mesh position={[-0.3, 0.18, side * 0.14]} rotation={[0, 0, 1.2]}><boxGeometry args={[0.4, 0.04, 0.04]} /><Mat color={C.caterpillarHead} /></mesh>
      <mesh position={[0.25, 0.14, side * 0.1]} rotation={[0, 0, 1.4]}><boxGeometry args={[0.24, 0.03, 0.03]} /><Mat color={C.caterpillarHead} /></mesh>
      <mesh position={[0.62, 0.58, side * 0.05]} rotation={[side * 0.3, 0, -0.6]}><cylinderGeometry args={[0.008, 0.012, 0.4, 4]} /><Mat color={C.caterpillarHead} /></mesh>
    </group>)}
  </group>;
}

export function Caterpillar({ animate }: CritterProps) {
  const segments = useRef<THREE.Group>(null);
  // Inching: a wave runs along the body.
  useIdle(animate, (t) => segments.current?.children.forEach((segment, i) => { segment.position.y = 0.09 + Math.max(0, Math.sin(t * 3 - i * 0.7)) * 0.06; }));
  return <group ref={segments} scale={0.7}>
    {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0.3 - i * 0.13, 0.09, 0]} castShadow>
      <sphereGeometry args={[i === 0 ? 0.1 : 0.09, 10, 8]} /><Mat color={i === 0 ? C.caterpillarHead : C.caterpillar} />
    </mesh>)}
  </group>;
}

export function Rabbit({ animate }: CritterProps) {
  const head = useRef<THREE.Group>(null);
  // Nibbling: the head dips now and then.
  useIdle(animate, (t) => { if (head.current) head.current.rotation.z = -0.25 * Math.max(0, Math.sin(t * 1.4)) ** 6; });
  return <group scale={0.8}>
    <mesh position={[0, 0.32, 0]} scale={[1.25, 0.95, 0.85]} castShadow><sphereGeometry args={[0.3, 14, 10]} /><Mat color={C.rabbit} /></mesh>
    <mesh position={[-0.36, 0.38, 0]} castShadow><sphereGeometry args={[0.09, 8, 6]} /><Mat color={C.rabbitBelly} /></mesh>
    <group ref={head} position={[0.32, 0.5, 0]}>
      <mesh position={[0.08, 0, 0]} castShadow><sphereGeometry args={[0.17, 12, 10]} /><Mat color={C.rabbit} /></mesh>
      {[1, -1].map((side) => <mesh key={side} position={[0, 0.27, side * 0.07]} rotation={[side * 0.15, 0, -0.2]} castShadow>
        <capsuleGeometry args={[0.04, 0.3, 4, 6]} /><Mat color={C.rabbit} />
      </mesh>)}
      <mesh position={[0.24, 0.02, 0]}><sphereGeometry args={[0.03, 6, 4]} /><Mat color={C.fishEye} /></mesh>
    </group>
  </group>;
}

export function Frog({ animate }: CritterProps) {
  const throat = useRef<THREE.Mesh>(null);
  useIdle(animate, (t) => throat.current?.scale.setScalar(1 + 0.25 * Math.max(0, Math.sin(t * 4))));
  return <group scale={0.75}>
    <mesh position={[0, 0.2, 0]} scale={[1.2, 0.7, 1]} castShadow><sphereGeometry args={[0.3, 14, 10]} /><Mat color={C.frog} /></mesh>
    <mesh ref={throat} position={[0.24, 0.13, 0]}><sphereGeometry args={[0.11, 10, 8]} /><Mat color={C.frogBelly} /></mesh>
    {[1, -1].map((side) => <group key={side}>
      <mesh position={[0.16, 0.38, side * 0.13]} castShadow><sphereGeometry args={[0.08, 10, 8]} /><Mat color={C.frog} /></mesh>
      <mesh position={[0.2, 0.41, side * 0.15]}><sphereGeometry args={[0.04, 8, 6]} /><Mat color={C.fishEye} /></mesh>
      <mesh position={[-0.18, 0.08, side * 0.26]} scale={[1.6, 0.5, 0.8]} castShadow><sphereGeometry args={[0.12, 8, 6]} /><Mat color={C.frog} /></mesh>
    </group>)}
  </group>;
}

export function Songbird({ animate }: CritterProps) {
  const body = useRef<THREE.Group>(null);
  useIdle(animate, (t) => { if (body.current) body.current.rotation.z = 0.12 * Math.sin(t * 2.2) * Number(Math.sin(t * 0.7) > 0); });
  return <group ref={body} scale={0.75}>
    <mesh position={[0, 0.25, 0]} scale={[1.3, 1, 0.9]} castShadow><sphereGeometry args={[0.2, 12, 10]} /><Mat color={C.bird} /></mesh>
    <mesh position={[0.08, 0.2, 0]} scale={[1, 0.9, 0.8]}><sphereGeometry args={[0.17, 10, 8]} /><Mat color={C.birdBreast} /></mesh>
    <mesh position={[0.24, 0.42, 0]} castShadow><sphereGeometry args={[0.13, 10, 8]} /><Mat color={C.bird} /></mesh>
    <mesh position={[0.4, 0.42, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.04, 0.12, 6]} /><Mat color={C.beak} /></mesh>
    <mesh position={[-0.3, 0.32, 0]} rotation={[0, 0, 0.5]}><boxGeometry args={[0.28, 0.04, 0.14]} /><Mat color={C.bird} /></mesh>
    <mesh position={[0.3, 0.46, 0.08]}><sphereGeometry args={[0.025, 6, 4]} /><Mat color={C.fishEye} /></mesh>
  </group>;
}

export function Snake({ animate }: CritterProps) {
  const body = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    // A loose S on the ground, rising into the head.
    const points = Array.from({ length: 24 }, (_, i) => {
      const u = i / 23;
      return new THREE.Vector3(-0.7 + u * 1.3, 0.07 + Math.max(0, u - 0.82) * 1.2, Math.sin(u * Math.PI * 2.2) * 0.28);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.07, 8, false);
  }, []);
  useIdle(animate, (t) => { if (body.current) body.current.rotation.y = 0.12 * Math.sin(t * 0.9); });
  return <group ref={body}>
    <mesh geometry={geometry} castShadow><Mat color={C.snake} rough={0.55} /></mesh>
    <mesh position={[0.64, 0.24, Math.sin(Math.PI * 2.2) * 0.28]} scale={[1.5, 0.8, 1]} castShadow><sphereGeometry args={[0.09, 10, 8]} /><Mat color={C.snake} rough={0.55} /></mesh>
  </group>;
}

export function Fox({ animate }: CritterProps) {
  const tail = useRef<THREE.Group>(null);
  useIdle(animate, (t) => { if (tail.current) tail.current.rotation.y = 0.35 * Math.sin(t * 1.6); });
  return <group scale={0.95}>
    <mesh position={[0, 0.45, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><capsuleGeometry args={[0.17, 0.5, 4, 10]} /><Mat color={C.fox} /></mesh>
    {[[0.24, 0.1], [0.24, -0.1], [-0.24, 0.1], [-0.24, -0.1]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.18, z]} castShadow>
      <cylinderGeometry args={[0.035, 0.03, 0.36, 6]} /><Mat color={C.eagle} />
    </mesh>)}
    <group position={[0.46, 0.66, 0]}>
      <mesh castShadow><sphereGeometry args={[0.16, 12, 10]} /><Mat color={C.fox} /></mesh>
      <mesh position={[0.17, -0.04, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.08, 0.22, 8]} /><Mat color={C.foxWhite} /></mesh>
      {[1, -1].map((side) => <mesh key={side} position={[-0.02, 0.17, side * 0.08]}><coneGeometry args={[0.06, 0.16, 4]} /><Mat color={C.fox} /></mesh>)}
      <mesh position={[0.11, 0.05, 0.1]}><sphereGeometry args={[0.025, 6, 4]} /><Mat color={C.fishEye} /></mesh>
    </group>
    <group ref={tail} position={[-0.42, 0.5, 0]}>
      <mesh position={[-0.22, -0.05, 0]} rotation={[0, 0, 1.2]} castShadow><capsuleGeometry args={[0.1, 0.32, 4, 8]} /><Mat color={C.fox} /></mesh>
      <mesh position={[-0.42, -0.14, 0]}><sphereGeometry args={[0.09, 8, 6]} /><Mat color={C.foxWhite} /></mesh>
    </group>
  </group>;
}

/** One wing seen from above (x forward, y out from the body), with fingered primaries at the tip. */
function wingGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.16, 0);
  shape.bezierCurveTo(0.2, 0.3, 0.12, 0.6, 0.02, 0.86);
  [[0.0, 0.94], [-0.04, 0.86], [-0.08, 0.92], [-0.12, 0.82], [-0.17, 0.86], [-0.2, 0.74]].forEach(([x, y]) => shape.lineTo(x, y));
  shape.bezierCurveTo(-0.26, 0.5, -0.2, 0.2, -0.16, 0);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false }).rotateX(-Math.PI / 2);
}

export function Eagle({ animate }: CritterProps) {
  const wings = useRef<THREE.Group>(null);
  const wing = useMemo(wingGeometry, []);
  useIdle(animate, (t) => wings.current?.children.forEach((w, i) => { w.rotation.x = (i ? -1 : 1) * (0.12 + 0.22 * Math.sin(t * 2.4)); }));
  return <group scale={1.15}>
    <mesh rotation={[0, 0, Math.PI / 2]} castShadow><capsuleGeometry args={[0.12, 0.38, 4, 10]} /><Mat color={C.eagle} /></mesh>
    <mesh position={[0.32, 0.05, 0]} castShadow><sphereGeometry args={[0.12, 10, 8]} /><Mat color={C.eagleHead} /></mesh>
    <mesh position={[0.45, 0.01, 0]} rotation={[0, 0, -Math.PI / 2 - 0.35]}><coneGeometry args={[0.04, 0.12, 6]} /><Mat color={C.beak} /></mesh>
    {/* Fanned tail */}
    <mesh position={[-0.38, 0, 0]} rotation={[0, 0, 0]} scale={[1, 0.18, 1]}><cylinderGeometry args={[0.2, 0.06, 0.22, 7, 1, false, Math.PI * 0.5, Math.PI]} /><Mat color={C.eagle} /></mesh>
    <group ref={wings}>
      {[1, -1].map((side) => <mesh key={side} geometry={wing} position={[0, 0.02, side * 0.06]} scale={[1, 1, side]} castShadow>
        <Mat color={C.eagle} />
      </mesh>)}
    </group>
  </group>;
}

/** Mushrooms on leaf litter, with microbes drawn as small dots (enlarged; bacteria are microscopic). */
export function Decomposers(_: CritterProps) {
  const microbes = useMemo(() => Array.from({ length: 9 }, (_, i) => [Math.cos(i * 2.3) * 0.45, 0.03, Math.sin(i * 2.3) * 0.32] as const), []);
  return <group>
    <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[0.62, 18]} /><Mat color={C.litter} rough={1} /></mesh>
    {[[0, 0, 1], [0.24, 0.12, 0.7], [-0.2, -0.14, 0.8]].map(([x, z, s]) => <group key={`${x}${z}`} position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.05, 0.07, 0.32, 8]} /><Mat color={C.mushroomStem} /></mesh>
      <mesh position={[0, 0.32, 0]} castShadow><sphereGeometry args={[0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><Mat color={C.mushroomCap} /></mesh>
    </group>)}
    {microbes.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.035, 6, 4]} /><Mat color={C.microbe} /></mesh>)}
  </group>;
}

/** Tall grass clump: the producer the grasshopper and rabbit eat. */
export function GrassClump(_: CritterProps) {
  const blades = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ x: Math.cos(i * 2.4) * (0.1 + (i % 5) * 0.08), z: Math.sin(i * 2.4) * (0.1 + (i % 5) * 0.07), h: 0.5 + (i % 4) * 0.14, r: i })), []);
  return <group>
    {blades.map((b) => <mesh key={b.r} position={[b.x, b.h / 2, b.z]} rotation={[Math.sin(b.r) * 0.25, b.r, Math.cos(b.r) * 0.25]} castShadow>
      <coneGeometry args={[0.035, b.h, 3]} /><Mat color={b.r % 3 ? C.meadowTall : C.leafLight} />
    </mesh>)}
  </group>;
}

/** Broad-leaved tree; the caterpillar and the bird sit in it. */
export function Tree({ animate }: CritterProps) {
  const crown = useRef<THREE.Group>(null);
  useIdle(animate, (t) => { if (crown.current) crown.current.rotation.z = 0.02 * Math.sin(t * 0.8); });
  return <group>
    <mesh position={[0, 1.1, 0]} castShadow><cylinderGeometry args={[0.13, 0.22, 2.2, 8]} /><Mat color={C.bark} rough={0.9} /></mesh>
    <mesh position={[0.55, 2.05, 0]} rotation={[0, 0, -1.0]} castShadow><cylinderGeometry args={[0.05, 0.08, 0.9, 6]} /><Mat color={C.bark} rough={0.9} /></mesh>
    <group ref={crown} position={[0, 2.2, 0]}>
      {[[0, 0.7, 0, 1], [-0.6, 0.35, 0.2, 0.75], [0.62, 0.3, -0.15, 0.7], [0.1, 0.35, 0.55, 0.65], [-0.1, 1.15, -0.2, 0.6]].map(([x, y, z, s], i) =>
        <mesh key={i} position={[x, y, z]} scale={s} castShadow><icosahedronGeometry args={[0.8, 1]} /><Mat color={i % 2 ? C.leafLight : C.leaf} rough={0.85} /></mesh>)}
    </group>
  </group>;
}

/** Shared wrapper: position, facing and a removed "ghost" look that keeps the place visible. */
export function Placed({ position, facing = 0, removed, children }: { position: [number, number, number]; facing?: number; removed: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    group.current?.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.transparent = removed;
      material.opacity = removed ? 0.18 : 1;
      material.depthWrite = !removed;
      material.needsUpdate = true;
      mesh.castShadow = !removed;
    });
    invalidate();
  }, [removed, invalidate]);
  return <group ref={group} position={position} rotation={[0, facing, 0]}>{children}</group>;
}
