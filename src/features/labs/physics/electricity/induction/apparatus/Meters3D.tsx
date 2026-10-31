import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { angleDelta, type EmManual } from "../manual";
import { useBenchDrag } from "./drag";
import { LAYOUT, useEmAnim } from "./anim";
import { boardLabelTexture, dialTexture, glowTexture } from "./canvas-textures";

const MAX_NEEDLE = .6; // radians at full illustrative level
const BODY = { width: .62, height: .46, depth: .2 };

/** Zero-centre galvanometer; the needle is a damped spring chasing the illustrative level. */
export function Galvanometer3D() {
  const anim = useEmAnim();
  const needle = useRef<THREE.Group>(null);
  const motion = useRef({ angle: 0, velocity: 0 });
  const dial = useMemo(dialTexture, []);
  useEffect(() => () => dial.dispose(), [dial]);
  useFrame((_, delta) => {
    const target = -anim.current.level * MAX_NEEDLE;
    const state = motion.current;
    if (anim.current.reduced) {
      state.angle = target;
      state.velocity = 0;
    } else {
      // Slightly under-damped: a real moving-coil needle overshoots a little, then settles.
      const stiffness = 140, damping = 2 * Math.sqrt(stiffness) * .5;
      let remaining = Math.min(delta, .05);
      while (remaining > 0) {
        const dt = Math.min(remaining, 1 / 240);
        state.velocity += (stiffness * (target - state.angle) - damping * state.velocity) * dt;
        state.angle += state.velocity * dt;
        remaining -= dt;
      }
    }
    if (needle.current) needle.current.rotation.z = state.angle;
  });
  const [x, y, z] = LAYOUT.galvanometer.position;
  return <group position={[x, y + BODY.height / 2, z]} rotation-y={LAYOUT.galvanometer.rotationY}>
    <group rotation-x={-.1}>
      <RoundedBox args={[BODY.width, BODY.height, BODY.depth]} radius={.03} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#1f2326" roughness={.62} metalness={.08} />
      </RoundedBox>
      {/* Bezel, dial and cover glass */}
      <mesh position={[0, .045, BODY.depth / 2 + .002]}><planeGeometry args={[.54, .34]} /><meshStandardMaterial color="#0f1214" roughness={.4} /></mesh>
      <mesh position={[0, .045, BODY.depth / 2 + .004]}><planeGeometry args={[.5, .31]} /><meshStandardMaterial map={dial} roughness={.75} /></mesh>
      <group ref={needle} position={[0, .045 - .155 + .027, BODY.depth / 2 + .012]}>
        <mesh position-y={.1}><boxGeometry args={[.005, .2, .002]} /><meshStandardMaterial color="#b3261e" roughness={.4} /></mesh>
        <mesh position-y={-.012}><boxGeometry args={[.016, .024, .003]} /><meshStandardMaterial color="#1c1c1c" /></mesh>
        <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[.012, .012, .006, 16]} /><meshStandardMaterial color="#2a2a2a" metalness={.6} roughness={.3} /></mesh>
      </group>
      <mesh position={[0, .045, BODY.depth / 2 + .02]}><planeGeometry args={[.5, .31]} /><meshStandardMaterial color="#ffffff" transparent opacity={.08} roughness={.05} metalness={.1} depthWrite={false} /></mesh>
      {/* Zero-adjust screw */}
      <mesh position={[0, -.17, BODY.depth / 2 + .004]} rotation-x={Math.PI / 2}><cylinderGeometry args={[.022, .022, .01, 20]} /><meshStandardMaterial color="#3a3f42" metalness={.7} roughness={.35} /></mesh>
      {/* Binding posts on top */}
      {[-.18, .18].map((px, index) => <group key={px} position={[px, BODY.height / 2 + .03, .02]}>
        <mesh castShadow><cylinderGeometry args={[.026, .03, .06, 16]} /><meshStandardMaterial color={index ? "#b72d24" : "#25292c"} roughness={.35} /></mesh>
        <mesh position-y={.04}><cylinderGeometry args={[.012, .012, .03, 10]} /><meshStandardMaterial color="#c9952f" metalness={.9} roughness={.25} /></mesh>
      </group>)}
    </group>
  </group>;
}

