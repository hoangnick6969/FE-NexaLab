import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { ECO_MOTION } from "./eco-motion";
import { ECO_COLORS, waterTint } from "./eco-palette";
import { useEcoQuality } from "./eco-quality";
import { paint, seeded, soilBlock } from "./procedural";

/** Diorama layout (1 unit ≈ 10 cm, not to scale): a pond cut open at the front, between two banks. */
export const POND = {
  water: { x: 5.6, z: 2 },
  floor: -2,
  surface: 1.2,
  bankTop: 1.5,
  base: -3.2,
  bankWidth: 2,
} as const;

const color = (hex: string) => new THREE.Color(hex);
const WHITE = new THREE.Color("#ffffff");

const strataBox = (width: number, height: number, depth: number, centerY: number, grassTop: boolean) =>
  soilBlock(width, height, depth, centerY, { top: POND.bankTop, base: POND.base, grass: grassTop });

function Earth() {
  const { water, bankTop, base, bankWidth } = POND;
  const parts = useMemo(() => {
    const height = bankTop - base, centerY = (bankTop + base) / 2;
    const depth = water.z * 2 + 1.2;
    return [
      { geometry: strataBox(bankWidth, height, depth, centerY, true), position: [-(water.x + bankWidth / 2), 0, -0.6] as const },
      { geometry: strataBox(bankWidth, height, depth, centerY, true), position: [water.x + bankWidth / 2, 0, -0.6] as const },
      { geometry: strataBox(water.x * 2, height, 1.2, centerY, true), position: [0, 0, -(water.z + 0.6)] as const },
      { geometry: strataBox(water.x * 2, POND.floor - base, water.z * 2, (POND.floor + base) / 2, false), position: [0, 0, 0] as const },
    ];
  }, []);
  useEffect(() => () => parts.forEach((part) => part.geometry.dispose()), [parts]);
  return <group>
    {parts.map((part, i) => <mesh key={i} geometry={part.geometry} position={part.position} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>)}
  </group>;
}

/** Muddy pond floor with a few pebbles. */
function Floor() {
  const { geometry, pebbles } = useMemo(() => {
    const g = new THREE.PlaneGeometry(POND.water.x * 2, POND.water.z * 2, 56, 20).rotateX(-Math.PI / 2);
    const position = g.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      position.setY(i, Math.sin(x * 1.3) * Math.cos(z * 1.7) * 0.06 + Math.sin(x * 3.1 + z * 2.2) * 0.025);
    }
    g.computeVertexNormals();
    const mud = color(ECO_COLORS.mud), c = new THREE.Color();
    paint(g, ({ y }) => c.copy(mud).multiplyScalar(0.9 + y * 2.2));
    const rand = seeded(11);
    const pebbles = Array.from({ length: 46 }, () => ({ x: (rand() - 0.5) * (POND.water.x * 2 - 0.6), z: (rand() - 0.5) * (POND.water.z * 2 - 0.4), s: 0.06 + rand() * 0.12, r: rand() * 6 }));
    return { geometry: g, pebbles };
  }, []);
  const stones = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const dummy = new THREE.Object3D();
    pebbles.forEach((p, i) => {
      dummy.position.set(p.x, POND.floor + 0.03, p.z); dummy.rotation.set(p.r, p.r * 2, 0); dummy.scale.set(p.s * 1.4, p.s * 0.7, p.s);
      dummy.updateMatrix(); stones.current?.setMatrixAt(i, dummy.matrix);
    });
    if (stones.current) stones.current.instanceMatrix.needsUpdate = true;
  }, [pebbles]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group>
    <mesh geometry={geometry} position={[0, POND.floor, 0]} receiveShadow><meshStandardMaterial vertexColors roughness={1} /></mesh>
    <instancedMesh ref={stones} args={[undefined, undefined, pebbles.length]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={ECO_COLORS.pebble} roughness={0.8} flatShading />
    </instancedMesh>
  </group>;
}

