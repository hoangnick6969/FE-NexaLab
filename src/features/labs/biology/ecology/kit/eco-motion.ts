/** Motion tokens for K8 scenes. Motion follows values the activity already holds and never writes back to evidence. */
export const ECO_MOTION = {
  cameraLambda: 3.5,
  /** Fish easing between neutral and swimming. */
  fishLambda: 3,
  /** Length of the heat / cold stress sequence (s). */
  stressSeconds: 6,
  /** Water tint and thermometer following the temperature. */
  valueLambda: 6,
  /** Base swim speed (rad/s along each fish's loop). */
  swim: 0.32,
  /** Weed and reed sway (rad/s). */
  sway: 1.1,
} as const;
