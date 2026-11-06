import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api, idempotencyKey } from "../../lib/api";
import { Badge, Empty, ErrorBox, Field, Modal } from "../../components/ui";
import { type AssignableType, type ClassSummary, type Enrollment, type TeacherAssignment } from "./class-types";
import { Confirm, LoadError, dueLabel, toLocalInput, useMutate } from "./class-ui";
import { TestTracking } from "./TestAssignments";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    types: { lesson: "Bài học", lab: "Phòng lab", test: "Bài kiểm tra" },
    students: (n: number) => `${n} học sinh`,
    group: " (nhóm)",
    wholeClass: " (cả lớp)",
    counts: (submitted: number, pending: number, rejected: number, overdue: number) => `Đã nộp ${submitted} · Chờ duyệt ${pending} · Bị từ chối ${rejected} · Quá hạn chưa nộp ${overdue}`,
    extendedTimes: (n: number) => `Đã dời hạn (lần ${n})`,
    overdue: "Quá hạn",
    trackSubmissions: "Theo dõi bài nộp",
    edit: "Sửa",
    archive: "Lưu trữ",
    assigned: "Bài đã giao",
    assign: "Giao bài",
    assignedList: "danh sách bài đã giao",
    noneActive: "Chưa có bài đang giao.",
    archivedCount: (n: number) => `Bài đã lưu trữ (${n})`,
    editAssigned: "Sửa bài đã giao",
    taskName: "Tên nhiệm vụ",
    testLocked: "Hạn nộp và danh sách học sinh của bài kiểm tra được chốt khi giao.",
    dueOptional: "Hạn nộp (có thể để trống)",
    saveChanges: "Lưu thay đổi",
    archiveAction: "lưu trữ bài",
    archiveDetail: "Bài rời khỏi danh sách của học sinh. Kết quả học tập đã có vẫn còn trong lịch sử.",
    contentType: "Loại nội dung",
    lesson: "Bài học",
    labPractice: "Bài thực hành (lab)",
    test: "Bài kiểm tra",
    published: "Nội dung đã xuất bản",
    chooseLabChallenge: "Hoạt động đã duyệt trong Foundational Release",
    labReleaseNote: (version: number, digest: string) => `Dùng cấu hình bất biến của Foundational Release v${version} · ${digest.slice(0, 12)}. Giáo viên chọn hoạt động, không sửa mô hình hoặc tham số khoa học.`,
    noLabChallenges: "Release này chưa có hoạt động được phép giao.",
    testOption: (title: string, version: string | number, n: number) => `${title} · phiên bản ${version} · ${n} câu`,
    lessonOption: (title: string, grade: number) => `${title} · Khối ${grade}`,
    sampleSuffix: " · dữ liệu mẫu",
    privateSuffix: " · bản riêng",
    assignable: "nội dung có thể giao",
    noTests: "Chưa có bài kiểm tra đã xuất bản trong Class Space. Hãy xuất bản bài kiểm tra trước khi giao.",
    noContent: "Chưa có nội dung đã xuất bản. Hãy xuất bản nội dung trước khi giao.",
    shareNote: "Chia sẻ bài kiểm tra trong Class Space không tạo bài giao. Chỉ học sinh được giao mới làm và nộp bài.",
    privateLabOption: (title: string, version: number) => `${title} · Lab riêng của lớp · bản ${version}`,
    privateLabNote: (version: number) => `Ghim nội dung giáo viên và cấu hình khoa học của bản ${version}. Thay đổi tài nguyên sau này không sửa bài đã giao.`,
    taskNameOptional: "Tên nhiệm vụ (để trống sẽ dùng tên nội dung)",
    dueRequired: "Hạn nộp (bắt buộc)",
    dueNotRequired: "Hạn nộp (không bắt buộc)",
    wholeClassApproved: (n: number) => `Cả lớp (${n} học sinh đã duyệt)`,
    someStudents: "Một nhóm học sinh",
    recipientsFixed: "Danh sách người nhận được chốt khi giao; học sinh vào lớp sau sẽ không tự nhận bài này.",
    assigning: "Đang giao…",
    chooseContent: "Chọn nội dung",
    selectedCount: (n: number) => `Đã chọn ${n} học sinh${n === 0 ? ". Hãy chọn ít nhất một học sinh." : "."}`,
  },
  en: {
    types: { lesson: "Lesson", lab: "Lab", test: "Test" },
    students: (n: number) => `${n} ${n === 1 ? "student" : "students"}`,
    group: " (group)",
    wholeClass: " (whole class)",
    counts: (submitted: number, pending: number, rejected: number, overdue: number) => `Submitted ${submitted} · Waiting ${pending} · Rejected ${rejected} · Overdue, not submitted ${overdue}`,
    extendedTimes: (n: number) => `Extended (${n}×)`,
    overdue: "Overdue",
    trackSubmissions: "Track submissions",
    edit: "Edit",
    archive: "Archive",
    assigned: "Assigned work",
    assign: "Assign",
    assignedList: "the assigned work list",
    noneActive: "Nothing is assigned right now.",
    archivedCount: (n: number) => `Archived work (${n})`,
    editAssigned: "Edit assigned work",
    taskName: "Task name",
    testLocked: "A test's due date and students are fixed when it is assigned.",
    dueOptional: "Due date (optional)",
    saveChanges: "Save changes",
    archiveAction: "archive",
    archiveDetail: "It leaves the students' list. Existing results stay in the history.",
    contentType: "Content type",
    lesson: "Lesson",
    labPractice: "Practice (lab)",
    test: "Test",
    published: "Published content",
    chooseLabChallenge: "Approved activity in the Foundational release",
    labReleaseNote: (version: number, digest: string) => `Uses the immutable Foundational Release v${version} configuration · ${digest.slice(0, 12)}. Teachers choose an activity; they cannot change the model or scientific parameters.`,
    noLabChallenges: "This release has no assignable activity.",
    testOption: (title: string, version: string | number, n: number) => `${title} · version ${version} · ${n} ${n === 1 ? "question" : "questions"}`,
    lessonOption: (title: string, grade: number) => `${title} · Grade ${grade}`,
    sampleSuffix: " · sample data",
    privateSuffix: " · private copy",
    assignable: "assignable content",
    noTests: "No published tests in Class Space. Publish a test before assigning it.",
    noContent: "No published content. Publish content before assigning it.",
    shareNote: "Sharing a test in Class Space does not assign it. Only assigned students take and submit it.",
    privateLabOption: (title: string, version: number) => `${title} · Private class lab · version ${version}`,
    privateLabNote: (version: number) => `Pins teacher content and the scientific configuration of version ${version}. Later resource changes do not change issued assignments.`,
    taskNameOptional: "Task name (blank uses the content name)",
    dueRequired: "Due date (required)",
    dueNotRequired: "Due date (optional)",
    wholeClassApproved: (n: number) => `Whole class (${n} approved ${n === 1 ? "student" : "students"})`,
    someStudents: "A group of students",
    recipientsFixed: "Recipients are fixed when assigned; students who join later do not get this work automatically.",
    assigning: "Assigning…",
    chooseContent: "Choose content",
    selectedCount: (n: number) => `${n} ${n === 1 ? "student" : "students"} selected${n === 0 ? ". Choose at least one student." : "."}`,
  },
});
const t = text();