function Led({ color, sign, x }: { color: string; sign: 1 | -1; x: number }) {
  const anim = useEmAnim();
  const body = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.Sprite>(null);
  const glow = useMemo(glowTexture, []);
  const brightness = useRef(0);
  useEffect(() => () => glow.dispose(), [glow]);
  useFrame((_, delta) => {
    const target = Math.max(0, sign * anim.current.level) > .08 ? Math.min(1, Math.abs(anim.current.level) * 1.4) : 0;
    brightness.current = anim.current.reduced ? target : THREE.MathUtils.damp(brightness.current, target, target > brightness.current ? 28 : 10, delta);
    if (body.current) body.current.emissiveIntensity = brightness.current * 3.2;
    if (halo.current) {
      (halo.current.material as THREE.SpriteMaterial).opacity = brightness.current * .85;
      halo.current.scale.setScalar(.16 + brightness.current * .1);
    }
  });
  return <group position={[x, 0, -.03]}>
    {[-.012, .012].map((lx) => <mesh key={lx} position={[lx, .045, 0]}><cylinderGeometry args={[.003, .003, .05, 6]} /><meshStandardMaterial color="#cfd5d8" metalness={.9} roughness={.25} /></mesh>)}
    <mesh position-y={.1} castShadow><cylinderGeometry args={[.03, .032, .06, 24]} /><meshStandardMaterial ref={body} color={color} emissive={color} emissiveIntensity={0} roughness={.25} transparent opacity={.92} /></mesh>
    <mesh position-y={.13}><sphereGeometry args={[.03, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0} roughness={.2} transparent opacity={.85} /></mesh>
    <mesh position-y={.072}><cylinderGeometry args={[.036, .036, .008, 24]} /><meshStandardMaterial color={color} roughness={.3} /></mesh>
    <sprite ref={halo} position-y={.12} scale={.16}>
      <spriteMaterial map={glow} color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
  </group>;
}

/** Two LEDs in inverse parallel: A lights for direction D1, B for D2. */
export function LedPair3D() {
  const label = useMemo(boardLabelTexture, []);
  useEffect(() => () => label.dispose(), [label]);
  const [x, y, z] = LAYOUT.leds.position;
  return <group position={[x, y, z]} rotation-y={LAYOUT.leds.rotationY}>
    <mesh position-y={.017} castShadow receiveShadow><boxGeometry args={[.44, .03, .28]} /><meshStandardMaterial map={label} roughness={.55} /></mesh>
    <group position-y={.032}>
      <Led color="#e8463b" sign={1} x={-.11} />
      <Led color="#3fbf6a" sign={-1} x={.11} />
      {[-.18, .18].map((px) => <mesh key={px} position={[px, .025, .09]} castShadow><cylinderGeometry args={[.02, .024, .05, 14]} /><meshStandardMaterial color="#c9952f" metalness={.9} roughness={.25} /></mesh>)}
    </group>
  </group>;
}

/** Model generator: a two-pole magnet on a vertical shaft beside the coil, turned by a crank. */
export function Generator3D({ actionable, onActivate, manual }: { actionable: boolean; onActivate: () => void; manual?: EmManual }) {
  const anim = useEmAnim();
  const rotor = useRef<THREE.Group>(null);
  useFrame(() => { if (rotor.current) rotor.current.rotation.y = -anim.current.rotor; });
  const { x, z } = LAYOUT.generator;
  const axisY = LAYOUT.axisY;
  // Turning by hand: the pointer angle around the shaft, at crank height. Clockwise seen from above
  // (rotation.y decreasing) is the positive turn, as in the automatic crank.
  const turn = useRef({ last: 0, total: 0 });
  const angleOf = (point: THREE.Vector3) => Math.atan2(-(point.z - z), point.x - x);
  const drag = useBenchDrag({
    manual, kind: "crank", planeY: .94,
    onGrab: (point) => { turn.current = { last: angleOf(point), total: 0 }; },
    onMove: (point) => {
      const angle = angleOf(point);
      turn.current.total -= angleDelta(turn.current.last, angle);
      turn.current.last = angle;
      manual?.update(turn.current.total);
    },
    onClick: () => { if (actionable) onActivate(); },
  });
  const { enabled: draggable, ...dragHandlers } = drag;
  const pointer = draggable ? dragHandlers : {
    onClick: (event: any) => { event.stopPropagation(); if (actionable) onActivate(); else manual?.blocked("crank"); },
    onPointerOver: () => { document.body.style.cursor = actionable ? "pointer" : "help"; },
    onPointerOut: () => { document.body.style.cursor = "auto"; },
  };
  return <group position={[x, 0, z]}>
    <mesh position-y={.04} castShadow receiveShadow><boxGeometry args={[.42, .04, .42]} /><meshStandardMaterial color="#3b4246" roughness={.5} metalness={.3} /></mesh>
    {/* Fork frame holding the shaft above and below the rotor */}
    <mesh position={[0, .45, -.19]} castShadow><boxGeometry args={[.05, .82, .04]} /><meshStandardMaterial color="#59636a" metalness={.6} roughness={.35} /></mesh>
    <mesh position={[0, .84, -.08]} castShadow><boxGeometry args={[.05, .04, .26]} /><meshStandardMaterial color="#59636a" metalness={.6} roughness={.35} /></mesh>
    <mesh position={[0, .08, -.08]} castShadow><boxGeometry args={[.05, .04, .26]} /><meshStandardMaterial color="#59636a" metalness={.6} roughness={.35} /></mesh>
    <group ref={rotor} {...pointer}>
      <mesh position-y={.46}><cylinderGeometry args={[.012, .012, .8, 12]} /><meshStandardMaterial color="#cfd5d8" metalness={.95} roughness={.2} /></mesh>
      {[.1, .82].map((by) => <mesh key={by} position-y={by}><cylinderGeometry args={[.026, .026, .03, 16]} /><meshStandardMaterial color="#b8862a" metalness={.9} roughness={.3} /></mesh>)}
      {/* N half points at the coil when the angle is 0 */}
      <RoundedBox args={[.25, .1, .1]} radius={.01} smoothness={3} position={[-.125, axisY, 0]} castShadow><meshStandardMaterial color="#b8322a" roughness={.42} metalness={.25} /></RoundedBox>
      <RoundedBox args={[.25, .1, .1]} radius={.01} smoothness={3} position={[.125, axisY, 0]} castShadow><meshStandardMaterial color="#2c5a8c" roughness={.42} metalness={.25} /></RoundedBox>
      {/* Crank arm and handle */}
      <mesh position={[.11, .88, 0]} castShadow><boxGeometry args={[.24, .025, .04]} /><meshStandardMaterial color="#2a2f33" roughness={.4} metalness={.5} /></mesh>
      <mesh position={[.22, .94, 0]} castShadow><cylinderGeometry args={[.022, .022, .12, 14]} /><meshStandardMaterial color="#8a5a33" roughness={.55} /></mesh>
      <mesh position={[.22, 1.01, 0]} castShadow><sphereGeometry args={[.03, 16, 12]} /><meshStandardMaterial color="#8a5a33" roughness={.5} /></mesh>
      {/* Invisible, larger grip around the handle so it is easy to grab with a finger */}
      <mesh position={[.2, .95, 0]} visible={false}><sphereGeometry args={[.12, 12, 8]} /><meshBasicMaterial /></mesh>
    </group>
  </group>;
}
