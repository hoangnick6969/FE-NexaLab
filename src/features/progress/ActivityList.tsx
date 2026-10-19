import { type ActivityItem } from "../../lib/api";
import { Badge, verdictLabel } from "../../components/ui";
import { type SheetView, stepNames, time, verdictTone } from "./progress-format";

function groupOf(value: string, now = new Date()) {
  const date = new Date(value);
  if (date.toDateString() === now.toDateString()) return "Hôm nay";
  if (now.getTime() - date.getTime() < 7 * 86400000) return "Tuần này";
  return "Trước đó";
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
      <Badge tone="outline">{item.kind === "QUIZ" ? "Quiz" : "Thực hành"}</Badge>
      <div className="activity-title">
        <b>{item.title}</b>
        <span className="tiny muted">
          {item.stepType ? stepNames[item.stepType] : item.labTitle ?? "Phòng lab"}
          {item.legacy && " · Bản ghi cũ, có thể thiếu liên kết bài học"}
        </span>
      </div>
      {item.kind === "QUIZ" ? (
        <Badge tone={item.passed ? "passed" : "practice"}>{item.passed ? "Đạt" : "Chưa đạt"}</Badge>
      ) : (
        <Badge tone={verdictTone(item.verdict)}>{item.verdict ? verdictLabel(item.verdict) : "Không rõ"}</Badge>
      )}
      <time dateTime={item.occurredAt} className="tiny muted">{time(item.occurredAt)}</time>
      <button
        type="button"
        className="link-button"
        onClick={(event) => onOpen(item.kind === "QUIZ" ? { kind: "quiz", id: item.id } : { kind: "practical", id: item.id }, event)}
      >
        Xem chi tiết
      </button>
    </li>
  );
}
