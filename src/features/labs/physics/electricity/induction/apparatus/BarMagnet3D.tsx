import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { EmManual } from "../manual";
import { useBenchDrag } from "./drag";
import { LAYOUT, useEmAnim } from "./anim";
import { letterTexture } from "./canvas-textures";

const { axisY } = LAYOUT;
const { length, section, outsideCenterX, insideCenterX, railZ } = LAYOUT.magnet;
const RAIL_START = outsideCenterX - length / 2 - .25;
const RAIL_END = -LAYOUT.coil.length / 2 - .1;
const NORTH = "#b8322a", SOUTH = "#2c5a8c";

/**
 * Illustrative field lines of a bar magnet, traced once in the magnet's own
 * frame from two point poles. They are a picture, not model output.
 */
function traceFieldLines(): THREE.Vector3[][] {
  const pole = length * .41;
  const north = new THREE.Vector3(pole, 0, 0), south = new THREE.Vector3(-pole, 0, 0);
  const field = (p: THREE.Vector3, out: THREE.Vector3) => {
    const a = p.clone().sub(north), b = p.clone().sub(south);
    return out.copy(a.multiplyScalar(1 / Math.pow(a.length(), 3))).sub(b.multiplyScalar(1 / Math.pow(b.length(), 3)));
  };
  const lines: THREE.Vector3[][] = [];
  const seeds: THREE.Vector3[] = [];
  for (const cone of [1.45, 1.95]) for (let k = 0; k < 6; k++) {
    const around = (k / 6) * Math.PI * 2 + (cone > 1 ? Math.PI / 6 : 0);
    seeds.push(new THREE.Vector3(Math.cos(cone), Math.sin(cone) * Math.cos(around), Math.sin(cone) * Math.sin(around)));
  }
  const k1 = new THREE.Vector3(), k2 = new THREE.Vector3(), k3 = new THREE.Vector3(), k4 = new THREE.Vector3(), probe = new THREE.Vector3();
  const step = .022;
  const direction = (p: THREE.Vector3, out: THREE.Vector3) => field(p, out).normalize();
  for (const seed of seeds) {
    const point = north.clone().add(seed.clone().multiplyScalar(.06));
    const line = [point.clone()];
    for (let i = 0; i < 420; i++) {
      direction(point, k1);
      direction(probe.copy(point).addScaledVector(k1, step / 2), k2);
      direction(probe.copy(point).addScaledVector(k2, step / 2), k3);
      direction(probe.copy(point).addScaledVector(k3, step), k4);
      point.addScaledVector(k1.add(k2.multiplyScalar(2)).add(k3.multiplyScalar(2)).add(k4), step / 6);
      line.push(point.clone());
      if (point.distanceTo(south) < .07) { lines.push(line); break; }
      if (point.length() > 1.05) break;
    }
  }
  return lines;
}

function FieldLines({ visible }: { visible: boolean }) {
  const anim = useEmAnim();
  const lines = useMemo(traceFieldLines, []);
  const refs = useRef<Array<any>>([]);
  useFrame((_, delta) => {
    if (!visible || anim.current.reduced) return;
    for (const line of refs.current) if (line?.material) line.material.dashOffset -= delta * .22;
  });
  return <group visible={visible}>
    {lines.map((points, index) => <Line key={index} ref={(line) => { refs.current[index] = line; }} points={points}
      color="#2f6fb0" lineWidth={1.4} dashed dashSize={.05} gapSize={.03} transparent opacity={.6} depthWrite={false} />)}
  </group>;
}

