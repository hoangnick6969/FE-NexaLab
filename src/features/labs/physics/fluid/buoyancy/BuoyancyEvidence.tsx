import { z } from "zod";
import { k3LabConfigSchema } from "../kit/k3-config";

export const buoyancyPresentationSchema = z.object({
  fluidDensityKgM3: z.number().finite().positive().max(2000), gravity: z.number().finite().positive().max(20),
  volumeToleranceMl: z.number().finite().positive(), forceToleranceN: z.number().finite().positive(),
  specimens: z.array(z.object({ id: z.string(), label: z.string(), massG: z.number().positive(), volumeMl: z.number().positive() })).min(1),
  kit: k3LabConfigSchema,
}).superRefine((config, ctx) => {
  for (const specimen of config.specimens) {
    const mesh = config.kit.specimens.find((item) => item.id === specimen.id);
    const volume = mesh?.shape === "box" ? mesh.sizeMm.reduce((a, b) => a * b, 1) / 1000 : mesh?.volumeMl;
    if (!mesh || mesh.massG !== specimen.massG || Math.abs((volume ?? 0) - specimen.volumeMl) > 1e-6)
      ctx.addIssue({ code: "custom", message: "Specimen physics and geometry do not match" });
  }
});
export type BuoyancyPresentation = z.infer<typeof buoyancyPresentationSchema>;
export type BuoyancyEvidence = { specimenId: string; submergedVolumeMl: number; overflowMl: number | null; measuredBuoyantForceN: number | null };
export const defaultBuoyancyEvidence = (): BuoyancyEvidence => ({ specimenId: "iron-1v", submergedVolumeMl: 0, overflowMl: null, measuredBuoyantForceN: null });
export const buoyancyEvidenceReady = (value: unknown) => z.object({ specimenId: z.string().min(1), submergedVolumeMl: z.number().positive(), overflowMl: z.number().finite().min(0).max(500), measuredBuoyantForceN: z.number().finite().min(0).max(50) }).safeParse(value).success;
export function BuoyancyResult({ result, verdict }: { result: any; verdict: string }) {
  return <div data-testid="buoyancy-result"><p>{verdict === "passed" ? "Đã kiểm chứng lực đẩy Ác-si-mét" : "Cần kiểm tra lại số đo"}</p><p>{result?.assessment?.score} / {result?.assessment?.maximumScore}</p><p>Sai số thể tích: {result?.volumeErrorMl} mL; sai số lực: {result?.forceErrorN} N</p></div>;
}
export const buoyancyCopy = () => ({ submit: "Nộp kết quả FL-05", waiting: "Đang chấm kết quả…", resultTitle: "Kết quả FL-05", assessment: "Tiêu chí kiểm chứng" });
