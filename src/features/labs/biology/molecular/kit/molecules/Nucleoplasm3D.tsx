import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { K7_SCENE } from "../k7-palette";
import { seeded } from "../k7-noise";
import { useK7Quality } from "../k7-quality";

const vertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  varying vec3 vDirection;
  void main() {
    float h = vDirection.y;
    vec3 color = mix(uHorizon, uTop, smoothstep(0.0, 0.9, h));
    color = mix(color, uBottom, smoothstep(0.0, -0.8, h));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Nucleoplasm backdrop: a graded dome plus a crowd of small, softly lit
 * macromolecules drifting slowly (tier high/mid only). Decorative; no data.
 */
export function Nucleoplasm3D({ drift = false }: { drift?: boolean }) {
  const quality = useK7Quality();
  const dome = useMemo(() => new THREE.ShaderMaterial({
    vertexShader, fragmentShader, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(K7_SCENE.background) }, uHorizon: { value: new THREE.Color(K7_SCENE.horizon) }, uBottom: { value: new THREE.Color("#060f16") } },
  }), []);
  useEffect(() => () => dome.dispose(), [dome]);

  const count = quality.particles;
  const crowd = useMemo(() => {
    if (!count) return null;
    const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8, transparent: true, opacity: 0.55, depthWrite: false }), count);
    const random = seeded(2709);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const palette = ["#2c5d6e", "#3c6f7c", "#4a5f86", "#5a7a6a", "#6b5d7e"];
    const seeds: { base: THREE.Vector3; size: number; phase: number }[] = [];
    for (let index = 0; index < count; index++) {
      // A shell around the stage, denser behind it, never between camera and molecules.
      const base = new THREE.Vector3((random() - 0.5) * 40, (random() - 0.5) * 22, -4 - random() * 18);
      if (random() < 0.35) base.z = 4 + random() * 6, base.x = Math.sign(base.x || 1) * (11 + random() * 8);
      const size = 0.05 + random() ** 2 * 0.32;
      seeds.push({ base, size, phase: random() * Math.PI * 2 });
      mesh.setMatrixAt(index, matrix.compose(base, new THREE.Quaternion(), new THREE.Vector3().setScalar(size)));
      mesh.setColorAt(index, color.set(palette[index % palette.length]));
    }
    mesh.userData.seeds = seeds;
    return mesh;
  }, [count]);
  useEffect(() => () => { if (crowd) { crowd.geometry.dispose(); (crowd.material as THREE.Material).dispose(); crowd.dispose(); } }, [crowd]);

  const scratch = useRef({ matrix: new THREE.Matrix4(), position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: new THREE.Vector3() });
  useFrame((state) => {
    if (!crowd || !drift) return;
    const { matrix, position, quaternion, scale } = scratch.current;
    const t = state.clock.elapsedTime;
    (crowd.userData.seeds as { base: THREE.Vector3; size: number; phase: number }[]).forEach((seed, index) => {
      position.set(seed.base.x + Math.sin(t * 0.11 + seed.phase) * 0.6, seed.base.y + Math.cos(t * 0.09 + seed.phase) * 0.5, seed.base.z);
      crowd.setMatrixAt(index, matrix.compose(position, quaternion, scale.setScalar(seed.size)));
    });
    crowd.instanceMatrix.needsUpdate = true;
  });

  return <group>
    <mesh material={dome} renderOrder={-10}><sphereGeometry args={[80, 32, 16]} /></mesh>
    {crowd && <primitive object={crowd} />}
  </group>;
}