const contentTypeLabel: Record<AssignableType, string> = t.types;

export function Assignments({ classroom }: { classroom: ClassSummary }) {
  const archived = classroom.status === "ARCHIVED";
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLabAssignment = searchParams.get("assign") === "lab" && !archived;
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState<TeacherAssignment | null>(null);
  const [archiving, setArchiving] = useState<TeacherAssignment | null>(null);
  const [tracking, setTracking] = useState<TeacherAssignment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const list = useQuery<TeacherAssignment[]>({
    queryKey: ["class-assignments", classroom.id],
    queryFn: () => api(`/classes/${classroom.id}/assignments`),
  });
  const act = useMutate();
  useEffect(() => {
    if (requestedLabAssignment) setAssigning(true);
  }, [requestedLabAssignment]);
  const closeAssignModal = () => {
    setAssigning(false);
    if (searchParams.has("assign")) {
      const next = new URLSearchParams(searchParams);
      next.delete("assign");
      setSearchParams(next, { replace: true });
    }
  };
  const active = list.data?.filter((a) => a.status === "ACTIVE") ?? [];
  const past = list.data?.filter((a) => a.status === "ARCHIVED") ?? [];
  const row = (a: TeacherAssignment) => (
    <div className="assignment-row" key={a.id}>
      <div>
        <b>{a.title}</b>
        <small>
          {contentTypeLabel[a.contentType]} · {dueLabel(a.dueDate)} · {t.students(a.recipientCount)}
          {a.audience === "SUBSET" ? t.group : t.wholeClass}
        </small>
        {a.testSummary && (
          <small>
            {t.counts(a.testSummary.counts.SUBMITTED, a.testSummary.counts.LATE_REVIEW_PENDING, a.testSummary.counts.REJECTED, a.testSummary.counts.OVERDUE_UNSUBMITTED)}
          </small>
        )}
        {a.testSummary?.extended && <Badge tone="gold">{t.extendedTimes(a.testSummary.revision - 1)}</Badge>}
        {a.overdue && a.status === "ACTIVE" && <Badge tone="outline">{t.overdue}</Badge>}
      </div>
      {a.contentType === "test" && (
        <button className="text-button" onClick={() => setTracking(a)}>
          {t.trackSubmissions}
        </button>
      )}
      {a.status === "ACTIVE" && !archived && (
        <div className="button-row">
          <button className="text-button" onClick={() => { act.reset(); setEditing(a); }}>
            {t.edit}
          </button>
          <button className="danger-text" onClick={() => { act.reset(); setArchiving(a); }}>
            {t.archive}
          </button>
        </div>
      )}
    </div>
  );
  return (
    <section className="panel" aria-labelledby="assignments-title">
      <div className="section-heading">
        <h2 id="assignments-title">{t.assigned}</h2>
        {!archived && (
          <button className="primary" onClick={() => { setNotice(null); setAssigning(true); }}>
            {t.assign}
          </button>
        )}
      </div>
      {notice && <p className="notice" role="status">{notice}</p>}
      <LoadError query={list} what={t.assignedList} />
      {list.data && active.length === 0 && <Empty>{t.noneActive}</Empty>}
      {active.map(row)}
      {past.length > 0 && (
        <details>
          <summary>{t.archivedCount(past.length)}</summary>
          {past.map(row)}
        </details>
      )}
      {assigning && (
        <AssignModal
          classroom={classroom}
          initialContentType={requestedLabAssignment ? "lab" : undefined}
          onClose={closeAssignModal}
          onAssigned={(message) => {
            setNotice(message);
            closeAssignModal();
          }}
        />
      )}
      {editing && (
        <Modal title={t.editAssigned} onClose={() => setEditing(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const due = String(form.get("dueDate") ?? "");
              const title = String(form.get("title"));
              act.mutate(
                {
                  path: `/classes/${classroom.id}/assignments/${editing.id}`,
                  method: "PUT",
                  // A test's deadline only moves through a class-wide deadline revision.
                  body: editing.contentType === "test" ? { title } : { title, dueDate: due ? new Date(due).toISOString() : null },
                },
                { onSuccess: () => setEditing(null) },
              );
            }}
          >
            <Field label={t.taskName} name="title" required defaultValue={editing.title} />
            {editing.contentType === "test" ? (
              <p className="tiny muted">{dueLabel(editing.dueDate)}. {t.testLocked}</p>
            ) : (
              <Field label={t.dueOptional} name="dueDate" type="datetime-local" defaultValue={editing.dueDate ? toLocalInput(editing.dueDate) : ""} />
            )}
            <ErrorBox error={act.error} />
            <button className="primary wide" disabled={act.isPending}>
              {t.saveChanges}
            </button>
          </form>
        </Modal>
      )}
      {tracking && <TestTracking classroom={classroom} assignment={tracking} onClose={() => setTracking(null)} />}
      {archiving && (
        <Confirm
          action={t.archiveAction}
          item={archiving.title}
          detail={t.archiveDetail}
          pending={act.isPending}
          error={act.error}
          onClose={() => setArchiving(null)}
          onConfirm={() =>
            act.mutate({ path: `/classes/${classroom.id}/assignments/${archiving.id}/archive`, body: { confirm: true } }, { onSuccess: () => setArchiving(null) })
          }
        />
      )}
    </section>
  );
}

