import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePrefersReducedMotion } from "../../../../shared/motion/usePrefersReducedMotion";
import type { AminoAcid } from "../k7-codons";
import { AMINO_GROUP_COLORS, aminoGroup } from "../k7-palette";
import { textTexture } from "./labels";

const SPACING = 0.62;
const UP = new THREE.Vector3(0, 1, 0);

/** Resting place of residue `fromAnchor` steps away from the anchor: a loose coil leaving the exit tunnel. */
function coil(fromAnchor: number, out: THREE.Vector3) {
  const s = fromAnchor * SPACING;
  return out.set(-0.32 * s - 0.18 * Math.sin(fromAnchor * 1.25), 0.78 * s, 0.32 * Math.sin(fromAnchor * 0.9 + 0.6));
}

/**
 * Growing polypeptide: residue 0 (Met at the N-terminus) is farthest from the
 * anchor, the newest residue sits at the anchor. Residues glide outwards as
 * the chain grows; colour follows side-chain class, always with its code.
 */
export function Polypeptide3D({ chain, labels = true }: { chain: readonly AminoAcid[]; labels?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const capacity = Math.max(chain.length, 1);
  const beads = useRef<(THREE.Group | null)[]>([]);
  const links = useRef<(THREE.Mesh | null)[]>([]);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const span = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => { invalidate(); }, [chain, invalidate]);

  useFrame((state, delta) => {
    let moving = false;
    const alpha = reduced ? 1 : 1 - Math.exp(-5 * Math.min(delta, 0.1));
    chain.forEach((_, index) => {
      const bead = beads.current[index];
      if (!bead) return;
      coil(chain.length - 1 - index, goal);
      if (bead.userData.placed !== true) { bead.position.set(0.15, -0.2, 0.3); bead.scale.setScalar(reduced ? 1 : 0.2); bead.userData.placed = true; }
      bead.position.lerp(goal, alpha);
      bead.scale.setScalar(THREE.MathUtils.lerp(bead.scale.x, 1, alpha));
      if (bead.position.distanceToSquared(goal) > 1e-6 || bead.scale.x < 0.999) moving = true;
      const link = links.current[index];
      const previous = beads.current[index - 1];
      if (link) {
        link.visible = Boolean(previous);
        if (previous) {
          span.subVectors(bead.position, previous.position);
          link.position.copy(previous.position).addScaledVector(span, 0.5);
          link.scale.set(1, span.length(), 1);
          link.quaternion.setFromUnitVectors(UP, span.normalize());
        }
      }
    });
    if (moving) state.invalidate();
  });

  return <group>
    {Array.from({ length: capacity }, (_, index) => {
      const residue = chain[index];
      if (!residue) return null;
      const color = AMINO_GROUP_COLORS[aminoGroup(residue)];
      const label = textTexture(residue);
      return <group key={index}>
        <mesh ref={(node) => { links.current[index] = node; }} visible={false}>
          <cylinderGeometry args={[0.07, 0.07, 1, 8]} />
          <meshStandardMaterial color="#e9eef2" roughness={0.5} />
        </mesh>
        <group ref={(node) => { beads.current[index] = node; }}>
          <mesh><icosahedronGeometry args={[0.3, 2]} /><meshPhysicalMaterial color={color} roughness={0.36} clearcoat={0.6} clearcoatRoughness={0.3} /></mesh>
          {labels && <sprite position={[0, 0.5, 0.18]} scale={[0.26 * label.aspect, 0.26, 1]} renderOrder={6}>
            <spriteMaterial map={label.texture} transparent depthWrite={false} toneMapped={false} />
          </sprite>}
        </group>
      </group>;
    })}
  </group>;
}
