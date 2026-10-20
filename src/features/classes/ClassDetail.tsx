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
            <h2 id="class-detail-title" tabIndex={-1}>{classroom.name}</h2>
            <p className="tiny muted">
              Khối {classroom.grade} · {classroom.requiresApproval ? "Vào lớp bằng mã cần duyệt" : "Vào lớp bằng mã được duyệt ngay"}
            </p>
          </div>
          {!archived && (
            <div className="button-row">
              <button className="secondary" onClick={() => setModal("edit")}>
                Sửa lớp
              </button>
              <button className="secondary" onClick={() => setModal("rotate")}>
                <KeyRound size={16} /> {classroom.joinCode.issued ? "Tạo mã mới" : "Tạo mã tham gia"}
              </button>
              {classroom.joinCode.issued && (
                <button
                  className="secondary"
                  disabled={act.isPending}
                  onClick={() =>
                    act.mutate({ path: `/classes/${classroom.id}`, method: "PUT", body: { joinCodeEnabled: !classroom.joinCode.enabled } })
                  }
                >
                  {classroom.joinCode.enabled ? "Tắt mã" : "Bật mã"}
                </button>
              )}
              <button className="danger-text" onClick={() => setModal("archive")}>
                <Archive size={16} /> Lưu trữ lớp
              </button>
            </div>
          )}
        </div>
        {archived && (
          <p className="notice">
            Lớp đã lưu trữ: học sinh không còn mở được bài của lớp. Thành viên, bài đã giao và kết quả học tập vẫn được giữ.
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
        <Modal title="Sửa lớp" onClose={close}>
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
            <Field label="Tên lớp" name="name" required defaultValue={classroom.name} maxLength={200} />
            <label className="field">
              <span>Khối lớp</span>
              <select name="grade" defaultValue={classroom.grade}>
                {[6, 7, 8, 9].map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="check">
              <input type="checkbox" name="requiresApproval" defaultChecked={classroom.requiresApproval} />
              Học sinh vào bằng mã cần giáo viên duyệt
            </label>
            <ErrorBox error={act.error} />
            <button className="primary wide" disabled={act.isPending}>
              Lưu thay đổi
            </button>
          </form>
        </Modal>
      )}
      {modal === "rotate" && (
        <Confirm
          action="tạo mã tham gia mới cho"
          item={classroom.name}
          detail="Mã cũ sẽ ngừng hoạt động ngay. Học sinh đã trong lớp không bị ảnh hưởng."
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
          action="lưu trữ lớp"
          item={classroom.name}
          detail="Học sinh mất quyền vào mọi bài của lớp ngay lập tức. Lớp không nhận thêm thành viên hay bài giao. Dữ liệu và kết quả học tập được giữ nguyên."
          pending={act.isPending}
          error={act.error}
          onClose={close}
          onConfirm={() => act.mutate({ path: `/classes/${classroom.id}/archive`, body: { confirm: true } }, { onSuccess: close })}
        />
      )}
    </>
  );
}