/** The +x half faces the coil; `pole` says which pole that is (S only in free explore). */
export function BarMagnet3D({ showField, pole, actionable, onActivate, manual }: { showField: boolean; pole: "N" | "S"; actionable: boolean; onActivate: () => void; manual?: EmManual }) {
  const anim = useEmAnim();
  const magnet = useRef<THREE.Group>(null);
  const carriage = useRef<THREE.Group>(null);
  const letters = useMemo(() => ({ n: letterTexture("N", "#fff4ef"), s: letterTexture("S", "#eef4fb") }), []);
  useEffect(() => () => { letters.n.dispose(); letters.s.dispose(); }, [letters]);
  useFrame(() => {
    const x = THREE.MathUtils.lerp(outsideCenterX, insideCenterX, anim.current.travel);
    if (magnet.current) magnet.current.position.x = x;
    if (carriage.current) carriage.current.position.x = x - length / 2 + .14;
  });
  const half = length / 2;
  const face = (texture: THREE.Texture, x: number) => <>
    <mesh position={[x, section / 2 + .001, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[.12, .12]} /><meshStandardMaterial map={texture} transparent roughness={.6} depthWrite={false} /></mesh>
    <mesh position={[x, 0, section / 2 + .001]}><planeGeometry args={[.12, .12]} /><meshStandardMaterial map={texture} transparent roughness={.6} depthWrite={false} /></mesh>
  </>;
  // Dragging slides the magnet along its rail; the grab offset keeps it from jumping to the pointer.
  const grab = useRef(0);
  const drag = useBenchDrag({
    manual, kind: "magnet", planeY: axisY,
    onGrab: (point) => { grab.current = point.x - THREE.MathUtils.lerp(outsideCenterX, insideCenterX, anim.current.travel); },
    onMove: (point) => manual?.update((point.x - grab.current - outsideCenterX) / (insideCenterX - outsideCenterX)),
    onClick: () => { if (actionable) onActivate(); },
  });
  const { enabled: draggable, ...dragHandlers } = drag;
  const pointer = draggable ? dragHandlers : {
    onClick: (event: any) => { event.stopPropagation(); if (actionable) onActivate(); else manual?.blocked("magnet"); },
    onPointerOver: () => { document.body.style.cursor = actionable ? "pointer" : "help"; },
    onPointerOut: () => { document.body.style.cursor = "auto"; },
  };
  return <group>
    {/* Aluminium rail beside the coil axis */}
    <mesh position={[(RAIL_START + RAIL_END) / 2, .045, railZ]} castShadow receiveShadow>
      <boxGeometry args={[RAIL_END - RAIL_START, .05, .09]} />
      <meshStandardMaterial color="#aeb6ba" metalness={.85} roughness={.32} />
    </mesh>
    {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[RAIL_START + .1 + i * ((RAIL_END - RAIL_START - .2) / 8), .071, railZ + .046]}>
      <boxGeometry args={[.004, .002, .02]} /><meshBasicMaterial color="#3e4649" />
    </mesh>)}
    {/* Carriage, post and clamp arm hold the magnet by its S end */}
    <group ref={carriage} {...pointer}>
      <mesh position={[0, .09, railZ]} castShadow><boxGeometry args={[.16, .06, .13]} /><meshStandardMaterial color="#384046" roughness={.45} metalness={.3} /></mesh>
      <mesh position={[0, (axisY + .09) / 2, railZ]} castShadow><cylinderGeometry args={[.016, .016, axisY - .09, 12]} /><meshStandardMaterial color="#c3cacd" metalness={.9} roughness={.25} /></mesh>
      <mesh position={[0, axisY, railZ / 2 - section / 4]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[.013, .013, -railZ - section / 2, 12]} /><meshStandardMaterial color="#c3cacd" metalness={.9} roughness={.25} /></mesh>
    </group>
    <group ref={magnet} position={[outsideCenterX, axisY, 0]} {...pointer}>
      <RoundedBox args={[half, section, section]} radius={.012} smoothness={3} position-x={half / 2} castShadow receiveShadow>
        <meshStandardMaterial color={pole === "N" ? NORTH : SOUTH} roughness={.42} metalness={.25} />
      </RoundedBox>
      <RoundedBox args={[half, section, section]} radius={.012} smoothness={3} position-x={-half / 2} castShadow receiveShadow>
        <meshStandardMaterial color={pole === "N" ? SOUTH : NORTH} roughness={.42} metalness={.25} />
      </RoundedBox>
      {face(pole === "N" ? letters.n : letters.s, half - .12)}
      {face(pole === "N" ? letters.s : letters.n, -half + .12)}
      {/* A half turn about y keeps the lines leaving N and entering S; a negative scale would cull the line quads */}
      <group rotation-y={pole === "N" ? 0 : Math.PI}><FieldLines visible={showField} /></group>
    </group>
  </group>;
}