function AssignModal({ classroom, onClose, onAssigned, initialContentType }: { classroom: ClassSummary; onClose: () => void; onAssigned: (message: string) => void; initialContentType?: AssignableType }) {
  const [contentType, setContentType] = useState<AssignableType>(initialContentType ?? "lesson");
  const [scope, setScope] = useState<"CLASS" | "SUBSET">("CLASS");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [contentId, setContentId] = useState("");
  const [labChallengeId, setLabChallengeId] = useState("");
  const [validation, setValidation] = useState("");
  const key = useRef(idempotencyKey());
  const content = useQuery<{ lessons: any[]; labs: any[]; tests?: any[]; classLabs?: any[] }>({
    queryKey: ["assignable", classroom.id],
    queryFn: () => api(`/classes/${classroom.id}/assignable-content`),
  });
  const roster = useQuery<Enrollment[]>({
    queryKey: ["roster", classroom.id],
    queryFn: () => api(`/classes/${classroom.id}/students`),
  });
  const approved = roster.data?.filter((e) => e.status === "approved") ?? [];
  const act = useMutate<{ recipientCount: number; message: string }>();
  const options = contentType === "lesson" ? content.data?.lessons ?? [] : contentType === "lab" ? content.data?.labs ?? [] : content.data?.tests ?? [];
  const selectedLab = content.data?.labs?.find((item: any) => item.id === contentId);
  const selectedPrivateLab = contentType === "lab" ? content.data?.classLabs?.find((item) => `resource:${item.id}` === contentId) : undefined;
  const isTest = contentType === "test";
  return (
    <Modal title={t.assign} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          if (scope === "SUBSET" && studentIds.length === 0) {
            setValidation("Hãy chọn ít nhất một học sinh.");
            return;
          }
          setValidation("");
          const due = String(form.get("dueDate") ?? "");
          const title = String(form.get("title") ?? "").trim();
          act.mutate(
            {
              path: `/classes/${classroom.id}/assignments`,
              key: key.current,
              body: {
                contentType,
                contentId: selectedPrivateLab?.content.source.labId ?? contentId,
                ...(selectedPrivateLab ? { classLabResourceId: selectedPrivateLab.id } : contentType === "lab" && selectedLab ? { labReleaseId: selectedLab.release.id, labChallengeId } : {}),
                audience: scope,
                ...(title ? { title } : {}),
                dueDate: due ? new Date(due).toISOString() : null,
                studentIds: scope === "SUBSET" ? studentIds : [],
              },
            },
            { onSuccess: (data) => onAssigned(data.message) },
          );
        }}
      >
        <fieldset className="segmented" onChange={() => { setContentId(""); setLabChallengeId(""); }}>
          <legend>{t.contentType}</legend>
          <label className="check">
            <input type="radio" name="contentType" checked={contentType === "lesson"} onChange={() => setContentType("lesson")} />
            {t.lesson}
          </label>
          <label className="check">
            <input type="radio" name="contentType" checked={contentType === "lab"} onChange={() => setContentType("lab")} />
            {t.labPractice}
          </label>
          <label className="check">
            <input type="radio" name="contentType" checked={isTest} onChange={() => setContentType("test")} />
            {t.test}
          </label>
        </fieldset>
        <label className="field">
          <span>{t.published}</span>
          <select name="contentId" required value={contentId} onChange={(e) => {
            const nextId = e.target.value;
            setContentId(nextId);
            const nextLab = content.data?.labs?.find((item: any) => item.id === nextId);
            setLabChallengeId(nextLab?.challenges?.[0]?.id ?? "");
          }}>
            <option value="">{t.chooseContent}</option>
            {contentType === "lab" && content.data?.classLabs?.map((item) => <option key={item.id} value={`resource:${item.id}`}>{t.privateLabOption(item.title, item.version)}</option>)}
            {options.map((item: any) => (
              <option key={item.id} value={item.id}>
                {isTest ? t.testOption(item.title, item.version, item.questionCount) : `${t.lessonOption(item.title, item.grade)}${contentType === "lab" ? ` · Foundational v${item.release.version}` : ""}`}
                {item.synthetic ? t.sampleSuffix : ""}
                {item.scope === "TEACHER_PRIVATE" ? t.privateSuffix : ""}
              </option>
            ))}
          </select>
        </label>
        {selectedPrivateLab && <p className="notice">{t.privateLabNote(selectedPrivateLab.version)}</p>}
        {contentType === "lab" && selectedLab && <>
          <label className="field">
            <span>{t.chooseLabChallenge}</span>
            <select required value={labChallengeId} onChange={(event) => setLabChallengeId(event.target.value)}>
              <option value="">{t.chooseContent}</option>
              {selectedLab.challenges.map((challenge: any) => <option key={challenge.id} value={challenge.id}>{challenge.objective || challenge.id}</option>)}
            </select>
          </label>
          <p className="tiny muted">{t.labReleaseNote(selectedLab.release.version, selectedLab.release.digest)}</p>
        </>}
        {contentType === "lab" && selectedLab?.challenges?.length === 0 && <p className="notice">{t.noLabChallenges}</p>}
        <LoadError query={content} what={t.assignable} />
        {content.data && options.length === 0 && (
          <p className="notice">
            {isTest ? t.noTests : t.noContent}
          </p>
        )}
        {isTest && <p className="tiny muted">{t.shareNote}</p>}
        <Field label={t.taskNameOptional} name="title" maxLength={200} />
        <Field label={isTest ? t.dueRequired : t.dueNotRequired} name="dueDate" type="datetime-local" required={isTest} />
        <fieldset className="segmented">
          <legend>Giao cho</legend>
          <label className="check">
            <input type="radio" name="scope" checked={scope === "CLASS"} onChange={() => setScope("CLASS")} />
            {t.wholeClassApproved(approved.length)}
          </label>
          <label className="check">
            <input type="radio" name="scope" checked={scope === "SUBSET"} onChange={() => setScope("SUBSET")} />
            {t.someStudents}
          </label>
        </fieldset>
        {scope === "SUBSET" &&
          approved.map((e) => (
            <label className="check" key={e.studentId}>
              <input type="checkbox" name="studentIds" value={e.studentId} checked={studentIds.includes(e.studentId)} onChange={(event) => setStudentIds((current) => event.target.checked ? [...current, e.studentId] : current.filter((id) => id !== e.studentId))} />
              {e.student.fullName}
            </label>
          ))}
        {scope === "SUBSET" && <p role="status">{t.selectedCount(studentIds.length)}</p>}
        <ErrorBox error={validation} />
        <p className="tiny muted">{t.recipientsFixed}</p>
        <ErrorBox error={act.error} />
        <button className="primary wide" disabled={act.isPending || !contentId || (!options.length && !selectedPrivateLab) || (contentType === "lab" && !selectedPrivateLab && !labChallengeId) || (scope === "SUBSET" && studentIds.length === 0)}>
          {act.isPending ? t.assigning : t.assign}
        </button>
      </form>
    </Modal>
  );
}
