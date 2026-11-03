import { Check, X } from "lucide-react";
import { defineText } from "../../../../../i18n";
import { EYE_PART_IDS, type EyePartId } from "../kit/EyeModel";
import { EYE_PART_LABELS } from "./eye-optics-evidence";

const text = defineText({
  vi: {
    submit: "Nộp bài", waiting: "Đang chấm trên máy chủ…", resultTitle: "Kết quả", assessment: "Điểm theo tiêu chí",
    passed: "Em đã đạt tất cả tiêu chí.", needsPractice: "Em cần luyện thêm ở một số tiêu chí.",
    met: "Đạt", notMet: "Chưa đạt",
    phase1: (score: number, total: number) => `Gọi tên bộ phận: ${score}/${total}`,
    phase2: (score: number, total: number) => `Điều tiết và kính: ${score}/${total}`,
    reasons: { focus: "ảnh chưa rơi đúng trên màng lưới", distance: "khoảng cách vật chưa đúng", glasses: "kính chưa đúng loại", relaxedFar: "nhìn xa cần thể thủy tinh thư giãn" } as Record<string, string>,
    scenarioName: { "normal-near": "Mắt bình thường, vật gần", "myopia-far": "Mắt cận thị nhẹ, vật xa", "hyperopia-near": "Mắt viễn thị, vật gần" } as Record<string, string>,
  },
  en: {
    submit: "Submit", waiting: "Marking on the server…", resultTitle: "Result", assessment: "Score by criterion",
    passed: "You met every criterion.", needsPractice: "Some criteria need more practice.",
    met: "Met", notMet: "Not met",
    phase1: (score: number, total: number) => `Naming parts: ${score}/${total}`,
    phase2: (score: number, total: number) => `Accommodation and lenses: ${score}/${total}`,
    reasons: { focus: "the image is not on the retina", distance: "the object distance is wrong", glasses: "the lens type is wrong", relaxedFar: "a distant object needs a relaxed lens" } as Record<string, string>,
    scenarioName: { "normal-near": "Normal eye, near object", "myopia-far": "Mildly myopic eye, far object", "hyperopia-near": "Hyperopic eye, near object" } as Record<string, string>,
  },
});

/** Copy for the run host; the result text below comes from the server only. */
export const eyeOpticsCopy = () => {
  const t = text();
  return { submit: t.submit, waiting: t.waiting, resultTitle: t.resultTitle, assessment: t.assessment };
};

/** Renders the stored server result. Nothing here scores or recomputes the optics. */
export function EyeOpticsResult({ result, verdict }: { result: any; verdict: string }) {
  const t = text();
  const assessment = result?.assessment;
  const unmet: string[] = Array.isArray(assessment?.unmetCriteria) ? assessment.unmetCriteria : [];
  const phase1Unmet = new Set(unmet.filter((item) => item.startsWith("phase1:")).map((item) => item.slice("phase1:".length)));
  const phase2Unmet = unmet.filter((item) => item.startsWith("phase2:"));
  const passed = verdict === "passed";

  return (
    <section className="eye-optics-result" aria-label={t.resultTitle}>
      <p className="eye-optics-result-verdict">{passed ? t.passed : t.needsPractice}</p>
      {assessment && (
        <p className="tiny muted">{t.phase1(assessment.phase1Score ?? 0, EYE_PART_IDS.length)} · {t.phase2(assessment.phase2Score ?? 0, 3)}</p>
      )}
      <ul className="eye-optics-criteria">
        {EYE_PART_IDS.map((id: EyePartId) => {
          const ok = !phase1Unmet.has(id);
          return (
            <li key={id}>
              {ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
              <span>{EYE_PART_LABELS[id]}</span>
              <span className="visually-hidden">{ok ? t.met : t.notMet}</span>
            </li>
          );
        })}
        {phase2Unmet.map((item) => {
          const [, scenarioId, reasons] = item.split(":");
          const names = reasons.split("+").map((reason) => t.reasons[reason] ?? reason).join("; ");
          return (
            <li key={item}>
              <X size={14} aria-hidden />
              <span>{t.scenarioName[scenarioId] ?? scenarioId}: {names}</span>
              <span className="visually-hidden">{t.notMet}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
