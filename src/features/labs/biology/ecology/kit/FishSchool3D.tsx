import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { ECO_MOTION } from "./eco-motion";
import { useEcoQuality } from "./eco-quality";
import { createTilapiaGeometry } from "./fish-geometry";
import { POND } from "./PondDiorama3D";

/**
 * neutral: before the learner's prediction is checked (still, grey); swimming;
 * heat / cold: the model says the species cannot persist at this temperature.
 * Heat: the school crowds the surface gasping, flushes, then sinks and lies on the floor.
 * Cold: the school slows, sinks and rests on the floor, pale and frosted. Never belly-up.
 */
export type FishMood = "neutral" | "swimming" | "heat" | "cold";
type Stress = "heat" | "cold";

const TARGET: Record<FishMood, { swim: number; desat: number }> = {
  neutral: { swim: 0, desat: 1 },
  swimming: { swim: 1, desat: 0 },
  heat: { swim: 0, desat: 0 },
  cold: { swim: 0, desat: 0 },
};
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Seeded loops inside the water, so every run and screenshot shows the same school. */
function loops(count: number) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const { x, z } = POND.water;
  return Array.from({ length: count }, (_, i) => ({
    cx: (rand() - 0.5) * (x * 2 - 6.2), cy: POND.floor + 0.9 + rand() * (POND.surface - POND.floor - 1.7), cz: (rand() - 0.5) * (z * 2 - 2.6),
    ax: 1.4 + rand() * 1.4, az: 0.45 + rand() * 0.5, bob: 0.08 + rand() * 0.12,
    dir: i % 3 === 1 ? -1 : 1, speed: 0.75 + rand() * 0.5, theta: rand() * Math.PI * 2, size: 1.35 + rand() * 0.4,
    /** Stagger of the stress sequence and the side each fish settles on. */
    delay: rand() * 0.22, tilt: (rand() < 0.5 ? -1 : 1) * (0.3 + rand() * 0.25),
  }));
}

/**
 * The school of cá rô phi, one instanced draw. A vertex shader bends the tail;
 * mood and vigour come from the activity and are only eased here, never decided.
 */
