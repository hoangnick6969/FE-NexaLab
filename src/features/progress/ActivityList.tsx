import { HelpCircle, FlaskConical, ChevronRight } from "lucide-react";
import { type ActivityItem } from "../../lib/api";
import { Badge, verdictLabel } from "../../components/ui";
import { type SheetView, stepNames, time, verdictTone } from "./progress-format";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    today: "Hôm nay",
    thisWeek: "Tuần này",
    earlier: "Trước đó",
    quiz: "Quiz",
    practice: "Thực hành",
    lab: "Phòng lab",
    legacy: " · Bản ghi cũ, có thể thiếu liên kết bài học",
    passed: "Đạt",
    notPassed: "Chưa đạt",
    unknown: "Không rõ",
    details: "Xem chi tiết",
  },
  en: {
    today: "Today",
    thisWeek: "This week",
    earlier: "Earlier",
    quiz: "Quiz",
    practice: "Practice",
    lab: "Lab",
    legacy: " · Older record, the lesson link may be missing",
    passed: "Passed",
    notPassed: "Not passed",
    unknown: "Unknown",
    details: "See details",
  },
});
const t = text();

function groupOf(value: string, now = new Date()) {
  const date = new Date(value);
  if (date.toDateString() === now.toDateString()) return t.today;
  if (now.getTime() - date.getTime() < 7 * 86400000) return t.thisWeek;
  return t.earlier;
}

export function ActivityGroups({
  items,
  onOpen,
}: {
  items: ActivityItem[];
  onOpen: (view: SheetView, event: React.MouseEvent<HTMLElement>) => void;
}) {
  const groups = items.reduce<Array<{ label: string; items: ActivityItem[] }>>((all, item) => {
    const label = groupOf(item.occurredAt);
    if (all.at(-1)?.label === label) all.at(-1)!.items.push(item);
    else all.push({ label, items: [item] });
    return all;
  }, []);
  return (
    <>
      {groups.map((group, index) => (
        <div className="activity-group" key={group.label + index}>
          <h3>{group.label}</h3>
          <ul className="activity-list">
            {group.items.map((item) => (
              <ActivityRow key={item.kind + item.id} item={item} onOpen={onOpen} />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function ActivityRow({ item, onOpen }: { item: ActivityItem; onOpen: (view: SheetView, event: React.MouseEvent<HTMLElement>) => void }) {
  return (
    <li className="activity-row">
      <Badge tone="outline">
        <span className="activity-kind-badge">
          {item.kind === "QUIZ" ? (
            <HelpCircle size={13} className="activity-kind-icon" aria-hidden="true" />
          ) : (
            <FlaskConical size={13} className="activity-kind-icon" aria-hidden="true" />
          )}
          <span>{item.kind === "QUIZ" ? t.quiz : t.practice}</span>
        </span>
      </Badge>
      <div className="activity-title">
        <b>{item.title}</b>
        <span className="tiny muted">
          {item.stepType ? stepNames[item.stepType] : item.labTitle ?? t.lab}
          {item.legacy && t.legacy}
        </span>
      </div>
      {item.kind === "QUIZ" ? (
        <Badge tone={item.passed ? "passed" : "practice"}>{item.passed ? t.passed : t.notPassed}</Badge>
      ) : (
        <Badge tone={verdictTone(item.verdict)}>{item.verdict ? verdictLabel(item.verdict) : t.unknown}</Badge>
      )}
      <time dateTime={item.occurredAt} className="tiny muted">{time(item.occurredAt)}</time>
      <button
        type="button"
        className="link-button activity-details-btn"
        onClick={(event) => onOpen(item.kind === "QUIZ" ? { kind: "quiz", id: item.id } : { kind: "practical", id: item.id }, event)}
      >
        <span>{t.details}</span>
        <ChevronRight size={13} aria-hidden="true" />
      </button>
    </li>
  );
}