/** Light patterns on the floor; drawn additively, procedural (no texture). */
function Caustics({ animate, strength }: { animate: boolean; strength: number }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uStrength: { value: strength }, uColor: { value: new THREE.Color("#fff6d8") } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uStrength; uniform vec3 uColor;
      float ridge(float v) { return 1.0 - smoothstep(0.0, 0.2, abs(sin(v))); }
      void main() {
        vec2 p = vUv * vec2(11.2, 4.0) * 1.3;
        vec2 q = p + 0.4 * vec2(sin(p.y * 1.6 + uTime * 0.7), sin(p.x * 1.4 - uTime * 0.6));
        q += 0.18 * vec2(sin(q.y * 3.0 - uTime * 1.0), sin(q.x * 2.6 + uTime * 0.8));
        float c = ridge(q.x * 2.1) + ridge(q.y * 2.3) + ridge((q.x - q.y) * 1.5);
        c = pow(c / 3.0 * 1.5, 2.0);
        float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        gl_FragColor = vec4(uColor * c * uStrength * edge, 1.0);
      }`,
  }), []);
  useEffect(() => { material.uniforms.uStrength.value = strength; }, [material, strength]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, delta) => { if (animate) material.uniforms.uTime.value += Math.min(delta, 0.1); });
  return <mesh position={[0, POND.floor + 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} material={material} renderOrder={0}>
    <planeGeometry args={[POND.water.x * 2 - 0.1, POND.water.z * 2 - 0.1]} />
  </mesh>;
}

/** Weed blades on the floor, bent by a vertex shader. */
function Weeds({ animate }: { animate: boolean }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const { geometry, material, blades } = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.16, 1, 1, 10).translate(0, 0.5, 0);
    const position = g.getAttribute("position");
    for (let i = 0; i < position.count; i++) position.setX(i, position.getX(i) * (1 - position.getY(i) * 0.75));
    g.computeVertexNormals();
    const base = color(ECO_COLORS.weed), tip = color(ECO_COLORS.weedTip), c = new THREE.Color();
    paint(g, ({ y }) => c.copy(base).lerp(tip, y));
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;").replace("#include <begin_vertex>", `#include <begin_vertex>
        float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
        float bend = position.y * position.y;
        transformed.x += sin(uTime * 1.1 + ph) * 0.16 * bend;
        transformed.z += cos(uTime * 0.8 + ph) * 0.08 * bend;`);
    };
    const rand = seeded(23);
    const blades = Array.from({ length: 40 }, (_, i) => {
      const side = i % 4 === 0 ? 0 : i % 2 ? -1 : 1;
      const x = side === 0 ? (rand() - 0.5) * 6 : side * (POND.water.x - 0.4 - rand() * 2.2);
      return { x, z: -POND.water.z + 0.25 + rand() * (side === 0 ? 0.6 : 3.2), h: 1.2 + rand() * 1.6, r: rand() * Math.PI };
    });
    return { geometry: g, material: m, blades };
  }, [uniforms]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const dummy = new THREE.Object3D();
    blades.forEach((b, i) => { dummy.position.set(b.x, POND.floor, b.z); dummy.rotation.set(0, b.r, 0); dummy.scale.set(1, b.h, 1); dummy.updateMatrix(); mesh.current?.setMatrixAt(i, dummy.matrix); });
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  }, [blades]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame((_, delta) => { if (animate) uniforms.uTime.value += Math.min(delta, 0.1) * ECO_MOTION.sway; });
  return <instancedMesh ref={mesh} args={[geometry, material, blades.length]} castShadow frustumCulled={false} />;
}

/** Grass tufts and reeds with cattails on the banks. */
function BankPlants() {
  const { grass: count } = useEcoQuality();
  const { tufts, reeds } = useMemo(() => {
    const rand = seeded(31);
    const tufts = Array.from({ length: count }, () => {
      const zone = rand();
      const x = zone < 0.35 ? -(POND.water.x + 0.1 + rand() * (POND.bankWidth - 0.2)) : zone < 0.7 ? POND.water.x + 0.1 + rand() * (POND.bankWidth - 0.2) : (rand() - 0.5) * POND.water.x * 2;
      const z = zone < 0.7 ? -POND.water.z - 1.1 + rand() * (POND.water.z * 2 + 1) : -POND.water.z - 0.1 - rand() * 1;
      return { x, z, h: 0.18 + rand() * 0.28, tint: 0.75 + rand() * 0.35 };
    });
    const reeds = Array.from({ length: 16 }, (_, i) => {
      const left = i < 8;
      return { x: (left ? -1 : 1) * (POND.water.x + 0.18 + rand() * 0.5), z: -POND.water.z + 0.2 + rand() * (POND.water.z * 2 - 0.6), h: 1.1 + rand() * 0.9, lean: (rand() - 0.5) * 0.25 };
    });
    return { tufts, reeds };
  }, [count]);
  const reedGeometry = useMemo(() => new THREE.CylinderGeometry(0.018, 0.03, 1, 5, 1).translate(0, 0.5, 0), []);
  useEffect(() => () => reedGeometry.dispose(), [reedGeometry]);
  const grassMesh = useRef<THREE.InstancedMesh>(null);
  const reedMesh = useRef<THREE.InstancedMesh>(null);
  const headMesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const dummy = new THREE.Object3D(), c = new THREE.Color(), base = color(ECO_COLORS.grassDark);
    tufts.forEach((t, i) => {
      dummy.position.set(t.x, POND.bankTop + t.h / 2, t.z); dummy.rotation.set(0, i, 0); dummy.scale.set(1, t.h / 0.35, 1); dummy.updateMatrix();
      grassMesh.current?.setMatrixAt(i, dummy.matrix); grassMesh.current?.setColorAt(i, c.copy(base).multiplyScalar(t.tint));
    });
    reeds.forEach((r, i) => {
      dummy.position.set(r.x, POND.bankTop, r.z); dummy.rotation.set(r.lean, 0, r.lean * 0.6); dummy.scale.set(1, r.h, 1); dummy.updateMatrix();
      reedMesh.current?.setMatrixAt(i, dummy.matrix);
      const top = new THREE.Vector3(0, r.h * 0.86, 0).applyEuler(dummy.rotation).add(dummy.position);
      dummy.position.copy(top); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      headMesh.current?.setMatrixAt(i, dummy.matrix);
    });
    [grassMesh, reedMesh, headMesh].forEach((m) => { if (m.current) { m.current.instanceMatrix.needsUpdate = true; if (m.current.instanceColor) m.current.instanceColor.needsUpdate = true; } });
  }, [tufts, reeds]);
  return <group>
    <instancedMesh ref={grassMesh} args={[undefined, undefined, tufts.length]} frustumCulled={false}>
      <coneGeometry args={[0.06, 0.35, 4]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
    <instancedMesh ref={reedMesh} args={[undefined, undefined, reeds.length]} castShadow frustumCulled={false}>
      <primitive object={reedGeometry} attach="geometry" />
      <meshStandardMaterial color={ECO_COLORS.reed} roughness={0.8} />
    </instancedMesh>
    <instancedMesh ref={headMesh} args={[undefined, undefined, reeds.length]} castShadow frustumCulled={false}>
      <capsuleGeometry args={[0.05, 0.22, 4, 8]} />
      <meshStandardMaterial color={ECO_COLORS.cattail} roughness={0.9} />
    </instancedMesh>
  </group>;
}

/** Lily pads: x, z, radius. */
const PADS = [[-3.1, -0.6, 0.5], [-2.2, 0.7, 0.36], [2.6, -0.9, 0.46], [3.5, 0.3, 0.32], [0.4, -1.2, 0.4]] as const;

/** Soft round sprite for steam. */
function puffTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Water: a tinted front pane (the cut), a rippling surface, lily pads, steam on hot
 * water and a frosted surface on cold water. Everything follows the temperature only.
 */
function Water({ valueDeciC, animate }: { valueDeciC: number; animate: boolean }) {
  const { surface: [sx, sz] } = useEcoQuality();
  const invalidate = useThree((state) => state.invalidate);
  const surfaceGeometry = useMemo(() => new THREE.PlaneGeometry(POND.water.x * 2, POND.water.z * 2, sx, sz).rotateX(-Math.PI / 2), [sx, sz]);
  const rest = useMemo(() => Float32Array.from(surfaceGeometry.getAttribute("position").array), [surfaceGeometry]);
  const surfaceMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const paneMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const shown = useRef(valueDeciC);
  const time = useRef(0);
  const padGroup = useRef<THREE.Group>(null);
  const texture = useMemo(puffTexture, []);
  const steam = useRef<THREE.Group>(null);
  const puffs = useMemo(() => { const rand = seeded(41); return Array.from({ length: 12 }, () => ({ x: (rand() - 0.5) * 9, z: (rand() - 0.5) * 3, o: rand() })); }, []);
  const tint = useMemo(() => new THREE.Color(), []);
  useEffect(() => () => { surfaceGeometry.dispose(); texture.dispose(); }, [surfaceGeometry, texture]);
  useEffect(() => { invalidate(); }, [valueDeciC, invalidate]);

  const ripple = (t: number) => {
    const position = surfaceGeometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const x = rest[i * 3], z = rest[i * 3 + 2];
      position.setY(i, 0.035 * Math.sin(x * 1.7 + t * 1.3) + 0.022 * Math.sin(z * 2.3 - t * 1.1 + x * 0.6));
    }
    position.needsUpdate = true;
    surfaceGeometry.computeVertexNormals();
  };
  useEffect(() => ripple(0), [surfaceGeometry]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const k = animate ? 1 - Math.exp(-ECO_MOTION.valueLambda * dt) : 1;
    shown.current += (valueDeciC - shown.current) * k;
    const v = shown.current;
    const frost = THREE.MathUtils.smoothstep(v, 70, 10), heat = THREE.MathUtils.smoothstep(v, 360, 460);
    waterTint(v, tint);
    if (paneMaterial.current) { paneMaterial.current.color.copy(tint); paneMaterial.current.opacity = 0.34 + frost * 0.15; }
    if (surfaceMaterial.current) {
      surfaceMaterial.current.color.copy(tint).lerp(WHITE, 0.08 + frost * 0.7);
      surfaceMaterial.current.opacity = 0.26 + frost * 0.55;
      surfaceMaterial.current.roughness = 0.08 + frost * 0.5;
    }
    if (animate) {
      time.current += dt;
      ripple(time.current);
      padGroup.current?.children.forEach((pad, i) => { pad.position.y = POND.surface + 0.03 + 0.025 * Math.sin(time.current * 1.2 + i * 1.7); pad.rotation.y += dt * 0.03 * (i % 2 ? 1 : -1); });
    }
    steam.current?.children.forEach((puff, i) => {
      const p = puffs[i];
      const life = animate ? (time.current * 0.18 + p.o) % 1 : p.o;
      puff.position.set(p.x + Math.sin(life * 4 + i) * 0.2, POND.surface + 0.2 + life * 1.8, p.z);
      puff.scale.setScalar(0.6 + life * 1.1);
      ((puff as THREE.Sprite).material as THREE.SpriteMaterial).opacity = heat * 0.32 * Math.sin(life * Math.PI);
    });
    if (animate || Math.abs(valueDeciC - v) > 0.5) state.invalidate();
  });

  return <group>
    {/* The cut face: tinted water seen through the front of the diorama */}
    <mesh position={[0, (POND.surface + POND.floor) / 2, POND.water.z]} renderOrder={2}>
      <planeGeometry args={[POND.water.x * 2, POND.surface - POND.floor]} />
      <meshStandardMaterial ref={paneMaterial} transparent depthWrite={false} roughness={0.05} metalness={0} />
    </mesh>
    <mesh geometry={surfaceGeometry} position={[0, POND.surface, 0]} receiveShadow renderOrder={3}>
      <meshStandardMaterial ref={surfaceMaterial} transparent depthWrite={false} roughness={0.08} metalness={0} envMapIntensity={1.4} side={THREE.DoubleSide} />
    </mesh>
    <group ref={padGroup}>
      {PADS.map(([x, z, r], i) => <mesh key={i} position={[x, POND.surface + 0.03, z]} rotation={[-Math.PI / 2, 0, i * 1.3]} castShadow>
        <circleGeometry args={[r, 22, 0.35, Math.PI * 2 - 0.35]} />
        <meshStandardMaterial color={ECO_COLORS.lily} roughness={0.55} side={THREE.DoubleSide} />
      </mesh>)}
    </group>
    <group position={[-2.2, POND.surface + 0.12, 0.7]}>
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[Math.cos(i) * 0.08, 0, Math.sin(i) * 0.08]} rotation={[0.6, i, 0]} scale={[0.05, 0.12, 0.05]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={ECO_COLORS.lilyFlower} roughness={0.6} />
      </mesh>)}
    </group>
    <group ref={steam}>
      {puffs.map((_, i) => <sprite key={i}><spriteMaterial map={texture} transparent depthWrite={false} opacity={0} /></sprite>)}
    </group>
  </group>;
}

/**
 * The K8 pond diorama: banks, soil layers, floor, weeds, caustics and water.
 * Purely visual; the activity owns every value it shows.
 */
export function PondDiorama3D({ valueDeciC, animate, dark }: { valueDeciC: number; animate: boolean; dark: boolean }) {
  const { caustics } = useEcoQuality();
  return <group>
    <Earth />
    <Floor />
    {caustics && <Caustics animate={animate} strength={dark ? 0.16 : 0.26} />}
    <Weeds animate={animate} />
    <BankPlants />
    <Water valueDeciC={valueDeciC} animate={animate} />
    <ContactShadows position={[0, POND.base - 0.02, -0.3]} scale={[22, 12]} blur={2.6} far={3} opacity={dark ? 0.6 : 0.4} frames={1} />
  </group>;
}
