import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Empty, ErrorBox } from "../../components/ui";
import { ParentRowsSkeleton } from "./ParentSkeletons";
import { defineText, formatDateTime } from "../../i18n";

/** SAI-05 (BR-11): how often a linked child asked for hints, by level per Lab. Counts only, never content. */
type HelpSeekingLab = {
  labId: string;
  labTitle: string;
  total: number;
  byLevel: { 1: number; 2: number; 3: number; 4: number };
  reflections: number;
  lastAt: string;
};

const LEVELS = [1, 2, 3, 4] as const;

const text = defineText({
  vi: {
    title: "Con đã xin gợi ý bao nhiêu lần",
    loading: "Đang tải số lần xin gợi ý…",
    none: "Con chưa xin gợi ý ở bài thí nghiệm nào.",
    totalOf: (n: number) => `${n} lần`,
    level: ["Mức 1: câu hỏi gợi mở", "Mức 2: khái niệm", "Mức 3: thao tác", "Mức 4: giải thích"],
    reflections: "Suy ngẫm sau quan sát",
    lastAt: "Lần gần nhất",
    note: "Chỉ hiển thị số lần, không hiển thị nội dung gợi ý hay câu trả lời của con. Xin gợi ý là cách học bình thường, không làm giảm điểm.",
  },
  en: {
    title: "How often your child asked for hints",
    loading: "Loading hint counts…",
    none: "Your child has not asked for hints in any Lab yet.",
    totalOf: (n: number) => `${n} ${n === 1 ? "time" : "times"}`,
    level: ["Level 1: guiding question", "Level 2: concept", "Level 3: action", "Level 4: explanation"],
    reflections: "Reflections after observing",
    lastAt: "Most recent",
    note: "Counts only: never the hint text or your child's answers. Asking for hints is a normal way to learn and never lowers the score.",
  },
});

export function HelpSeekingPanel({ studentId }: { studentId: string }) {
  const t = text();
  const q = useQuery<{ labs: HelpSeekingLab[] }>({
    queryKey: ["help-seeking", studentId],
    queryFn: () => api("/children/" + encodeURIComponent(studentId) + "/help-seeking"),
  });
  return (
    <section className="pp-section" aria-labelledby="help-seeking-title" data-testid="help-seeking">
      <div className="pp-section-head"><h2 id="help-seeking-title">{t.title}</h2></div>
      <ErrorBox error={q.error} />
      {q.isLoading ? (
        <ParentRowsSkeleton label={t.loading} />
      ) : q.data?.labs.length ? (
        <ul className="pp-hints">
          {q.data.labs.map((lab) => (
            <li key={lab.labId} className="pp-hint-lab" data-lab={lab.labId}>
              <div className="pp-hint-head">
                <b>{lab.labTitle}</b>
                <span className="pp-hint-total">{t.totalOf(lab.total)}</span>
              </div>
              <dl className="pp-levels">
                {LEVELS.map((level) => (
                  <div key={level} data-level={level}><dt>{t.level[level - 1]}</dt><dd>{lab.byLevel[level]}</dd></div>
                ))}
                <div data-level="0"><dt>{t.reflections}</dt><dd>{lab.reflections}</dd></div>
              </dl>
              <span className="pp-hint-last">{t.lastAt}: {formatDateTime(lab.lastAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        !q.error && <Empty>{t.none}</Empty>
      )}
      <p className="pp-note">{t.note}</p>
    </section>
  );
}
