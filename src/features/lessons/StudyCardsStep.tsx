import { useEffect, useState } from "react";
import { api, type StudentLearningStep, type StudentPathway } from "../../lib/api";
import { withAssignmentContext } from "./lesson-catalog";

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
      setError(e instanceof Error ? e.message : "Chưa lưu được lượt ôn thẻ");
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
  if (!card) return <p role="status">Chưa có thẻ học khả dụng.</p>;
  const isLast = index === cards.length - 1;
  const allVisited = visited.size === cards.length;
  return (
    <section className="study-cards" aria-label="Thẻ ghi nhớ" tabIndex={0}>
      <div className="study-cards-toolbar"><span>Thẻ {index + 1} / {cards.length}</span><span>{visited.size} / {cards.length} đã xem</span></div>
      <button type="button" className="study-card" onClick={() => setShowBack((value) => !value)} aria-label="Hiện mặt sau của thẻ">
        <span className="study-card-label">{showBack ? "Mặt sau" : "Mặt trước"}</span><strong>{showBack ? card.back : card.front}</strong>
      </button>
      <div className="study-card-actions">
        <button type="button" className="secondary" disabled={index === 0} onClick={() => { setIndex((value) => value - 1); setShowBack(false); }}>Trước</button>
        <button type="button" className="secondary" onClick={() => void visit()} disabled={saveState === "saving"}>{saveState === "saving" ? "Đang lưu…" : "Đánh dấu đã xem"}</button>
        <button type="button" className="secondary" disabled={isLast} onClick={() => { setIndex((value) => value + 1); setShowBack(false); }}>Sau</button>
      </div>
      {isLast && <button type="button" className="primary" disabled={!allVisited || saveState === "saving"} onClick={() => void visit(true)}>{allVisited ? "Hoàn thành ôn thẻ" : "Xem đủ tất cả thẻ để hoàn thành"}</button>}
      {saveState === "error" && <p role="alert">{error} <button type="button" onClick={() => void visit(isLast && allVisited)}>Thử lại</button></p>}
    </section>
  );
}
