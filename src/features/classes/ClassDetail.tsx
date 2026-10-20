import { useState } from "react";
import { KeyRound, Archive } from "lucide-react";
import { ErrorBox, Field, Modal } from "../../components/ui";
import { TeacherClassResources } from "./ClassSpaceResources";
import { type ClassSummary } from "./class-types";
import { Confirm, ShownOnce, useMutate } from "./class-ui";
import { Roster } from "./Roster";
import { LateQueue } from "./TestAssignments";
import { Assignments } from "./Assignments";
import { PracticeAnalytics } from "./PracticeAnalytics";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    grade: (g: number) => `Khối ${g}`,
    codeNeedsApproval: "Vào lớp bằng mã cần duyệt",
    codeApprovesAtOnce: "Vào lớp bằng mã được duyệt ngay",
    editClass: "Sửa lớp",
    newCode: "Tạo mã mới",
    createCode: "Tạo mã tham gia",
    codeOff: "Tắt mã",
    codeOn: "Bật mã",
    archiveClass: "Lưu trữ lớp",
    archivedNote: "Lớp đã lưu trữ: học sinh không còn mở được bài của lớp. Thành viên, bài đã giao và kết quả học tập vẫn được giữ.",
    className: "Tên lớp",
    gradeLabel: "Khối lớp",
    approvalRule: "Học sinh vào bằng mã cần giáo viên duyệt",
    saveChanges: "Lưu thay đổi",
    newCodeAction: "tạo mã tham gia mới cho",
    newCodeDetail: "Mã cũ sẽ ngừng hoạt động ngay. Học sinh đã trong lớp không bị ảnh hưởng.",
    archiveAction: "lưu trữ lớp",
    archiveDetail: "Học sinh mất quyền vào mọi bài của lớp ngay lập tức. Lớp không nhận thêm thành viên hay bài giao. Dữ liệu và kết quả học tập được giữ nguyên.",
  },
  en: {
    grade: (g: number) => `Grade ${g}`,
    codeNeedsApproval: "Joining with a code needs approval",
    codeApprovesAtOnce: "Joining with a code is approved at once",
    editClass: "Edit class",
    newCode: "Create a new code",
    createCode: "Create a join code",
    codeOff: "Turn code off",
    codeOn: "Turn code on",
    archiveClass: "Archive class",
    archivedNote: "Archived class: students can no longer open its work. Members, assigned work and results are kept.",
    className: "Class name",
    gradeLabel: "Grade",
    approvalRule: "Students joining with a code need teacher approval",
    saveChanges: "Save changes",
    newCodeAction: "create a new join code for",
    newCodeDetail: "The old code stops working at once. Students already in the class are not affected.",
    archiveAction: "archive the class",
    archiveDetail: "Students lose access to all class work at once. The class takes no new members or assignments. Data and results are kept.",
  },
});
const t = text();

export function ClassDetail({ classroom }: { classroom: ClassSummary }) {
  const archived = classroom.status === "ARCHIVED";
  const [modal, setModal] = useState<"" | "edit" | "rotate" | "archive" | "code">("");
  const [code, setCode] = useState<string | null>(null);
  const act = useMutate();
  const close = () => {
    act.reset();
    setModal("");
  };
  return (
    <>
      <section className="panel" aria-labelledby="class-detail-title">
        <div className="section-heading">
          <div>
            <h2 id="class-detail-title">{classroom.name}</h2>
            <p className="tiny muted">
              {t.grade(classroom.grade)} · {classroom.requiresApproval ? t.codeNeedsApproval : t.codeApprovesAtOnce}
            </p>
          </div>
          {!archived && (
            <div className="button-row">
              <button className="secondary" onClick={() => setModal("edit")}>
                {t.editClass}
              </button>
              <button className="secondary" onClick={() => setModal("rotate")}>
                <KeyRound size={16} /> {classroom.joinCode.issued ? t.newCode : t.createCode}
              </button>
              {classroom.joinCode.issued && (
                <button
                  className="secondary"
                  disabled={act.isPending}
                  onClick={() =>
                    act.mutate({ path: `/classes/${classroom.id}`, method: "PUT", body: { joinCodeEnabled: !classroom.joinCode.enabled } })
                  }
                >
                  {classroom.joinCode.enabled ? t.codeOff : t.codeOn}
                </button>
              )}
              <button className="danger-text" onClick={() => setModal("archive")}>
                <Archive size={16} /> {t.archiveClass}
              </button>
            </div>
          )}
        </div>
        {archived && (
          <p className="notice">
            {t.archivedNote}
          </p>
        )}
        {code && <ShownOnce code={code} onDone={() => setCode(null)} />}
        <ErrorBox error={!modal ? act.error : null} />
      </section>
      <Roster classroom={classroom} />
      <TeacherClassResources classId={classroom.id} disabled={archived} />
      <LateQueue classroom={classroom} />
      <Assignments classroom={classroom} />
      {!archived && <PracticeAnalytics classId={classroom.id} />}
      {modal === "edit" && (
        <Modal title={t.editClass} onClose={close}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              act.mutate(
                {
                  path: `/classes/${classroom.id}`,
                  method: "PUT",
                  body: {
                    name: String(form.get("name")),
                    grade: Number(form.get("grade")),
                    requiresApproval: form.get("requiresApproval") === "on",
                  },
                },
                { onSuccess: close },
              );
            }}
          >
            <Field label={t.className} name="name" required defaultValue={classroom.name} maxLength={200} />
            <label className="field">
              <span>{t.gradeLabel}</span>
              <select name="grade" defaultValue={classroom.grade}>
                {[6, 7, 8, 9].map((g) => (
                  <option key={g} value={g}>
                    {t.grade(g)}
                  </option>
                ))}
              </select>
            </label>
            <label className="check">
              <input type="checkbox" name="requiresApproval" defaultChecked={classroom.requiresApproval} />
              {t.approvalRule}
            </label>
            <ErrorBox error={act.error} />
            <button className="primary wide" disabled={act.isPending}>
              {t.saveChanges}
            </button>
          </form>
        </Modal>
      )}
      {modal === "rotate" && (
        <Confirm
          action={t.newCodeAction}
          item={classroom.name}
          detail={t.newCodeDetail}
          pending={act.isPending}
          error={act.error}
          onClose={close}
          onConfirm={() =>
            act.mutate(
              { path: `/classes/${classroom.id}/join-code/rotate` },
              {
                onSuccess: (data: any) => {
                  setCode(data.joinCode);
                  close();
                },
              },
            )
          }
        />
      )}
      {modal === "archive" && (
        <Confirm
          action={t.archiveAction}
          item={classroom.name}
          detail={t.archiveDetail}
          pending={act.isPending}
          error={act.error}
          onClose={close}
          onConfirm={() => act.mutate({ path: `/classes/${classroom.id}/archive`, body: { confirm: true } }, { onSuccess: close })}
        />
      )}
    </>
  );
}
