import { useState } from "react";
import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  ArrowUpRight,
  BookOpen,
  Users,
  Trash2,
  Save,
  Copy,
  KeyRound,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { api, useAuth, uploadFile, openMaterial } from "./api";
import {
  Badge,
  Empty,
  ErrorBox,
  Field,
  Modal,
  useAction,
  verdictLabel,
} from "./ui";
import { PageHeading } from "./App";
function RichEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  return (
    <div className="rich-editor">
      <div className="editor-toolbar">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          Danh sách
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
const blankLesson = {
  title: "",
  subjectId: "physics",
  chapter: "",
  grade: 8,
  topic: "",
  learningObjective: "",
  prerequisites: "",
  curriculum: "GDPT 2018 – Khoa học tự nhiên THCS",
  content: "",
  status: "draft",
  labId: "circuit",
  materials: [],
  questions: [],
};
export function Lessons() {
  const user = useAuth((s) => s.user)!;
  const manage = ["TEACHER", "ADMIN"].includes(user.role);
  const q = useQuery({ queryKey: ["lessons"], queryFn: () => api("/lessons") });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number | null>(null);
  const materialOpen = useAction((url: string) => openMaterial(url));
  const upload = useAction(async (file: File) => {
    const m = await uploadFile(file);
    setEdit((s: any) => ({ ...s, materials: [...s.materials, m] }));
  });
  const save = useAction((b: any) =>
    api("/lessons" + (b.id ? "/" + b.id : ""), b.id ? "PUT" : "POST", b),
  );
  const quiz = useAction(async () => {
    const r = await api("/lessons/" + view.id + "/quiz", "POST", {
      answers: view.questions.map((_: any, i: number) => answers[i] ?? -1),
    });
    setScore(r.score);
  });
  const complete = useAction(() =>
    api("/lessons/" + view.id + "/complete", "POST"),
  );
  return (
    <>
      <PageHeading
        eyebrow="THƯ VIỆN KIẾN THỨC"
        title="Thư viện bài học"
        description="Các chủ đề lý thuyết và bài tập tương tác theo chương trình học."
        action={
          manage ? (
            <button
              className="primary"
              onClick={() => setEdit({ ...blankLesson })}
            >
              <Plus size={16} />
              Tạo bài học
            </button>
          ) : null
        }
      />
      <div className="filter-bar">
        <div className="tabs">
          {[
            ["all", "Tất cả"],
            ["physics", "Vật lý"],
            ["biology", "Sinh học"],
            ["chemistry", "Hóa học"],
          ].map(([id, name]) => (
            <button
              key={id}
              className={filter === id ? "active" : ""}
              onClick={() => setFilter(id)}
            >
              {name}
            </button>
          ))}
        </div>
        <input
          aria-label="Tìm bài học"
          placeholder="Tìm tên bài học…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ErrorBox error={q.error} />
      <div className="lesson-grid">
        {q.data
          ?.filter(
            (l: any) =>
              (filter === "all" || l.subjectId === filter) &&
              l.title.toLowerCase().includes(search.toLowerCase()),
          )
          .map((l: any) => (
            <article className="panel lesson-card" key={l.id}>
              <div className="lesson-card-top">
                <span className={"subject-icon " + l.subjectId}>
                  <BookOpen />
                </span>
                <Badge>
                  {l.status === "published"
                    ? "Đã xuất bản"
                    : l.status === "draft"
                      ? "Bản nháp"
                      : "Lưu trữ"}
                </Badge>
              </div>
              <small className="eyebrow">
                {l.subject.name} · LỚP {l.grade}
              </small>
              <h3>{l.title}</h3>
              <p>{l.learningObjective}</p>
              <div className="card-footer">
                <button
                  className="text-button"
                  onClick={() => {
                    setView(l);
                    setAnswers({});
                    setScore(null);
                  }}
                >
                  Mở bài học <ArrowUpRight size={16} />
                </button>
                {manage &&
                  (l.authorId === user.id || user.role === "ADMIN") && (
                    <button className="text-button" onClick={() => setEdit(l)}>
                      Chỉnh sửa
                    </button>
                  )}
              </div>
            </article>
          ))}
      </div>
      {q.data?.length === 0 && <Empty>Chưa có bài học.</Empty>}
      {view && (
        <Modal title={view.title} onClose={() => setView(null)}>
          <p className="muted">
            {view.chapter} · {view.curriculum}
          </p>
          <div className="notice">
            <b>Mục tiêu:</b> {view.learningObjective}
            <br />
            <b>Kiến thức nền:</b> {view.prerequisites}
          </div>
          <div
            className="lesson-content"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(view.content),
            }}
          />
          {view.materials.map((m: any, i: number) => (
            <button
              className="material-link"
              key={i}
              onClick={() => materialOpen.mutate(m.url)}
            >
              {m.title} ({m.type}) ↗
            </button>
          ))}
          {view.labId && ["STUDENT", "TEACHER"].includes(user.role) && (
            <Link className="primary" to={"/labs/" + view.labId}>
              Mở lab thực hành <ArrowUpRight size={16} />
            </Link>
          )}
          {view.questions.length > 0 && (
            <section className="quiz">
              <h3>Kiểm tra kiến thức</h3>
              {view.questions.map((q: any, i: number) => (
                <fieldset key={i}>
                  <legend>
                    {i + 1}. {q.prompt}
                  </legend>
                  {q.options.map((o: string, j: number) => (
                    <label className="quiz-option" key={j}>
                      <input
                        type="radio"
                        name={"q" + i}
                        checked={answers[i] === j}
                        onChange={() => setAnswers({ ...answers, [i]: j })}
                      />
                      {o}
                    </label>
                  ))}
                </fieldset>
              ))}
              {user.role === "STUDENT" && (
                <button
                  className="primary"
                  disabled={quiz.isPending}
                  onClick={() => quiz.mutate(null)}
                >
                  Nộp bài quiz
                </button>
              )}
              {score !== null && (
                <p className="notice">Điểm: {Math.round(score)}/100</p>
              )}
              <ErrorBox error={quiz.error} />
            </section>
          )}
          {!view.questions.length && user.role === "STUDENT" && (
            <button className="primary" onClick={() => complete.mutate(null)}>
              Đánh dấu hoàn thành
            </button>
          )}
          <ErrorBox error={complete.error} />
        </Modal>
      )}
      {edit && (
        <Modal
          title={edit.id ? "Chỉnh sửa bài học" : "Tạo bài học"}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(edit, { onSuccess: () => setEdit(null) });
            }}
          >
            <div className="form-grid">
              {[
                ["title", "Tên bài"],
                ["chapter", "Chương"],
                ["topic", "Chủ đề"],
                ["learningObjective", "Mục tiêu"],
                ["prerequisites", "Kiến thức nền"],
                ["curriculum", "Chuẩn chương trình"],
              ].map(([key, label]) => (
                <Field
                  required
                  key={key}
                  label={label}
                  value={edit[key]}
                  onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
                />
              ))}
              <label className="field">
                <span>Môn học</span>
                <select
                  value={edit.subjectId}
                  onChange={(e) =>
                    setEdit({ ...edit, subjectId: e.target.value })
                  }
                >
                  <option value="physics">Vật lý</option>
                  <option value="biology">Sinh học</option>
                  <option value="chemistry">Hóa học</option>
                </select>
              </label>
              <Field
                label="Khối lớp"
                type="number"
                min={6}
                max={9}
                value={edit.grade}
                onChange={(e) =>
                  setEdit({ ...edit, grade: Number(e.target.value) })
                }
              />
              <label className="field">
                <span>Lab đính kèm</span>
                <select
                  value={edit.labId ?? ""}
                  onChange={(e) =>
                    setEdit({ ...edit, labId: e.target.value || null })
                  }
                >
                  <option value="">Không có</option>
                  <option value="circuit">Mạch điện</option>
                  <option value="eye">Mắt người</option>
                  <option value="chemistry">Phản ứng</option>
                </select>
              </label>
              <label className="field">
                <span>Trạng thái</span>
                <select
                  value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                >
                  <option value="draft">Bản nháp</option>
                  <option value="published">Xuất bản</option>
                  <option value="archived">Lưu trữ</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>Nội dung lý thuyết</span>
              <RichEditor
                value={edit.content}
                onChange={(v) => setEdit((s: any) => ({ ...s, content: v }))}
              />
            </label>
            <h3>Học liệu</h3>
            <label className="field">
              <span>Tải PDF / ảnh / video (tối đa 20 MB)</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.mp4"
                disabled={upload.isPending}
                onChange={(e) => {
                  if (e.target.files?.[0]) upload.mutate(e.target.files[0]);
                }}
              />
            </label>
            <ErrorBox error={upload.error} />
            {edit.materials.map((m: any, i: number) => (
              <div className="form-grid" key={i}>
                <Field
                  label="Tên học liệu"
                  value={m.title}
                  required
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      materials: edit.materials.map((x: any, j: number) =>
                        j === i ? { ...x, title: e.target.value } : x,
                      ),
                    })
                  }
                />
                <Field
                  label="URL video / PDF / ảnh"
                  type="text"
                  value={m.url}
                  required
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      materials: edit.materials.map((x: any, j: number) =>
                        j === i ? { ...x, url: e.target.value } : x,
                      ),
                    })
                  }
                />
                <select
                  aria-label="Loại học liệu"
                  value={m.type}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      materials: edit.materials.map((x: any, j: number) =>
                        j === i ? { ...x, type: e.target.value } : x,
                      ),
                    })
                  }
                >
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="image">Ảnh</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setEdit({
                      ...edit,
                      materials: edit.materials.filter(
                        (_: any, j: number) => i !== j,
                      ),
                    })
                  }
                >
                  Xóa học liệu
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setEdit({
                  ...edit,
                  materials: [
                    ...edit.materials,
                    { type: "pdf", title: "", url: "" },
                  ],
                })
              }
            >
              + Thêm học liệu URL
            </button>
            <h3>Quiz</h3>
            {edit.questions.map((q: any, i: number) => (
              <div className="quiz-editor" key={i}>
                <Field
                  label={"Câu " + (i + 1)}
                  required
                  value={q.prompt}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      questions: edit.questions.map((x: any, j: number) =>
                        j === i ? { ...x, prompt: e.target.value } : x,
                      ),
                    })
                  }
                />
                {q.options.map((o: string, k: number) => (
                  <Field
                    key={k}
                    label={"Đáp án " + (k + 1)}
                    required
                    value={o}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        questions: edit.questions.map((x: any, j: number) =>
                          j === i
                            ? {
                                ...x,
                                options: x.options.map(
                                  (v: string, n: number) =>
                                    n === k ? e.target.value : v,
                                ),
                              }
                            : x,
                        ),
                      })
                    }
                  />
                ))}
                <label className="field">
                  <span>Đáp án đúng</span>
                  <select
                    value={q.answer}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        questions: edit.questions.map((x: any, j: number) =>
                          j === i
                            ? { ...x, answer: Number(e.target.value) }
                            : x,
                        ),
                      })
                    }
                  >
                    {q.options.map((_: any, k: number) => (
                      <option value={k} key={k}>
                        Đáp án {k + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setEdit({
                      ...edit,
                      questions: edit.questions.filter(
                        (_: any, j: number) => j !== i,
                      ),
                    })
                  }
                >
                  Xóa câu hỏi
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setEdit({
                  ...edit,
                  questions: [
                    ...edit.questions,
                    { prompt: "", options: ["", "", "", ""], answer: 0 },
                  ],
                })
              }
            >
              + Thêm câu hỏi
            </button>
            <ErrorBox error={save.error} />
            <button
              className="primary wide form-submit"
              disabled={save.isPending}
            >
              <Save size={16} />
              Lưu bài học
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Classes() {
  const user = useAuth((s) => s.user)!;
  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState("");
  const [contentId, setContentId] = useState("circuit");
  const [credentials, setCredentials] = useState<{
    username: string;
    temporaryPassword: string;
    expiresAt: string;
  } | null>(null);
  const q = useQuery({
    queryKey: ["classes"],
    queryFn: () => api("/classes"),
    enabled: user.role !== "PARENT",
  });
  const roster = useQuery({
    queryKey: ["roster", selected],
    queryFn: () => api("/classes/" + selected + "/students"),
    enabled: !!selected && user.role === "TEACHER",
  });
  const analytics = useQuery({
    queryKey: ["analytics", selected],
    queryFn: () => api("/classes/" + selected + "/analytics"),
    enabled: !!selected && user.role === "TEACHER",
  });
  const lessons = useQuery({
    queryKey: ["lessons"],
    queryFn: () => api("/lessons"),
  });
  const act = useAction(({ path, method = "POST", body }: any) =>
    api(path, method, body),
  );
  return (
    <>
      <PageHeading
        eyebrow="LỚP HỌC & NHÓM"
        title="Lớp học của tôi"
        description="Quản lý danh sách lớp học, phân công bài tập và theo dõi tiến độ."
        action={
          user.role === "TEACHER" ? (
            <button className="primary" onClick={() => setModal("create")}>
              <Plus size={16} /> Tạo lớp
            </button>
          ) : user.role === "STUDENT" ? (
            <button className="primary" onClick={() => setModal("join")}>
              Tham gia bằng mã
            </button>
          ) : null
        }
      />
      <ErrorBox
        error={q.error || roster.error || analytics.error || act.error}
      />
      <div className="class-grid">
        {q.data?.map((c: any) => (
          <button
            key={c.id}
            className={
              "panel class-card " + (selected === c.id ? "selected" : "")
            }
            onClick={() => setSelected(c.id)}
          >
            <Users size={24} />
            <h3>{c.name}</h3>
            <p>
              Khối {c.grade} · {c._count.enrollments} thành viên
            </p>
            {user.role === "TEACHER" && <Badge>Mã lớp: {c.joinCode}</Badge>}
            <p>{c.assignments.length} bài đã giao</p>
          </button>
        ))}
      </div>
      {selected && user.role === "TEACHER" && (
        <>
          <section className="panel">
            <div className="section-heading">
              <h2>Thành viên lớp</h2>
              <div className="button-row">
                <button
                  className="secondary"
                  onClick={() => setModal("student")}
                >
                  Cấp tài khoản học sinh
                </button>
                <button className="primary" onClick={() => setModal("assign")}>
                  Giao bài
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.data?.map((e: any) => (
                    <tr key={e.studentId}>
                      <td>
                        {e.student.fullName}
                        <small>@{e.student.username}</small>
                      </td>
                      <td>
                        <Badge>
                          {e.student.mustChangePassword
                            ? "Chờ đổi mật khẩu"
                            : e.approved
                              ? "Đang hoạt động"
                              : "Chờ duyệt"}
                        </Badge>
                      </td>
                      <td>
                        {!e.approved && (
                          <button
                            className="text-button"
                            onClick={() =>
                              act.mutate({
                                path: `/classes/${selected}/students/${e.studentId}`,
                                method: "PUT",
                              })
                            }
                          >
                            Duyệt
                          </button>
                        )}
                        <button
                          className="text-button"
                          onClick={() =>
                            act.mutate(
                              {
                                path: `/classes/${selected}/students/${e.studentId}/reset-password`,
                                method: "POST",
                              },
                              {
                                onSuccess: (data: any) => {
                                  setCredentials(data.credentials);
                                  setModal("credentials");
                                },
                              },
                            )
                          }
                        >
                          Cấp lại mật khẩu
                        </button>
                        <button
                          className="danger-text"
                          onClick={() =>
                            act.mutate({
                              path: `/classes/${selected}/students/${e.studentId}`,
                              method: "DELETE",
                            })
                          }
                        >
                          Xóa khỏi lớp
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <h2>Phân tích quá trình thực hành</h2>
            {analytics.data?.map((s: any) => (
              <div className="analytics-student" key={s.id}>
                <h3>{s.fullName}</h3>
                <p>
                  {s.attempts.length} lượt thử ·{" "}
                  {
                    s.progress.filter((p: any) => p.status === "completed")
                      .length
                  }{" "}
                  nội dung hoàn thành · Mức gợi ý cao nhất{" "}
                  {Math.max(0, ...s.progress.map((p: any) => p.lastHintLevel))}
                </p>
                {s.misconceptions.map((m: any, i: number) => (
                  <div className="notice" key={i}>
                    <b>Giả thuyết cần giáo viên xác minh:</b> {m.hypothesis}
                    <p>
                      Mức tin cậy: {m.confidence} · Chứng cứ:{" "}
                      {m.evidence.join(", ")}
                    </p>
                  </div>
                ))}
                <details>
                  <summary>Xem lượt thử và gợi ý làm chứng cứ</summary>
                  {s.attempts.map((a: any) => (
                    <div className="attempt-evidence" key={a.id}>
                      <b>{a.id}</b> · {verdictLabel(a.verdict)} ·{" "}
                      {new Date(a.createdAt).toLocaleString("vi-VN")}
                      <pre>{JSON.stringify(a.simulationResult, null, 2)}</pre>
                      {a.hints.map((h: any) => (
                        <p key={h.id}>
                          Mức {h.level}: {h.content}
                        </p>
                      ))}
                    </div>
                  ))}
                </details>
              </div>
            ))}
          </section>
        </>
      )}
      {selected && (
        <section className="panel">
          <h2>Bài đã giao</h2>
          {q.data
            ?.find((c: any) => c.id === selected)
            ?.assignments.map((a: any) => (
              <div className="assignment-row" key={a.id}>
                <div>
                  <b>{a.title}</b>
                  <small>
                    Hạn {new Date(a.dueDate).toLocaleString("vi-VN")}
                  </small>
                </div>
                {user.role === "STUDENT" && (
                  <Link
                    to={
                      a.contentType === "lab"
                        ? "/labs/" + a.contentId
                        : "/lessons"
                    }
                  >
                    Mở bài
                  </Link>
                )}
              </div>
            ))}
        </section>
      )}
      {modal && (
        <Modal
          title={
            {
              create: "Tạo lớp mới",
              join: "Tham gia lớp",
              assign: "Giao bài",
              student: "Cấp tài khoản học sinh",
              credentials: "Thông tin đăng nhập tạm",
            }[modal] ?? ""
          }
          onClose={() => setModal("")}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const b: any = Object.fromEntries(new FormData(e.currentTarget));
              let path = "";
              if (modal === "create") {
                path = "/classes";
                b.grade = Number(b.grade);
              }
              if (modal === "join") path = "/classes/join";
              if (modal === "assign") {
                path = "/classes/" + selected + "/assignments";
                b.contentType = ["circuit", "eye", "chemistry"].includes(
                  b.contentId,
                )
                  ? "lab"
                  : "lesson";
                b.dueDate = new Date(b.dueDate).toISOString();
                b.studentIds = new FormData(e.currentTarget).getAll("studentIds");
              }
              if (modal === "student") {
                path = `/classes/${selected}/students`;
                b.grade = Number(b.grade);
                b.consent = true;
              }
              act.mutate(
                { path, body: b },
                {
                  onSuccess: (data: any) => {
                    if (modal === "student") {
                      setCredentials(data.credentials);
                      setModal("credentials");
                    } else {
                      setModal("");
                    }
                  },
                },
              );
            }}
          >
            {modal === "create" && (
              <>
                <Field label="Tên lớp" name="name" required />
                <Field
                  label="Khối lớp"
                  name="grade"
                  type="number"
                  min={6}
                  max={9}
                  defaultValue={8}
                />
              </>
            )}
            {modal === "join" && (
              <Field label="Mã tham gia lớp" name="code" required />
            )}
            {modal === "assign" && (
              <>
                <Field label="Tên nhiệm vụ" name="title" required />
                <label className="field">
                  <span>Nội dung</span>
                  <select name="contentId">
                    <optgroup label="Phòng lab">
                      <option value="circuit">Mạch điện</option>
                      <option value="eye">Mắt người</option>
                      <option value="chemistry">Phản ứng</option>
                    </optgroup>
                    <optgroup label="Bài học">
                      {lessons.data
                        ?.filter((l: any) => l.status === "published")
                        .map((l: any) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </label>
                <Field
                  label="Hạn nộp"
                  name="dueDate"
                  type="datetime-local"
                  required
                />
                <p className="tiny muted">Không chọn học sinh để giao cả lớp; chọn bên dưới để giao cho một nhóm.</p>
                {roster.data?.filter((r: any) => r.approved).map((r: any) => <label className="check" key={r.studentId}><input type="checkbox" name="studentIds" value={r.studentId}/>{r.student.fullName}</label>)}
              </>
            )}
            {modal === "student" && (
              <>
                <Field label="Họ tên" name="fullName" required />
                <Field
                  label="Tên đăng nhập"
                  name="username"
                  placeholder="Ví dụ: minhanh.7a"
                  pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]"
                  minLength={3}
                  maxLength={32}
                  autoCapitalize="none"
                  required
                />
                <Field
                  label="Khối lớp"
                  name="grade"
                  type="number"
                  min={6}
                  max={9}
                  defaultValue={8}
                />
                <label className="check">
                  <input type="checkbox" required />
                  Nhà trường đã có chấp thuận xử lý dữ liệu học sinh.
                </label>
                <p className="tiny muted">
                  NexaLab sẽ tạo mật khẩu tạm có hiệu lực trong 24 giờ. Học sinh
                  phải đổi mật khẩu ngay lần đăng nhập đầu tiên.
                </p>
              </>
            )}
            {modal === "credentials" && credentials && (
              <div className="credentials-card">
                <div className="credentials-icon"><KeyRound size={22} /></div>
                <p className="muted">
                  Chỉ hiển thị một lần. Hãy gửi riêng cho học sinh.
                </p>
                <dl>
                  <div><dt>Tên đăng nhập</dt><dd>{credentials.username}</dd></div>
                  <div><dt>Mật khẩu tạm</dt><dd>{credentials.temporaryPassword}</dd></div>
                </dl>
                <p className="tiny muted">
                  Hết hạn lúc {new Date(credentials.expiresAt).toLocaleString("vi-VN")}.
                </p>
                <button
                  type="button"
                  className="secondary wide"
                  onClick={() => navigator.clipboard.writeText(
                    `Tên đăng nhập: ${credentials.username}\nMật khẩu tạm: ${credentials.temporaryPassword}`,
                  )}
                >
                  <Copy size={16} /> Sao chép thông tin
                </button>
              </div>
            )}
            <ErrorBox error={act.error} />
            {modal !== "credentials" && (
              <button className="primary wide" disabled={act.isPending}>
                {act.isPending ? "Đang xử lý…" : "Xác nhận"}
              </button>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
export function ProgressPage() {
  const user = useAuth((s) => s.user)!;
  const [student, setStudent] = useState(
    user.role === "STUDENT" ? user.id : "",
  );
  const children = useQuery({
    queryKey: ["children"],
    queryFn: () => api("/children"),
    enabled: user.role === "PARENT",
  });
  const q = useQuery({
    queryKey: ["progress", student],
    queryFn: () => api("/progress/" + student),
    enabled: !!student,
  });
  const link = useAction((code: string) =>
    api("/children/link", "POST", { code, consent: true }),
  );
  return (
    <>
      <PageHeading
        eyebrow="TIẾN ĐỘ & KẾT QUẢ"
        title={
          user.role === "PARENT" ? "Đồng hành cùng con" : "Tiến độ học tập"
        }
        description="Thống kê lịch sử thực hành, tỉ lệ hoàn thành bài tập và mức độ hiểu bài."
      />
      {user.role === "PARENT" && (
        <section className="panel">
          <h3>Học sinh đã liên kết</h3>
          <div className="button-row">
            {children.data?.map((c: any) => (
              <button
                className="secondary"
                key={c.student.id}
                onClick={() => setStudent(c.student.id)}
              >
                {c.student.fullName}
              </button>
            ))}
          </div>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              link.mutate(String(new FormData(e.currentTarget).get("code")));
            }}
          >
            <Field label="Mã liên kết do con cung cấp" name="code" required />
            <button className="primary" disabled={link.isPending}>
              Liên kết
            </button>
          </form>
          <p className="tiny muted">
            Liên kết xác nhận quyền truy cập tiến độ của con; nội dung gợi ý chi
            tiết không được hiển thị.
          </p>
          <ErrorBox error={link.error || children.error} />
        </section>
      )}
      {["TEACHER", "ADMIN"].includes(user.role) ? (
        <Empty>
          {user.role === "TEACHER" ? (
            <Link to="/classes">
              Mở lớp học để xem phân tích từng học sinh
            </Link>
          ) : (
            <Link to="/admin">Mở quản trị để xem người dùng</Link>
          )}
        </Empty>
      ) : (
        <>
          <ErrorBox error={q.error} />
          {q.data ? (
            <>
              <div className="progress-cards">
                {q.data.progress.map((p: any) => (
                  <div className="panel" key={p.contentId}>
                    <Badge>
                      {p.status === "completed" ? "Hoàn thành" : "Đang học"}
                    </Badge>
                    <h3>
                      {{
                        circuit: "Mạch điện",
                        eye: "Mắt người",
                        chemistry: "Phản ứng hóa học",
                      }[p.contentId as string] ?? p.contentId}
                    </h3>
                    <div className="progress-track">
                      <i style={{ width: p.score + "%" }} />
                    </div>
                    <p>
                      {Math.round(p.score)} điểm · {p.attemptsCount} lần thử
                    </p>
                    <small>Mức trợ giúp cao nhất: {p.lastHintLevel}/4</small>
                  </div>
                ))}
              </div>
              <section className="panel">
                <h2>Lịch sử thực hành</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Thử thách</th>
                        <th>Kết quả</th>
                        <th>Thời lượng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.data.attempts.map((a: any) => (
                        <tr key={a.id}>
                          <td>
                            {new Date(a.createdAt).toLocaleString("vi-VN")}
                          </td>
                          <td>{a.challengeId}</td>
                          <td>
                            <Badge tone={a.verdict}>
                              {verdictLabel(a.verdict)}
                            </Badge>
                          </td>
                          <td>{Math.round(a.durationMs / 1000)} giây</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {q.data.attempts.length === 0 && (
                  <Empty>Chưa có lượt thực hành.</Empty>
                )}
              </section>
            </>
          ) : (
            <Empty>
              {student ? "Đang tải tiến độ…" : "Chọn học sinh để xem tiến độ."}
            </Empty>
          )}
        </>
      )}
    </>
  );
}
export function Saved() {
  const q = useQuery({ queryKey: ["saved"], queryFn: () => api("/saved") });
  const del = useAction((id: string) => api("/saved/" + id, "DELETE"));
  return (
    <>
      <PageHeading
        title="Thí nghiệm đã lưu"
        description="Danh sách các trạng thái mô phỏng và kết quả thí nghiệm bạn đã lưu."
      />
      <ErrorBox error={q.error || del.error} />
      <div className="lesson-grid">
        {q.data?.map((s: any) => (
          <article className="panel" key={s.id}>
            <Badge>{s.labId}</Badge>
            <h3>{s.note}</h3>
            <p>{new Date(s.createdAt).toLocaleString("vi-VN")}</p>
            <Badge tone={s.simulationResult.verdict}>
              {verdictLabel(s.simulationResult.verdict)}
            </Badge>
            <div className="card-footer">
              <Link to={"/labs/" + s.labId} state={{ labState: s.labState }}>
                Mở lại thí nghiệm
              </Link>
              <button
                className="icon-button"
                aria-label="Xóa bản lưu"
                onClick={() => del.mutate(s.id)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {q.data?.length === 0 && (
        <Empty>
          Chạy một thí nghiệm rồi chọn “Lưu thí nghiệm” để bắt đầu hồ sơ.
        </Empty>
      )}
    </>
  );
}
export function SettingsPage() {
  const user = useAuth((s) => s.user)!;
  const [code, setCode] = useState("");
  const change = useAction((b: any) => api("/auth/password", "POST", b));
  const link = useAction(async () => {
    const r = await api("/parent-code", "POST");
    setCode(r.code);
  });
  return (
    <>
      <PageHeading title="Cài đặt tài khoản" />
      <section className="panel narrow">
        <h2>{user.fullName}</h2>
        <p>{user.role === "STUDENT" ? `@${user.username}` : user.email}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <Field
            label="Mật khẩu hiện tại"
            name="currentPassword"
            type="password"
            required
          />
          <Field
            label="Mật khẩu mới (ít nhất 12 ký tự)"
            name="password"
            type="password"
            minLength={12}
            required
          />
          <button className="primary" disabled={change.isPending}>
            Đổi mật khẩu
          </button>
          <ErrorBox error={change.error} />
          {change.isSuccess && (
            <p className="notice">
              Đã đổi mật khẩu và thu hồi các phiên làm mới cũ.
            </p>
          )}
        </form>
      </section>
      {user.role === "STUDENT" && (
        <section className="panel narrow">
          <h3>Liên kết phụ huynh</h3>
          <p>
            Tạo mã và gửi riêng cho phụ huynh của em. Mã chỉ dùng được một lần.
          </p>
          <button className="secondary" onClick={() => link.mutate(null)}>
            Tạo mã liên kết
          </button>
          {code && <code className="link-code">{code}</code>}
          <ErrorBox error={link.error} />
        </section>
      )}
    </>
  );
}
export { default as AdminPage } from "./Admin";
export function WebGLFallbackPage() {
  return (
    <div className="login" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <section className="login-form" style={{ textAlign: 'center', padding: '40px' }}>
        <div>
          <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>Không thể hiển thị trang</h2>
          <p className="muted" style={{ marginBottom: '24px', fontSize: '14px' }}>
            Hãy tải lại. Nếu mô hình 3D không hiển thị, kiểm tra trình duyệt có hỗ trợ WebGL.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              className="secondary" 
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
            <Link to="/" className="primary button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '12px', background: 'var(--blue)', color: 'white', textDecoration: 'none', fontWeight: 600 }}>
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
