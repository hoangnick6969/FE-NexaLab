import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePrefersReducedMotion } from "../../../../shared/motion/usePrefersReducedMotion";
import type { Base } from "../k7-codons";
import { makePoses, type NucleotidePose } from "../k7-geometry";
import type { StrandTint } from "../k7-palette";
import { useK7Quality } from "../k7-quality";
import { StrandRenderer } from "./strand-renderer";

const goalPose = { p: new THREE.Vector3(), d: new THREE.Vector3() };

/**
 * Layout that eases each nucleotide towards `target(index, out)`; a
 * nucleotide seen for the first time snaps into place (its arrival flight is
 * drawn by the strand). Reduced motion snaps everything.
 */
export function useEasedLayout(target: (index: number, out: NucleotidePose) => void, lambda = 4) {
  const reduced = usePrefersReducedMotion();
  const placed = useRef<boolean[]>([]);
  const targetRef = useRef(target);
  targetRef.current = target;
  return useMemo(() => (poses: NucleotidePose[], delta: number) => {
    let moving = false;
    const alpha = reduced ? 1 : 1 - Math.exp(-lambda * delta);
    poses.forEach((pose, index) => {
      targetRef.current(index, goalPose);
      if (!placed.current[index]) { pose.p.copy(goalPose.p); pose.d.copy(goalPose.d); placed.current[index] = true; return; }
      pose.p.lerp(goalPose.p, alpha);
      pose.d.lerp(goalPose.d, alpha).normalize();
      if (pose.p.distanceToSquared(goalPose.p) > 1e-6) moving = true;
      else pose.p.copy(goalPose.p);
    });
    return moving;
  }, [reduced, lambda]);
}

/**
 * A single strand (mRNA, or one DNA strand on its own). The Lab supplies a
 * layout that can change every frame (for example mRNA peeling off its
 * template behind a moving polymerase); `layout` returns true while it moves.
 */
export function NucleotideStrand3D({ bases, tint = "rna", labels = false, layout, spawn }: {
  bases: readonly (Base | null)[];
  tint?: StrandTint;
  labels?: boolean;
  layout: (poses: NucleotidePose[], delta: number) => boolean;
  spawn?: (index: number, out: THREE.Vector3) => void;
}) {
  const quality = useK7Quality();
  const reduced = usePrefersReducedMotion();
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const count = bases.length;
  const strand = useMemo(() => new StrandRenderer(count, tint, quality.clearcoat), [count, tint, quality.clearcoat]);
  useEffect(() => () => strand.dispose(), [strand]);
  const poses = useMemo(() => makePoses(count), [count]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  useEffect(() => { invalidate(); }, [bases, layout, invalidate]);
  useFrame((state, delta) => {
    const step = Math.min(delta, 0.1);
    const moving = layoutRef.current(poses, step);
    if (strand.update({ poses, bases, delta: step, reduced, labels, labelAt: "tip", camera, spawn }) || moving) state.invalidate();
  });
  return <primitive object={strand.group} />;
}
