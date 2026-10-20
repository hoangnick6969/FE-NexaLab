import { useEffect, useState } from "react";
import { api, type StudentLearningStep, type StudentPathway } from "../../lib/api";
import { withAssignmentContext } from "./lesson-catalog";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    saveFailed: "Chưa lưu được lượt ôn thẻ",
    none: "Chưa có thẻ học khả dụng.",
    region: "Thẻ ghi nhớ",
    card: (n: number, total: number) => `Thẻ ${n} / ${total}`,
    seen: (n: number, total: number) => `${n} / ${total} đã xem`,
    flip: "Hiện mặt sau của thẻ",
    back: "Mặt sau",
    front: "Mặt trước",
    previous: "Trước",
    saving: "Đang lưu…",
    markSeen: "Đánh dấu đã xem",
    finish: "Hoàn thành ôn thẻ",
    seeAll: "Xem đủ tất cả thẻ để hoàn thành",
    retry: "Thử lại",
  },
  en: {
    saveFailed: "This review could not be saved",
    none: "No study cards are available yet.",
    region: "Study cards",
    card: (n: number, total: number) => `Card ${n} / ${total}`,
    seen: (n: number, total: number) => `${n} / ${total} seen`,
    flip: "Show the back of the card",
    back: "Back",
    front: "Front",
    previous: "Previous",
    saving: "Saving…",
    markSeen: "Mark as seen",
    finish: "Finish the review",
    seeAll: "See every card to finish",
    retry: "Try again",
  },
});
const t = text();

export function StudyCardsStep({
  lessonId,
  assignmentId,
  step,
  onReconciled,
}: {
  lessonId: string;
  assignmentId: string;
  step: StudentLearningStep;
  onReconciled: (pathway: StudentPathway) => void;
}) {
  const cards = step.resource?.cards ?? [];
  const visited = new Set<string>(step.visitedCardIds ?? []);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const card = cards[index];
  const visit = async (complete = false) => {
    if (!card || saveState === "saving") return;
    setSaveState("saving");
    setError("");
    try {
      const updated = await api<{ pathway: StudentPathway }>(withAssignmentContext(`/lessons/${lessonId}/steps/${step.id}/progress`, assignmentId), "PUT", {
        action: complete ? "complete" : "visit",
        cardIndex: index,
      });
      onReconciled(updated.pathway);
      setSaveState("idle");
    } catch (e) {
      setSaveState("error");
      setError(e instanceof Error ? e.message : t.saveFailed);
    }
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight") setIndex((value) => Math.min(cards.length - 1, value + 1));
      if (event.key === "Enter" || event.key === " ") void visit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cards.length, index, saveState]);
  if (!card) return <p role="status">{t.none}</p>;
  const isLast = index === cards.length - 1;
  const allVisited = visited.size === cards.length;
  return (
    <section className="study-cards" aria-label={t.region} tabIndex={0}>
      <div className="study-cards-toolbar"><span>{t.card(index + 1, cards.length)}</span><span>{t.seen(visited.size, cards.length)}</span></div>
      <button type="button" className="study-card" onClick={() => setShowBack((value) => !value)} aria-label={t.flip}>
        <span className="study-card-label">{showBack ? t.back : t.front}</span><strong>{showBack ? card.back : card.front}</strong>
      </button>
      <div className="study-card-actions">
        <button type="button" className="secondary" disabled={index === 0} onClick={() => { setIndex((value) => value - 1); setShowBack(false); }}>{t.previous}</button>
        <button type="button" className="secondary" onClick={() => void visit()} disabled={saveState === "saving"}>{saveState === "saving" ? t.saving : t.markSeen}</button>
        <button type="button" className="secondary" disabled={isLast} onClick={() => { setIndex((value) => value + 1); setShowBack(false); }}>Sau</button>
      </div>
      {isLast && <button type="button" className="primary" disabled={!allVisited || saveState === "saving"} onClick={() => void visit(true)}>{allVisited ? t.finish : t.seeAll}</button>}
      {saveState === "error" && <p role="alert">{error} <button type="button" onClick={() => void visit(isLast && allVisited)}>{t.retry}</button></p>}
    </section>
  );
}
