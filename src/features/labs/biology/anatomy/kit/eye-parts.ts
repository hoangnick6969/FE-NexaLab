/** Part ids match `eyeParts` in the server model; the rubric uses these ids. */
export const EYE_PART_IDS = ["cornea", "aqueous", "pupil", "lens", "vitreous", "retina", "nerve", "sclera"] as const;
export type EyePartId = (typeof EYE_PART_IDS)[number];

