/**
 * Edit the due date or archive one assigned piece of work. Shared by the class's Assign tab and the Class Lab page, so a
 * teacher can manage a lab wherever they see it and the two places can never drift apart.
 */
import { useState } from "react";
import { Archive, Edit3 } from "lucide-react";
import { ErrorBox, Field, Modal } from "../../components/ui";
import { defineText } from "../../i18n";
import type { ClassSummary, TeacherAssignment } from "./class-types";
import { Confirm, dueLabel, toLocalInput, useMutate } from "./class-ui";

const text = defineText({
  vi: {
    edit: "Sửa",
    archive: "Lưu trữ",
    editAssigned: "Sửa bài đã giao",
    taskName: "Tên nhiệm vụ",
    testLocked: "Hạn nộp và danh sách học sinh của bài kiểm tra được chốt khi giao.",
    dueOptional: "Hạn nộp (có thể để trống)",
    saveChanges: "Lưu thay đổi",
    archiveAction: "lưu trữ bài",
    archiveDetail: "Bài rời khỏi danh sách của học sinh. Kết quả học tập đã có vẫn còn trong lịch sử.",
  },
  en: {
    edit: "Edit",
    archive: "Archive",
    editAssigned: "Edit assigned work",
    taskName: "Task name",
    testLocked: "A test's due date and students are fixed when it is assigned.",
    dueOptional: "Due date (optional)",
    saveChanges: "Save changes",
    archiveAction: "archive",
    archiveDetail: "It leaves the students' list. Existing results stay in the history.",
  },
});

type Target = { classroom: Pick<ClassSummary, "id">; assignment: TeacherAssignment; onClose: () => void };

export function EditAssignmentModal({ classroom, assignment, onClose }: Target) {
  const t = text();
  const act = useMutate();
  // A test's deadline only moves through a class-wide deadline revision.
  const dueLocked = assignment.contentType === "test" || assignment.contentType === "exam";
  return (
    <Modal title={t.editAssigned} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const due = String(form.get("dueDate") ?? "");
          const title = String(form.get("title"));
          act.mutate(
            {
              path: `/classes/${classroom.id}/assignments/${assignment.id}`,
              method: "PUT",
              body: dueLocked ? { title } : { title, dueDate: due ? new Date(due).toISOString() : null },
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label={t.taskName} name="title" required defaultValue={assignment.title} />
        {dueLocked ? (
          <p className="tiny muted">{dueLabel(assignment.dueDate)}. {t.testLocked}</p>
        ) : (
          <Field label={t.dueOptional} name="dueDate" type="datetime-local" defaultValue={assignment.dueDate ? toLocalInput(assignment.dueDate) : ""} />
        )}
        <ErrorBox error={act.error} />
        <button className="primary wide" disabled={act.isPending}>
          {t.saveChanges}
        </button>
      </form>
    </Modal>
  );
}

export function ArchiveAssignmentConfirm({ classroom, assignment, onClose }: Target) {
  const t = text();
  const act = useMutate();
  return (
    <Confirm
      action={t.archiveAction}
      item={assignment.title}
      detail={t.archiveDetail}
      pending={act.isPending}
      error={act.error}
      onClose={onClose}
      onConfirm={() => act.mutate({ path: `/classes/${classroom.id}/assignments/${assignment.id}/archive`, body: { confirm: true } }, { onSuccess: onClose })}
    />
  );
}

/** The Edit and Archive buttons of an active assignment, with the dialogs they open. */
export function AssignmentRowActions({ classroom, assignment }: { classroom: Pick<ClassSummary, "id">; assignment: TeacherAssignment }) {
  const t = text();
  const [open, setOpen] = useState<"edit" | "archive" | null>(null);
  const close = () => setOpen(null);
  return (
    <>
      <button type="button" className="secondary button-compact" onClick={() => setOpen("edit")}>
        <Edit3 size={14} aria-hidden="true" />
        <span>{t.edit}</span>
      </button>
      <button type="button" className="danger-text button-compact" onClick={() => setOpen("archive")}>
        <Archive size={14} aria-hidden="true" />
        <span>{t.archive}</span>
      </button>
      {open === "edit" && <EditAssignmentModal classroom={classroom} assignment={assignment} onClose={close} />}
      {open === "archive" && <ArchiveAssignmentConfirm classroom={classroom} assignment={assignment} onClose={close} />}
    </>
  );
}
