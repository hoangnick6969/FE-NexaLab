import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type PourStreamSample = { start: THREE.Vector3; end: THREE.Vector3; visible: boolean };

/** A thin, falling quadratic jet, updated in place without allocating GPU geometry per frame. */
export function PourStream3D({ sample }: { sample: MutableRefObject<PourStreamSample> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    const indices: number[] = [];
    for (let row = 0; row < 24; row++) for (let side = 0; side < 8; side++) {
      const a = row * 8 + side, b = row * 8 + (side + 1) % 8;
      indices.push(a, b, a + 8, b, b + 8, a + 8);
    }
    result.setAttribute("position", new THREE.BufferAttribute(new Float32Array(25 * 8 * 3), 3));
    result.setIndex(indices);
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const { start, end, visible } = sample.current;
    mesh.current.visible = visible;
    if (!visible) return;
    const position = geometry.getAttribute("position");
    for (let row = 0; row <= 24; row++) {
      const t = row / 24;
      // Horizontal speed slows as gravity accelerates the jet vertically.
      const u = 1 - (1 - t) * (1 - t);
      const x = THREE.MathUtils.lerp(start.x, end.x, u);
      const y = THREE.MathUtils.lerp(start.y, end.y, t * t);
      const z = THREE.MathUtils.lerp(start.z, end.z, u);
      const radius = (1.35 - 0.55 * t) * (1 + 0.07 * Math.sin(t * 35 - clock.elapsedTime * 25));
      for (let side = 0; side < 8; side++) {
        const angle = side / 8 * Math.PI * 2;
        position.setXYZ(row * 8 + side, x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius);
      }
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  });
  return <mesh ref={mesh} name="pour-stream" geometry={geometry} visible={false} renderOrder={4}>
    <meshPhysicalMaterial color="#8bd8f5" transparent opacity={0.72} roughness={0.08} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} />
  </mesh>;
}
