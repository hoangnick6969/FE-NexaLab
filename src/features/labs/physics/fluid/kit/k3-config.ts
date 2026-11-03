import { z } from "zod";

/**
 * K3 fluid-bench Lab configuration (FL-03 density, later FL-04/FL-05).
 *
 * The same shape is meant for a reviewed pack template, so a launch can hand
 * it to the renderer. The renderer only presents these values: official
 * readings, densities and scores are recomputed by the server model/rubric.
 * Specimen masses are reviewed facts of the virtual object; they must agree
 * with `referenceDensityGcm3 × volume` within the pack's review tolerance.
 */

const id = z.string().regex(/^[a-z0-9-]{1,60}$/);
const positive = z.number().finite().positive();
const label = z.object({ vi: z.string().min(1).max(80), en: z.string().min(1).max(80) }).strict();
const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);

export const k3MaterialSchema = z.object({
  id,
  label,
  kind: z.enum(["metal", "wood", "stone", "liquid"]),
  /** Reviewed reference value used for feedback, never for drawing. */
  referenceDensityGcm3: positive,
  appearance: z.object({ color: hexColor, roughness: z.number().min(0).max(1), metalness: z.number().min(0).max(1) }).strict(),
}).strict();

export const k3InstrumentsSchema = z.object({
  balance: z.object({ capacityG: positive, resolutionG: positive }).strict(),
  cylinder: z.object({
    capacityMl: positive,
    resolutionMl: positive,
    innerDiameterMm: positive,
    wallMm: positive,
    /** Glass above the top graduation and below the zero line. */
    headroomMm: positive,
    baseMm: positive,
  }).strict(),
  ruler: z.object({ lengthMm: positive, resolutionMm: positive }).strict(),
  beaker: z.object({ capacityMl: positive, innerDiameterMm: positive, heightMm: positive, emptyMassG: positive }).strict(),
  dynamometer: z.object({ minN: z.literal(0), maxN: positive, resolutionN: positive, springConstantNPerM: positive, springMassKg: positive }).strict().optional(),
  overflowCan: z.object({ capacityMl: positive, innerDiameterMm: positive, heightMm: positive, spoutDiameterMm: positive }).strict().optional(),
}).strict();

export const k3SpecimenSchema = z.discriminatedUnion("shape", [
  z.object({ shape: z.literal("box"), id, materialId: id, sizeMm: z.tuple([positive, positive, positive]), massG: positive }).strict(),
  z.object({
    shape: z.literal("irregular"), id, materialId: id, volumeMl: positive, massG: positive,
    /** Largest width, so the object must fit through the cylinder mouth. */
    maxWidthMm: positive,
    /** Seed for the procedural surface; same seed, same pebble. */
    seed: z.number().int().nonnegative(),
  }).strict(),
]);

export const k3TolerancesSchema = z.object({
  /** Reading accepted within this many instrument divisions. */
  readingDivisions: positive,
  /** Learner calculation accepted within this relative error of their own m/V. */
  relativeCalculation: positive,
  /** Band around the reference density shown as observational feedback. */
  referenceBand: positive,
}).strict();

export const k3LabConfigSchema = z.object({
  configVersion: z.literal(1),
  /** Values remain proposals until a reviewer signs the release digest. */
  reviewStatus: z.enum(["PROPOSED_UNAPPROVED", "REVIEWED"]),
  instruments: k3InstrumentsSchema,
  materials: z.array(k3MaterialSchema).min(1),
  specimens: z.array(k3SpecimenSchema).min(1),
  tolerances: k3TolerancesSchema,
}).strict().superRefine((config, ctx) => {
  const materials = new Set(config.materials.map((material) => material.id));
  if (materials.size !== config.materials.length) ctx.addIssue({ code: "custom", message: "Duplicate material id" });
  const specimens = new Set(config.specimens.map((specimen) => specimen.id));
  if (specimens.size !== config.specimens.length) ctx.addIssue({ code: "custom", message: "Duplicate specimen id" });
  const { cylinder, balance } = config.instruments;
  for (const specimen of config.specimens) {
    if (!materials.has(specimen.materialId)) ctx.addIssue({ code: "custom", message: `${specimen.id}: unknown material ${specimen.materialId}` });
    if (specimen.massG > balance.capacityG) ctx.addIssue({ code: "custom", message: `${specimen.id}: heavier than the balance capacity` });
    if (specimen.shape === "irregular" && specimen.maxWidthMm >= cylinder.innerDiameterMm)
      ctx.addIssue({ code: "custom", message: `${specimen.id}: does not fit through the cylinder` });
  }
});

export type K3Material = z.infer<typeof k3MaterialSchema>;
export type K3Instruments = z.infer<typeof k3InstrumentsSchema>;
export type K3Specimen = z.infer<typeof k3SpecimenSchema>;
export type K3LabConfig = z.infer<typeof k3LabConfigSchema>;

/** Fails closed: an invalid pack template never reaches the renderer. */
export const parseK3LabConfig = (raw: unknown): K3LabConfig => k3LabConfigSchema.parse(raw);

export function k3Material(config: K3LabConfig, materialId: string) {
  const material = config.materials.find((item) => item.id === materialId);
  if (!material) throw new Error(`Unknown K3 material ${materialId}`);
  return material;
}

export function k3Specimen(config: K3LabConfig, specimenId: string) {
  const specimen = config.specimens.find((item) => item.id === specimenId);
  if (!specimen) throw new Error(`Unknown K3 specimen ${specimenId}`);
  return specimen;
}
