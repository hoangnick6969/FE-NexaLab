import * as THREE from "three";
import type { K7Structure } from "./k7-config";
import { isPurine, type Base } from "./k7-codons";
import { smoothstep } from "./k7-motion";

/** Scene unit = 1 nm; 1 Å = 0.1 units. */
export const NM_PER_ANGSTROM = 0.1;

/**
 * B-form proportions from the Lab's structure config. The two backbones are
 * offset by ~144° rather than 180°, which opens the major and minor grooves.
 */
export type HelixSpec = { bpPerTurn: number; rise: number; radius: number; groove: number };

export const helixSpec = (structure: K7Structure): HelixSpec => ({
  bpPerTurn: structure.bpPerTurn,
  rise: structure.riseA * NM_PER_ANGSTROM,
  radius: (structure.diameterA * NM_PER_ANGSTROM) / 2,
  groove: THREE.MathUtils.degToRad(144),
});

/** Nucleotide part sizes (nm). Purines (two rings) are longer than pyrimidines. */
export const NUCLEOTIDE = { sugarOffset: 0.2, purine: 0.72, pyrimidine: 0.54, thickness: 0.11, width: 0.42 } as const;
export const baseLength = (base: Base) => (isPurine(base) ? NUCLEOTIDE.purine : NUCLEOTIDE.pyrimidine);

/** Backbone point and the unit direction its base points to (towards the partner strand). */
export type NucleotidePose = { p: THREE.Vector3; d: THREE.Vector3 };
export const makePoses = (count: number): NucleotidePose[] =>
  Array.from({ length: count }, () => ({ p: new THREE.Vector3(), d: new THREE.Vector3(1, 0, 0) }));

/**
 * Where a stretch of the duplex is opened (a replication fork or transcription
 * bubble). Opened strands leave the helix and lie flat, base edges facing:
 * the upper strand at `upper`, the lower at `lower` (nm above/below the axis).
 */
export type OpenSpan = { from: number; to: number; amount: number; upper: number; lower: number };
export const CLOSED: OpenSpan = { from: 0, to: -1, amount: 0, upper: 1.6, lower: -1.6 };

const SOFT = 2.2;
export const openWeight = (index: number, span: OpenSpan) =>
  span.amount <= 0 || span.to < span.from ? 0 :
    span.amount * smoothstep(span.from - SOFT, span.from + 0.5, index) * (1 - smoothstep(span.to - 0.5, span.to + SOFT, index));

const helixPoint = new THREE.Vector3();
const flatPoint = new THREE.Vector3();

/** Axis position of base pair `index` in a duplex of `count` pairs, centred on x = 0. */
export const axisX = (index: number, count: number, spec: HelixSpec) => (index - (count - 1) / 2) * spec.rise;

/**
 * Writes the two strands' poses for base pair `index` (upper strand 5'→3' left
 * to right, lower strand antiparallel), blending helix and opened layout.
 */
export function duplexPose(index: number, count: number, spec: HelixSpec, span: OpenSpan, upper: NucleotidePose, lower: NucleotidePose) {
  const x = axisX(index, count, spec);
  const theta = (index / spec.bpPerTurn) * Math.PI * 2;
  const w = openWeight(index, span);
  for (const [pose, angle, flatY] of [[upper, theta, span.upper], [lower, theta + spec.groove, span.lower]] as const) {
    helixPoint.set(x, spec.radius * Math.cos(angle), spec.radius * Math.sin(angle));
    flatPoint.set(x, flatY, 0);
    pose.p.lerpVectors(helixPoint, flatPoint, w);
  }
  // Helix bases point along the chord to the partner; opened bases point into the gap.
  upper.d.subVectors(lower.p, upper.p).normalize();
  lower.d.copy(upper.d).negate();
  return w;
}

/** Poses along a curve for a single strand (mRNA, a free DNA strand); bases point to `facing`. */
export function strandAlongCurve(curve: THREE.Curve<THREE.Vector3>, count: number, spacing: number, facing: THREE.Vector3, out: NucleotidePose[]) {
  const length = curve.getLength();
  for (let index = 0; index < count; index++) {
    const u = Math.min(1, (index * spacing) / Math.max(length, 1e-6));
    curve.getPointAt(u, out[index].p);
    out[index].d.copy(facing);
  }
}
