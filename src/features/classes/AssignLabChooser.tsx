/**
 * First step of "Assign a lab" on the Class Lab page: the teacher picks the kind of lab work, by what the students will do.
 * Explore opens the class-template flow here; a Guided lab keeps its own flow (pick a released lab, edit its questions in the Lab Space).
 */
import { FlaskConical, ListChecks } from "lucide-react";
import { Modal } from "../../components/ui";
import { defineText } from "../../i18n";
import type { ClassSummary } from "./class-types";
import "./teacher-operations.css";

const text = defineText({
  vi: {
    title: (name: string) => `Giao lab cho ${name}`,
    explore: "Thí nghiệm tự do có đề",
    exploreHelp: "Học sinh tự thao tác trên bàn thí nghiệm bạn đã chọn mẫu, rồi nộp số đo và lời giải thích. Bài không chấm điểm, giáo viên nhận xét.",
    guided: "Lab theo bước, sửa câu hỏi",
    guidedHelp: "Chọn một lab nền tảng đã phát hành, chỉnh câu hỏi ngay trong phòng thí nghiệm rồi giao cho lớp.",
  },
  en: {
    title: (name: string) => `Assign a lab to ${name}`,
    explore: "Free experiment with a task",
    exploreHelp: "Students work at a bench set up from the template you pick, then hand in their readings and an explanation. Not graded; you comment.",
    guided: "Step-by-step lab, edit the questions",
    guidedHelp: "Pick a released foundational lab, edit its questions in the lab itself, then assign it to the class.",
  },
});

export function AssignLabChooser({ classroom, onExplore, onGuided, onClose }: { classroom: ClassSummary; onExplore: () => void; onGuided: () => void; onClose: () => void }) {
  const t = text();
  return (
    <Modal title={t.title(classroom.name)} onClose={onClose}>
      <div className="assign-lab-options">
        <button type="button" className="assign-lab-option" onClick={onExplore}>
          <FlaskConical size={22} aria-hidden="true" />
          <span><strong>{t.explore}</strong><span>{t.exploreHelp}</span></span>
        </button>
        <button type="button" className="assign-lab-option" onClick={onGuided}>
          <ListChecks size={22} aria-hidden="true" />
          <span><strong>{t.guided}</strong><span>{t.guidedHelp}</span></span>
        </button>
      </div>
    </Modal>
  );
}
