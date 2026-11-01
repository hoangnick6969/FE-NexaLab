/**
 * Motion tokens for K7 scenes (plan §5.4). Every animation settles on a value
 * the activity already holds and never writes back to state or evidence.
 */
export const K7_MOTION = {
  /** Camera rig convergence (THREE.MathUtils.damp lambda). */
  cameraLambda: 4,
  /** Unwinding and rewinding of the double helix. */
  helixLambda: 3.5,
  /** Enzymes and the ribosome following the current base or codon. */
  followLambda: 4,
  /** A free nucleotide flying in to pair. */
  arrivalMs: 520,
  /** Mutation flash on the substituted base. */
  flashMs: 600,
  /** Idle spin of the helix around its own axis (rad/s). */
  idleSpin: 0.08,
} as const;

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
