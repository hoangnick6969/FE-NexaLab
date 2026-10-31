import { z } from "zod";

/**
 * Double-helix geometry a Lab hands to K7 (values from its pinned pack). The
 * same numbers drive the 3D helix, the ångström ruler and the 2D diagram, so
 * what the learner reads in the scene matches the reviewed source.
 */
export const k7StructureSchema = z.object({
  /** Base pairs in one full turn. */
  bpPerTurn: z.number().int().min(8).max(12),
  /** Length of one turn along the axis, in ångström. */
  turnLengthA: z.number().positive(),
  /** Rise per base pair, in ångström. */
  riseA: z.number().positive(),
  /** Helix diameter between the phosphate backbones, in ångström. */
  diameterA: z.number().positive(),
}).strict().superRefine((structure, ctx) => {
  if (Math.abs(structure.bpPerTurn * structure.riseA - structure.turnLengthA) > 0.05)
    ctx.addIssue({ code: "custom", message: "turnLengthA must equal bpPerTurn × riseA" });
});

export type K7Structure = z.infer<typeof k7StructureSchema>;
