/**
 * First step of "Assign a lab" on the Class Lab page: the teacher picks the kind of lab work, by what the students will do.
 * Explore opens the class-template flow here; a Guided lab keeps its own flow (pick a released lab, edit its questions in the Lab Space).
 */
import { ArrowRight, Compass, ListChecks } from "lucide-react";
import { useId } from "react";
import { Modal } from "../../components/ui";
import { defineText } from "../../i18n";
import guidedImage from "../labs/assets/thumbnails/lever-equilibrium.webp";
import exploreImage from "../labs/assets/thumbnails/acid-base-indicators.webp";
import type { ClassSummary } from "./class-types";
import "./teacher-operations.css";

const text = defineText({
  vi: {
    title: (name: string) => `Giao lab cho ${name}`,
    explore: "Khám phá tự do",
    exploreHelp: "Chọn mẫu và cấu hình bàn. Học sinh tự thử nghiệm, nộp số đo và lời giải thích để bạn nhận xét.",
    guided: "Có hướng dẫn",
    guidedHelp: "Chọn lab đã phát hành và chỉnh câu hỏi. Học sinh thực hành theo từng bước.",
  },
  en: {
    title: (name: string) => `Assign a lab to ${name}`,
    explore: "Free explore",
    exploreHelp: "Pick a template and set up the bench. Students experiment and submit readings and an explanation for your feedback.",
    guided: "Guided",
    guidedHelp: "Choose a released lab and edit its questions. Students follow the experiment step by step.",
  },
});

export function AssignLabChooser({ classroom, onExplore, onGuided, onClose }: { classroom: ClassSummary; onExplore: () => void; onGuided: () => void; onClose: () => void }) {
  const t = text();
  const id = useId();
  const options = [
    { kind: "guided", title: t.guided, help: t.guidedHelp, Icon: ListChecks, image: guidedImage, onChoose: onGuided },
    { kind: "explore", title: t.explore, help: t.exploreHelp, Icon: Compass, image: exploreImage, onChoose: onExplore },
  ];
  return (
    <Modal title={t.title(classroom.name)} onClose={onClose}>
      <div className="assign-lab-options">
        {options.map(({ kind, title, help, Icon, image, onChoose }) => (
          <button key={kind} type="button" className="assign-lab-option" onClick={onChoose}
            aria-labelledby={`${id}-${kind}-title`} aria-describedby={`${id}-${kind}-help`}>
            <img className="assign-lab-option-image" src={image} alt="" width={1280} height={720} decoding="async" />
            <span className="assign-lab-option-copy">
              <span className="assign-lab-option-title" id={`${id}-${kind}-title`}><Icon size={18} aria-hidden="true" />{title}</span>
              <span className="assign-lab-option-help" id={`${id}-${kind}-help`}>{help}</span>
            </span>
            <ArrowRight size={18} className="assign-lab-option-arrow" aria-hidden="true" />
          </button>
        ))}
      </div>
    </Modal>
  );
}
