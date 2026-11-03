import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ContactShadows } from "@react-three/drei";
import { ECO_COLORS } from "./eco-palette";
import { useEcoQuality } from "./eco-quality";
import { seeded, soilBlock } from "./procedural";

/** Meadow layout (scene units, not to scale): a block of ground cut open at the front. */
export const MEADOW = { x: 8, z: 3, top: 0, base: -1.8 } as const;

/** Grass tufts scattered over the top, kept off the given clear spots. */
function Tufts({ clear }: { clear: Array<[number, number, number]> }) {
  const { grass } = useEcoQuality();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const tufts = useMemo(() => {
    const rand = seeded(53);
    const out: Array<{ x: number; z: number; h: number; tint: number }> = [];
    while (out.length < grass * 2) {
      const x = (rand() - 0.5) * (MEADOW.x * 2 - 0.4), z = (rand() - 0.5) * (MEADOW.z * 2 - 0.4);
      if (clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) continue;
      out.push({ x, z, h: 0.12 + rand() * 0.22, tint: 0.8 + rand() * 0.35 });
    }
    return out;
  }, [grass, clear]);
  useEffect(() => {
    const dummy = new THREE.Object3D(), c = new THREE.Color(), base = new THREE.Color(ECO_COLORS.meadowTall);
    tufts.forEach((t, i) => {
      dummy.position.set(t.x, MEADOW.top + t.h / 2, t.z); dummy.rotation.set(0, i, 0); dummy.scale.set(1, t.h / 0.3, 1); dummy.updateMatrix();
      mesh.current?.setMatrixAt(i, dummy.matrix); mesh.current?.setColorAt(i, c.copy(base).multiplyScalar(t.tint));
    });
    if (mesh.current) { mesh.current.instanceMatrix.needsUpdate = true; if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true; }
  }, [tufts]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, tufts.length]} frustumCulled={false}>
    <coneGeometry args={[0.05, 0.3, 4]} />
    <meshStandardMaterial roughness={0.9} />
  </instancedMesh>;
}

/**
 * The K8 meadow diorama: a ground block cut open to show the soil, grass tufts,
 * a small puddle and stones. Purely visual; organisms are placed by the caller.
 */
export function MeadowDiorama3D({ dark, puddle, clear = [] }: {
  dark: boolean;
  /** x, z, radius of a small puddle (for the frog). */
  puddle?: [number, number, number];
  /** x, z, radius spots kept free of tufts (organisms, the tree). */
  clear?: Array<[number, number, number]>;
}) {
  const ground = useMemo(() => soilBlock(MEADOW.x * 2, MEADOW.top - MEADOW.base, MEADOW.z * 2, (MEADOW.top + MEADOW.base) / 2, { top: MEADOW.top, base: MEADOW.base, grass: true }), []);
  useEffect(() => () => ground.dispose(), [ground]);
  const stones = useMemo(() => { const rand = seeded(61); return Array.from({ length: 10 }, () => ({ x: (rand() - 0.5) * 14, z: (rand() - 0.5) * 5, s: 0.08 + rand() * 0.12, r: rand() * 6 })); }, []);
  const clearAll = useMemo(() => (puddle ? [...clear, puddle] : clear), [clear, puddle]);
  return <group>
    <mesh geometry={ground} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
    <Tufts clear={clearAll} />
    {puddle && <mesh position={[puddle[0], MEADOW.top + 0.012, puddle[1]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[puddle[2], 28]} />
      <meshStandardMaterial color={ECO_COLORS.puddle} roughness={0.08} metalness={0.1} />
    </mesh>}
    {stones.map((s, i) => <mesh key={i} position={[s.x, MEADOW.top + s.s * 0.3, s.z]} rotation={[s.r, s.r * 2, 0]} scale={[s.s * 1.4, s.s * 0.7, s.s]} castShadow>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={ECO_COLORS.pebble} roughness={0.8} flatShading />
    </mesh>)}
    <ContactShadows position={[0, MEADOW.base - 0.02, 0]} scale={[22, 10]} blur={2.6} far={3} opacity={dark ? 0.6 : 0.4} frames={1} />
  </group>;
}