export function FishSchool3D({ mood, vigor, animate }: { mood: FishMood; /** 0–1 activity level shown while swimming. */ vigor: number; animate: boolean }) {
  const { fish: count } = useEcoQuality();
  const invalidate = useThree((state) => state.invalidate);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = createTilapiaGeometry();
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(new Float32Array(Array.from({ length: 12 }, (_, i) => i * 2.39)), 1));
    return g;
  }, []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSwim: { value: TARGET[mood].swim }, uDesat: { value: TARGET[mood].desat }, uHeat: { value: 0 }, uCold: { value: 0 } }), []);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.08, side: THREE.DoubleSide });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aPhase;\nuniform float uTime;\nuniform float uSwim;")
        .replace("#include <begin_vertex>", `#include <begin_vertex>
        float tailW = smoothstep(0.3, -0.75, position.x);
        transformed.z += uSwim * 0.075 * sin(uTime * 7.0 + aPhase - position.x * 5.5) * tailW * (0.35 + tailW);`);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uDesat;\nuniform float uHeat;\nuniform float uCold;")
        .replace("#include <color_fragment>", `#include <color_fragment>
        float grey = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(grey * 1.08), uDesat);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.42, 0.34) * (0.55 + grey), uHeat * 0.42);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.87, 0.94) * (0.75 + grey * 0.5), uCold * 0.6);`);
    };
    return m;
  }, [uniforms]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  const school = useMemo(() => loops(count), [count]);
  const pace = useRef(vigor);
  /** 0 → 1 progress of the stress sequence, and which side of the range it came from. */
  const stress = useRef(mood === "heat" || mood === "cold" ? 1 : 0);
  const kind = useRef<Stress>(mood === "cold" ? "cold" : "heat");
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const bubbles = useRef<THREE.InstancedMesh>(null);
  const bubbleGeometry = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
  const bubbleMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#eef8ff", roughness: 0.1, transparent: true, opacity: 0.7, depthWrite: false }), []);
  useEffect(() => () => { bubbleGeometry.dispose(); bubbleMaterial.dispose(); }, [bubbleGeometry, bubbleMaterial]);
  const place = () => {
    const instanced = mesh.current;
    if (!instanced) return;
    const heat = kind.current === "heat";
    const t0 = uniforms.uTime.value;
    school.forEach((fish, i) => {
      const s = Math.min(1, Math.max(0, (stress.current - fish.delay) / (1 - 0.22)));
      // Heat: up to the surface first, then down; cold: straight down.
      const up = heat ? smooth(0, 0.22, s) * (1 - smooth(0.5, 0.8, s)) : 0;
      const down = heat ? smooth(0.55, 1, s) : smooth(0.05, 0.9, s);
      const t = fish.theta;
      const reach = 1 - 0.75 * down;
      const swimY = fish.cy + fish.bob * Math.sin(2 * t + i);
      const y = swimY + (POND.surface - 0.75 - swimY) * up + (POND.floor + 0.32 * fish.size - swimY) * down;
      dummy.position.set(fish.cx + fish.ax * reach * Math.cos(t), y, fish.cz + fish.az * reach * Math.sin(t));
      // Heading follows the loop's tangent (+x is the head).
      const vx = -fish.ax * Math.sin(t) * fish.dir, vz = fish.az * Math.cos(t) * fish.dir, vy = 2 * fish.bob * Math.cos(2 * t + i) * fish.dir;
      const level = Math.atan2(vy, Math.hypot(vx, vz)) * 0.5 * (1 - up) * (1 - down);
      // Gasping at the surface: nose up with a jerky wobble; resting on the floor: tipped on one side.
      const gasp = up * (0.5 + 0.12 * Math.sin(t0 * 9 + i * 1.7));
      dummy.rotation.set(fish.tilt * down, Math.atan2(-vz, vx), level + gasp, "YZX");
      dummy.scale.setScalar(fish.size);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
      const bubble = bubbles.current;
      if (bubble) {
        // Small air bubbles at the mouth while gasping at the surface.
        const rise = (t0 * 0.9 + i * 0.37) % 1;
        const r = 0.07 * up * (1 - rise) * fish.size;
        dummy.position.set(dummy.position.x + Math.cos(dummy.rotation.y) * 0.45 * fish.size, y + 0.25 + rise * 0.45, dummy.position.z - Math.sin(dummy.rotation.y) * 0.45 * fish.size);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(Math.max(r, 1e-4));
        dummy.updateMatrix();
        bubble.setMatrixAt(i, dummy.matrix);
      }
    });
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
    if (bubbles.current) bubbles.current.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(place, [school]);
  useEffect(() => {
    if (mood === "heat" || mood === "cold") kind.current = mood;
    invalidate();
  }, [mood, vigor, invalidate]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const goal = TARGET[mood];
    const stressed = mood === "heat" || mood === "cold";
    const shade = (amount: number) => {
      uniforms.uHeat.value = kind.current === "heat" ? amount : 0;
      uniforms.uCold.value = kind.current === "cold" ? amount : 0;
    };
    if (!animate) {
      // Reduced motion: jump to the settled pose.
      stress.current = stressed ? 1 : 0;
      uniforms.uSwim.value = 0;
      uniforms.uDesat.value = goal.desat;
      shade(stress.current);
      place();
      return;
    }
    const k = 1 - Math.exp(-ECO_MOTION.fishLambda * dt);
    // The sequence runs over about ECO_MOTION.stressSeconds and reverses faster once the water is back in range.
    stress.current = Math.min(1, Math.max(0, stress.current + (stressed ? dt / ECO_MOTION.stressSeconds : -dt / (ECO_MOTION.stressSeconds * 0.4))));
    const s = stress.current;
    const heat = kind.current === "heat";
    // Heat: frantic at the surface, then still; cold: slower and slower.
    const stressSwim = heat ? 1.5 * smooth(0, 0.15, s) * (1 - smooth(0.45, 0.85, s)) : 0.6 * (1 - smooth(0, 0.8, s));
    const swimGoal = s > 0 || stressed ? stressSwim + (1 - Math.min(1, s * 4)) * goal.swim * (0.45 + 0.55 * vigor) : goal.swim * (0.45 + 0.55 * vigor);
    uniforms.uSwim.value += (swimGoal - uniforms.uSwim.value) * k;
    uniforms.uDesat.value += (goal.desat - uniforms.uDesat.value) * k;
    shade(heat ? smooth(0.1, 0.6, s) : smooth(0.3, 1, s));
    uniforms.uTime.value += dt * (0.5 + 0.7 * pace.current + (heat ? 0.8 * smooth(0, 0.2, s) * (1 - smooth(0.5, 0.8, s)) : 0));
    pace.current += ((stressed ? 0 : vigor) - pace.current) * k;
    if (uniforms.uSwim.value > 0.01) {
      school.forEach((fish) => { fish.theta += dt * ECO_MOTION.swim * fish.speed * fish.dir * uniforms.uSwim.value * (0.35 + 0.65 * Math.max(pace.current, heat ? s : 0)); });
    }
    place();
    state.invalidate();
  });

  return <>
    <instancedMesh ref={mesh} args={[geometry, material, count]} castShadow renderOrder={1} />
    <instancedMesh ref={bubbles} args={[bubbleGeometry, bubbleMaterial, count]} renderOrder={1} frustumCulled={false} />
  </>;
}
