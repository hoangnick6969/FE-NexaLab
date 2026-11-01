import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BASE_COLORS, STRAND_TINTS } from "../k7-palette";
import { seeded } from "../k7-noise";
import { useK7Quality } from "../k7-quality";

const COUNTS = { high: 72, mid: 36, low: 0 } as const;

type Item = { home: THREE.Vector3; axis: THREE.Vector3; phase: number; speed: number; base: string };

/** One free nucleotide in its own frame: sugar pentagon at the origin, phosphate behind, base rod in front. */
const PARTS = {
  sugar: new THREE.Matrix4(),
  phosphate: new THREE.Matrix4().makeTranslation(-0.2, -0.13, 0),
  link: new THREE.Matrix4().compose(new THREE.Vector3(-0.1, -0.065, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.99), new THREE.Vector3(1, 0.24, 1)),
  rod: new THREE.Matrix4().compose(new THREE.Vector3(0.38, 0, 0), new THREE.Quaternion(), new THREE.Vector3(0.5, 1, 1)),
};

/**
 * Free nucleotides (dNTPs or NTPs) drifting and tumbling in the nucleoplasm
 * around the stage, kept clear of the molecule in the centre. Decorative:
 * the pool is the source the polymerases draw from, never data.
 */
export function NucleotidePool3D({ kind = "dna", animate = false }: { kind?: "dna" | "rna"; animate?: boolean }) {
  const quality = useK7Quality();
  const count = quality.particles >= 200 ? COUNTS.high : quality.particles > 0 ? COUNTS.mid : COUNTS.low;
  const items = useMemo<Item[]>(() => {
    const random = seeded(kind === "dna" ? 381 : 512);
    const letters = kind === "dna" ? "ATGC" : "AUGC";
    const list: Item[] = [];
    while (list.length < count) {
      const home = new THREE.Vector3((random() - 0.5) * 24, (random() - 0.5) * 15, -10 + random() * 13);
      if (Math.abs(home.x) < 5 && Math.abs(home.y) < 4.8 && home.z > -4) continue;
      list.push({ home, axis: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), phase: random() * Math.PI * 2, speed: 0.25 + random() * 0.5, base: letters[list.length % 4] });
    }
    return list;
  }, [count, kind]);

  const meshes = useMemo(() => {
    if (!count) return null;
    const tint = STRAND_TINTS[kind === "dna" ? "parent" : "rna"];
    const make = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      return mesh;
    };
    const glossy = (color: string) => new THREE.MeshPhysicalMaterial({ color, metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 });
    const rod = make(new THREE.CylinderGeometry(0.07, 0.07, 1, 12).rotateZ(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1 }));
    const color = new THREE.Color();
    items.forEach((item, index) => rod.setColorAt(index, color.set(BASE_COLORS[item.base as keyof typeof BASE_COLORS])));
    return {
      sugar: make(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 5).rotateX(Math.PI / 2), glossy(tint.tube)),
      phosphate: make(new THREE.SphereGeometry(0.08, 14, 10), glossy(tint.bead)),
      link: make(new THREE.CylinderGeometry(0.05, 0.05, 1, 10), glossy(tint.tube)),
      rod,
    };
  }, [count, items, kind]);
  useEffect(() => () => {
    if (meshes) Object.values(meshes).forEach((mesh) => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); mesh.dispose(); });
  }, [meshes]);

  const scratch = useMemo(() => ({ item: new THREE.Matrix4(), part: new THREE.Matrix4(), position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), unit: new THREE.Vector3(1, 1, 1) }), []);
  const write = (time: number) => {
    if (!meshes) return;
    items.forEach((item, index) => {
      const t = time * item.speed + item.phase;
      scratch.position.set(item.home.x + Math.sin(t * 0.6) * 0.5, item.home.y + Math.sin(t * 0.45 + 1) * 0.4, item.home.z + Math.cos(t * 0.5) * 0.4);
      scratch.quaternion.setFromAxisAngle(item.axis, t);
      scratch.item.compose(scratch.position, scratch.quaternion, scratch.unit);
      (["sugar", "phosphate", "link", "rod"] as const).forEach((name) => meshes[name].setMatrixAt(index, scratch.part.multiplyMatrices(scratch.item, PARTS[name])));
    });
    Object.values(meshes).forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
  };
  useEffect(() => { write(0); }, [meshes]);
  useFrame((state) => { if (animate) write(state.clock.elapsedTime); });

  if (!meshes) return null;
  return <group>{Object.values(meshes).map((mesh, index) => <primitive key={index} object={mesh} />)}</group>;
}
