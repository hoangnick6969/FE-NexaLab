import { Check, X } from "lucide-react";
import { defineText } from "../../../../../i18n";

const text = defineText({
  vi: {
    submit: "Nộp bài", waiting: "Đang chấm trên máy chủ…", resultTitle: "Kết quả", assessment: "Điểm theo tiêu chí",
    passed: "Em đã đạt tất cả tiêu chí.", needsPractice: "Em cần luyện thêm ở một số trạm.", met: "Đạt", notMet: "Chưa đạt",
    replicationBases: (ok: number, total: number) => `Mạch mới khi tái bản: ${ok}/${total} nucleotide bổ sung đúng.`,
    transcriptionBases: (ok: number, total: number) => `mRNA khi phiên mã: ${ok}/${total} nucleotide đúng.`,
    translationRead: (count: number, stop: boolean) => `Dịch mã: đọc ${count} amino acid${stop ? ", dừng ở codon kết thúc" : ", chưa gặp codon kết thúc"}.`,
    criteria: { structure: "R1 Cấu trúc DNA", replication: "R2 Tái bản", transcription: "R3 Phiên mã", translation: "R4 Dịch mã", mutation: "R5 Đột biến", concept: "R6 Khái niệm" },
  },
  en: {
    submit: "Submit", waiting: "Marking on the server…", resultTitle: "Result", assessment: "Score by criterion",
    passed: "You met every criterion.", needsPractice: "Some stations need more practice.", met: "Met", notMet: "Not met",
    replicationBases: (ok: number, total: number) => `Replication new strand: ${ok}/${total} bases paired correctly.`,
    transcriptionBases: (ok: number, total: number) => `Transcribed mRNA: ${ok}/${total} bases correct.`,
    translationRead: (count: number, stop: boolean) => `Translation: ${count} amino acids read${stop ? ", stopped at the stop codon" : ", no stop codon reached"}.`,
    criteria: { structure: "R1 DNA structure", replication: "R2 Replication", transcription: "R3 Transcription", translation: "R4 Translation", mutation: "R5 Mutation", concept: "R6 Concepts" },
  },
});

const CRITERIA = ["structure", "replication", "transcription", "translation", "mutation", "concept"] as const;

/** Server feedback for the proposed rubric `gene-protein-stations@1`; renders the stored result, computes nothing. */
export function GeneResult({ result, verdict }: { result: any; verdict: string }) {
  const t = text();
  const assessment = result?.assessment;
  const unmet: string[] = Array.isArray(assessment?.unmetCriteria) ? assessment.unmetCriteria : [];
  const observed = result?.observations;
  return <div className="gene-result" data-testid="gene-result">
    <p className="bulb-result-message">{verdict === "passed" ? t.passed : t.needsPractice}</p>
    {assessment && <p className="bulb-result-score">{assessment.score} / {assessment.maximumScore}<small>{t.assessment}</small></p>}
    <ul className="k7-result-criteria">
      {CRITERIA.map((criterion) => {
        const ok = !unmet.some((item) => item === criterion || item.startsWith(`${criterion}:`));
        return <li key={criterion} data-met={ok}>
          {ok ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
          <span><b>{t.criteria[criterion]}</b>: {ok ? t.met : t.notMet}</span>
        </li>;
      })}
    </ul>
    {observed && <ul className="k7-result-criteria" data-testid="gene-result-observations">
      {observed.replication && <li><span>{t.replicationBases(observed.replication.correctBases, observed.replication.totalBases)}</span></li>}
      {observed.transcription && <li><span>{t.transcriptionBases(observed.transcription.correctBases, observed.transcription.totalBases)}</span></li>}
      {observed.translation && <li><span>{t.translationRead(observed.translation.residuesRead, observed.translation.reachedStop)}</span></li>}
    </ul>}
  </div>;
}

export const geneResultCopy = () => {
  const t = text();
  return { submit: t.submit, waiting: t.waiting, resultTitle: t.resultTitle, assessment: t.assessment };
};
