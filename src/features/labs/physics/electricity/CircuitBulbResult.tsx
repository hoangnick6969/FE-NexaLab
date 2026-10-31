import { defineText } from "../../../../i18n";

const text = defineText({
  vi: {
    goal: "Quan sát mạch điện đóng và mở",
    submit: "Nộp kết quả",
    closed: "Công tắc đóng", open: "Công tắc mở", on: "Bóng đèn sáng", off: "Bóng đèn tắt",
    correct: "Dự đoán đúng", incorrect: "Dự đoán chưa đúng", explanation: "Xem lại câu giải thích",
    passed: "Em đã hoàn thành tốt hoạt động này.", needsPractice: "Hãy xem lại phản hồi rồi thử lại từ đầu.",
    assessment: "Kết quả được chấm trên máy chủ", waiting: "Hoàn thành các bước trong sơ đồ để nộp bài.",
    resultTitle: "Kết quả bài làm",
  },
  en: {
    goal: "Observe open and closed circuits",
    submit: "Submit results",
    closed: "Switch closed", open: "Switch open", on: "Bulb on", off: "Bulb off",
    correct: "Correct prediction", incorrect: "Incorrect prediction", explanation: "Review the explanation",
    passed: "You completed this activity successfully.", needsPractice: "Review the feedback, then try the activity again.",
    assessment: "Result assessed by the server", waiting: "Complete the diagram steps to submit your work.",
    resultTitle: "Activity feedback",
  },
});

export const circuitBulbCopy = () => {
  const t = text();
  return { submit: t.submit, waiting: t.waiting, resultTitle: t.resultTitle, assessment: t.assessment };
};

/** Server feedback for the pinned bulb rubric; reads the stored result only. */
export function CircuitBulbResult({ result, verdict, describeObservation }: { result: any; verdict: string; describeObservation?: (item: any) => string }) {
  const t = text();
  return <>
    <p className="bulb-result-message">{verdict === "passed" ? t.passed : t.needsPractice}</p>
    <p className="bulb-result-score">{result.assessment?.score} / {result.assessment?.maximumScore}<small>{t.assessment}</small></p>
    <ul>
      {result.observations?.map((item: any) => (
        <li key={item.id}>
          {describeObservation ? describeObservation(item) : `${item.id === "CLOSED" ? t.closed : t.open}: ${item.scientificObservation?.bulbState === "ON" ? t.on : t.off} · ${item.predictionCorrect ? t.correct : t.incorrect}`}
        </li>
      ))}
      {result.assessment?.unmetCriteria?.includes("explanation") && <li>{t.explanation}</li>}
    </ul>
  </>;
}
