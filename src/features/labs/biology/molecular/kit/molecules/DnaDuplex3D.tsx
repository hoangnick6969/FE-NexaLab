import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePrefersReducedMotion } from "../../../../shared/motion/usePrefersReducedMotion";
import type { K7Structure } from "../k7-config";
import type { DnaBase } from "../k7-codons";
import { CLOSED, NUCLEOTIDE, baseLength, duplexPose, helixSpec, makePoses, openWeight, type NucleotidePose, type OpenSpan } from "../k7-geometry";
import { K7_MOTION } from "../k7-motion";
import type { StrandTint } from "../k7-palette";
import { useK7Quality } from "../k7-quality";
import { StrandRenderer } from "./strand-renderer";
import { AtomRenderer } from "./atom-renderer";

export type DuplexHighlight = { strand: "upper" | "lower"; index: number; color?: string };
/** Schematic tube-and-rod model, or ball-and-stick atoms on a ribbon backbone. */
export type DuplexRepresentation = "schematic" | "atomic";

const AXIS = new THREE.Vector3(1, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const tipA = new THREE.Vector3();
const tipB = new THREE.Vector3();
const mid = new THREE.Vector3();
const across = new THREE.Vector3();
const dir = new THREE.Vector3();
const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const size = new THREE.Vector3();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const BOND_OFFSETS: Record<2 | 3, readonly number[]> = { 2: [-0.1, 0.1], 3: [-0.14, 0, 0.14] };

/**
 * Double-stranded DNA from two aligned base arrays: `upper` read 5'→3' left to
 * right and `lower` its antiparallel partner. `span` opens a fork or bubble and
 * eases on the frame loop. Hydrogen bonds show two dashes for A–T and three
 * for G–C, only between paired positions that are still closed.
 */
export function DnaDuplex3D({ structure, upper, lower, span = CLOSED, tints = ["parent", "parent"], labels = false, spin = false, highlight = null, hbonds = true, representation = "schematic" }: {
  structure: K7Structure;
  upper: readonly (DnaBase | null)[];
  lower: readonly (DnaBase | null)[];
  span?: OpenSpan;
  tints?: readonly [StrandTint, StrandTint];
  labels?: boolean;
  spin?: boolean;
  highlight?: DuplexHighlight | null;
  hbonds?: boolean;
  representation?: DuplexRepresentation;
}) {
  const quality = useK7Quality();
  const reduced = usePrefersReducedMotion();
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const count = Math.max(upper.length, lower.length);
  const spec = useMemo(() => helixSpec(structure), [structure]);
  const strands = useMemo(
    () => [new StrandRenderer(count, tints[0], quality.clearcoat), new StrandRenderer(count, tints[1], quality.clearcoat)] as const,
    [count, tints[0], tints[1], quality.clearcoat],
  );
  useEffect(() => () => strands.forEach((strand) => strand.dispose()), [strands]);
  const atomic = representation === "atomic";
  const atoms = useMemo(() => [new AtomRenderer(count), new AtomRenderer(count)] as const, [count]);
  useEffect(() => () => atoms.forEach((renderer) => renderer.dispose()), [atoms]);
  const poses = useMemo(() => [makePoses(count), makePoses(count)] as [NucleotidePose[], NucleotidePose[]], [count]);
  const bonds = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.018, 0.018, 1, 6, 1),
      new THREE.MeshStandardMaterial({ color: "#f4f7fb", emissive: "#9fd6ff", emissiveIntensity: 0.7, transparent: true, opacity: 0.9 }),
      count * 3,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    return mesh;
  }, [count]);
  useEffect(() => () => { bonds.geometry.dispose(); (bonds.material as THREE.Material).dispose(); bonds.dispose(); }, [bonds]);

  const root = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const haloMaterial = useRef<THREE.MeshBasicMaterial>(null);
  // Animated copy of the span: the edges jump while closed, the opening eases.
  const live = useRef<OpenSpan>({ ...span });
  useEffect(() => { invalidate(); }, [span.from, span.to, span.amount, span.upper, span.lower, upper, lower, highlight, representation, invalidate]);

  useFrame((state, delta) => {
    const step = Math.min(delta, 0.1);
    const current = live.current;
    let moving = false;
    for (const key of ["from", "to", "amount", "upper", "lower"] as const) {
      const goal = span[key];
      if ((key === "from" || key === "to") && current.amount < 0.02) { current[key] = goal; continue; }
      current[key] = reduced ? goal : THREE.MathUtils.damp(current[key], goal, K7_MOTION.helixLambda, step);
      if (Math.abs(current[key] - goal) < 1e-3) current[key] = goal; else moving = true;
    }
    for (let index = 0; index < count; index++) duplexPose(index, count, spec, current, poses[0][index], poses[1][index]);

    const frame = { delta: step, reduced, labels, camera, atomic } as const;
    if (strands[0].update({ ...frame, poses: poses[0], bases: upper })) moving = true;
    if (strands[1].update({ ...frame, poses: poses[1], bases: lower })) moving = true;
    atoms[0].group.visible = atoms[1].group.visible = atomic;
    if (atomic) { atoms[0].update(poses[0], upper); atoms[1].update(poses[1], lower); }

    bonds.visible = hbonds;
    if (hbonds) {
      for (let index = 0; index < count; index++) {
        const a = upper[index], b = lower[index];
        const paired = a && b && openWeight(index, current) < 0.25 && strands[0].settled(index) && strands[1].settled(index);
        const dashes = paired ? (a === "G" || a === "C" ? 3 : 2) : 0;
        for (let k = 0; k < 3; k++) {
          const slot = index * 3 + k;
          if (k >= dashes) { bonds.setMatrixAt(slot, HIDDEN); continue; }
          const pa = poses[0][index], pb = poses[1][index];
          tipA.copy(pa.p).addScaledVector(pa.d, NUCLEOTIDE.sugarOffset + baseLength(a!));
          tipB.copy(pb.p).addScaledVector(pb.d, NUCLEOTIDE.sugarOffset + baseLength(b!));
          dir.subVectors(tipB, tipA);
          const length = dir.length();
          across.crossVectors(pa.d, AXIS);
          if (across.lengthSq() < 1e-6) across.set(0, 0, 1);
          across.normalize();
          mid.lerpVectors(tipA, tipB, 0.5).addScaledVector(across, BOND_OFFSETS[dashes as 2 | 3][k]);
          quaternion.setFromUnitVectors(UP, dir.normalize());
          bonds.setMatrixAt(slot, matrix.compose(mid, quaternion, size.set(1, length * 0.72, 1)));
        }
      }
      bonds.instanceMatrix.needsUpdate = true;
    }

    if (halo.current) {
      halo.current.visible = Boolean(highlight);
      if (highlight) {
        const which = highlight.strand === "upper" ? 0 : 1;
        const index = Math.min(highlight.index, count - 1);
        const pose = poses[which][index];
        if (strands[which].settled(index)) strands[which].centreOf(index, halo.current.position);
        else halo.current.position.copy(pose.p).addScaledVector(pose.d, NUCLEOTIDE.sugarOffset + 0.3);
        halo.current.quaternion.copy(state.camera.quaternion);
        if (haloMaterial.current) {
          haloMaterial.current.color.set(highlight.color ?? "#ffffff");
          haloMaterial.current.opacity = reduced ? 0.85 : 0.55 + 0.35 * Math.sin(state.clock.elapsedTime * 4.5);
        }
        if (!reduced) moving = true;
      }
    }

    if (spin && root.current && !reduced) {
      root.current.rotation.x += step * K7_MOTION.idleSpin;
      moving = true;
    }
    if (moving) state.invalidate();
  });

  return <group ref={root}>
    <primitive object={strands[0].group} />
    <primitive object={strands[1].group} />
    <primitive object={atoms[0].group} />
    <primitive object={atoms[1].group} />
    <primitive object={bonds} />
    <mesh ref={halo} visible={false} renderOrder={5}>
      <ringGeometry args={[0.34, 0.44, 40]} />
      <meshBasicMaterial ref={haloMaterial} transparent depthWrite={false} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  </group>;
}
