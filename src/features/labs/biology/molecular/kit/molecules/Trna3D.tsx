import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { CodonMeaning, RnaBase } from "../k7-codons";
import { AMINO_GROUP_COLORS, BASE_COLORS, aminoGroup } from "../k7-palette";
import { NUCLEOTIDE } from "../k7-geometry";
import { TextLabel } from "./labels";

/**
 * Simplified L-shaped tRNA standing on its anticodon at the local origin:
 * the anticodon loop points down at the codon, the acceptor end carries the
 * amino acid (when charged). Shapes are illustrative, not to scale.
 */
export function Trna3D({ anticodon, aminoAcid, rise, labels = true }: { anticodon: readonly RnaBase[]; aminoAcid: CodonMeaning | null; rise: number; labels?: boolean }) {
  const { arm, acceptor, plate } = useMemo(() => {
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.42, 0), new THREE.Vector3(0.05, 1.1, 0.05), new THREE.Vector3(0, 1.85, 0), new THREE.Vector3(0.25, 2.15, -0.05),
    ]);
    const acceptorCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.25, 2.15, -0.05), new THREE.Vector3(0.75, 2.3, -0.1), new THREE.Vector3(1.05, 2.62, -0.1),
    ]);
    return {
      arm: new THREE.TubeGeometry(armCurve, 40, 0.2, 14, false),
      acceptor: new THREE.TubeGeometry(acceptorCurve, 24, 0.17, 12, false),
      plate: new RoundedBoxGeometry(1, 1, 1, 2, 0.16),
    };
  }, []);
  useEffect(() => () => { arm.dispose(); acceptor.dispose(); plate.dispose(); }, [arm, acceptor, plate]);
  const charged = aminoAcid && aminoAcid !== "Stop";
  return <group>
    <mesh geometry={arm}><meshPhysicalMaterial color="#86d3c9" roughness={0.45} clearcoat={0.5} sheen={0.4} /></mesh>
    <mesh geometry={acceptor}><meshPhysicalMaterial color="#86d3c9" roughness={0.45} clearcoat={0.5} sheen={0.4} /></mesh>
    {/* D and TψC loops at the elbow. */}
    <mesh position={[-0.28, 1.75, 0.05]}><sphereGeometry args={[0.26, 20, 14]} /><meshPhysicalMaterial color="#9fdcd3" roughness={0.5} /></mesh>
    <mesh position={[0.42, 2.0, 0.12]}><sphereGeometry args={[0.24, 20, 14]} /><meshPhysicalMaterial color="#9fdcd3" roughness={0.5} /></mesh>
    {/* Anticodon loop and its three bases, pointing down at the codon. */}
    <mesh position={[0, 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.4, 0.09, 10, 28]} /><meshPhysicalMaterial color="#86d3c9" roughness={0.45} /></mesh>
    {anticodon.map((base, index) => (
      <group key={index} position={[(index - 1) * rise, 0, 0]}>
        <mesh geometry={plate} position={[0, -0.02, 0]} scale={[NUCLEOTIDE.width * 0.8, base === "A" || base === "G" ? 0.6 : 0.46, NUCLEOTIDE.thickness * 1.2]}>
          <meshPhysicalMaterial color={BASE_COLORS[base]} roughness={0.42} clearcoat={0.5} />
        </mesh>
        {labels && <TextLabel text={base} height={0.24} position={[0, -0.12, 0.32]} fill={BASE_COLORS[base]} ink="#ffffff" />}
      </group>
    ))}
    {charged && <group position={[1.12, 2.86, -0.1]}>
      <mesh><icosahedronGeometry args={[0.32, 2]} /><meshPhysicalMaterial color={AMINO_GROUP_COLORS[aminoGroup(aminoAcid)]} roughness={0.38} clearcoat={0.6} /></mesh>
      {labels && <TextLabel text={aminoAcid} height={0.28} position={[0, 0.55, 0.2]} />}
    </group>}
  </group>;
}
