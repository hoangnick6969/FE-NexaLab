import { AlarmClock, CalendarClock, ClipboardList, FileCheck2, FileText, Hourglass, Info, OctagonAlert, UserCheck, UserPlus, XCircle, type LucideIcon } from "lucide-react";
import { defineText, formatDateTime, formatRelative } from "../../i18n";
import { toneOf, type Notice } from "./notices";

const text = defineText({
  vi: {
    unread: "Chưa đọc",
    tags: { ASSIGNMENT_OVERDUE: "Quá hạn", LATE_REJECTED: "Bị từ chối", ASSIGNMENT_DUE_SOON: "Sắp đến hạn", LATE_SUBMISSION_PENDING: "Cần duyệt", ENROLLMENT_REQUESTED: "Cần duyệt" } as Record<string, string>,
  },
  en: {
    unread: "Unread",
    tags: { ASSIGNMENT_OVERDUE: "Overdue", LATE_REJECTED: "Rejected", ASSIGNMENT_DUE_SOON: "Due soon", LATE_SUBMISSION_PENDING: "Needs review", ENROLLMENT_REQUESTED: "Needs review" } as Record<string, string>,
  },
});

const ICONS: Record<string, LucideIcon> = {
  ASSIGNMENT_OVERDUE: OctagonAlert,
  LATE_REJECTED: XCircle,
  ASSIGNMENT_DUE_SOON: AlarmClock,
  LATE_SUBMISSION_PENDING: Hourglass,
  ENROLLMENT_REQUESTED: UserPlus,
  ASSIGNMENT_CREATED: ClipboardList,
  DEADLINE_EXTENDED: CalendarClock,
  SUBMISSION_RECEIVED: FileCheck2,
  RESOURCE_PUBLISHED: FileText,
  ENROLLMENT_APPROVED: UserCheck,
};

/** Icon tile coloured by how urgent the notice type is (see TONES). */
export function NoticeIcon({ notice }: { notice: Pick<Notice, "type"> }) {
  const Icon = ICONS[notice.type] ?? Info;
  return (
    <span className={`notice-icon tone-${toneOf(notice)}`} aria-hidden="true">
      <Icon size={16} strokeWidth={2.2} />
    </span>
  );
}

/** One notice row for the dropdown and the full list: icon, title, two-line body, then tag, relative time and unread. */
export function NoticeItem({ notice, onOpen }: { notice: Notice; onOpen: (notice: Notice) => void }) {
  const t = text();
  const tag = !notice.readAt ? t.tags[notice.type] : undefined;
  return (
    <button type="button" className={`notice-item tone-${toneOf(notice)}${notice.readAt ? "" : " unread"}`} onClick={() => onOpen(notice)}>
      <NoticeIcon notice={notice} />
      <span className="notice-item-text">
        <b>{notice.title}</b>
        {notice.body && <span className="notice-item-body">{notice.body}</span>}
        <span className="notice-item-meta">
          {tag && <span className="notice-tag">{tag}</span>}
          <time dateTime={notice.createdAt} title={formatDateTime(notice.createdAt)}>
            {formatRelative(notice.createdAt)}
          </time>
          {!notice.readAt && <span className="notice-unread">{t.unread}</span>}
        </span>
      </span>
    </button>
  );
}

/** A titled run of notices; the dropdown and the page style it through their own containers. */
export function NoticeGroup({ title, notices, onOpen }: { title?: string; notices: Notice[]; onOpen: (notice: Notice) => void }) {
  return (
    <div className="notice-group">
      {title && <h3>{title}</h3>}
      <ul className="notice-list">
        {notices.map((notice) => (
          <li key={notice.id}>
            <NoticeItem notice={notice} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </div>
  );
}
