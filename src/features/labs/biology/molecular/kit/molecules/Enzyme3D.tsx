import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { fbm } from "../k7-noise";
import { useK7Quality } from "../k7-quality";

/**
 * Procedural protein surface: a subdivided sphere displaced by seeded fractal
 * noise, with an optional groove along x where a nucleic-acid strand runs.
 * Same seed, same shape. A simplified illustration, not a real structure.
 */
export function proteinSurface({ seed, radius, stretch, detail, groove }: { seed: number; radius: number; stretch: readonly [number, number, number]; detail: number; groove: number }) {
  const geometry = mergeVertices(new THREE.IcosahedronGeometry(1, detail));
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    v.fromBufferAttribute(position, index).normalize();
    let r = 1 + 0.17 * fbm(v.x * 1.7 + 3, v.y * 1.7, v.z * 1.7, seed) + 0.05 * fbm(v.x * 5.1, v.y * 5.1, v.z * 5.1, seed + 7);
    // Channel that cradles the strand on the learner-facing side.
    if (groove > 0) r -= groove * Math.exp(-(v.y * v.y) / 0.045) * THREE.MathUtils.smoothstep(v.z, -0.2, 0.6);
    position.setXYZ(index, v.x * r * radius * stretch[0], v.y * r * radius * stretch[1], v.z * r * radius * stretch[2]);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function Enzyme3D({ seed, radius, stretch = [1, 1, 1], color, opacity = 0.6, groove = 0 }: {
  seed: number;
  radius: number;
  stretch?: readonly [number, number, number];
  color: string;
  opacity?: number;
  groove?: number;
}) {
  const quality = useK7Quality();
  const geometry = useMemo(() => proteinSurface({ seed, radius, stretch, detail: quality.detail, groove }), [seed, radius, stretch[0], stretch[1], stretch[2], quality.detail, groove]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const sheen = useMemo(() => new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.55), [color]);
  return <group>
    {/* Inner shell gives the translucent protein some body. */}
    <mesh geometry={geometry} scale={0.94} renderOrder={1}>
      <meshStandardMaterial color={color} roughness={0.7} transparent opacity={opacity * 0.45} depthWrite={false} side={THREE.BackSide} />
    </mesh>
    <mesh geometry={geometry} renderOrder={2}>
      <meshPhysicalMaterial
        color={color}
        roughness={0.5}
        transparent
        opacity={opacity}
        depthWrite={false}
        emissive={color}
        emissiveIntensity={0.14}
        sheen={1}
        sheenColor={sheen}
        sheenRoughness={0.45}
        clearcoat={quality.clearcoat ? 0.35 : 0}
        clearcoatRoughness={0.4}
      />
    </mesh>
  </group>;
}
