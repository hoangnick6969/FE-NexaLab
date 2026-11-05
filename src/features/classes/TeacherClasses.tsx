import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, Layers, BarChart2 } from "lucide-react";
import { api, idempotencyKey, useAuth } from "../../lib/api";
import { Badge, CardSkeleton, Empty, ErrorBox, Field, Modal } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { type ClassSummary } from "./class-types";
import { LoadError, ShownOnce, useMutate } from "./class-ui";
import { ClassDetail } from "./ClassDetail";
import { defineText } from "../../i18n";
import "./teacher-operations.css";

const text = defineText({
  vi: {
    title: "Lớp học của tôi",
    description: "Quản lý thành viên, mã tham gia và bài được giao cho từng lớp.",
    createClass: "Tạo lớp",
    classStatus: "Trạng thái lớp",
    active: "Đang hoạt động",
    archived: "Đã lưu trữ",
    classList: "danh sách lớp",
    grade: (g: number) => `Khối ${g}`,
    members: (n: number) => `${n} thành viên`,
    pending: (n: number) => `${n} chờ duyệt`,
    activeWork: (n: number) => `${n} bài đang giao`,
    archivedBadge: "Đã lưu trữ",
    noCode: "Chưa có mã",
    codeOn: "Mã đang bật",
    codeOff: "Mã đã tắt",
    needsApproval: "Cần duyệt",
    noClasses: "Chưa có lớp nào. Hãy tạo lớp đầu tiên.",
    noArchived: "Chưa có lớp đã lưu trữ.",
    newClass: "Tạo lớp mới",
    className: "Tên lớp",
    gradeLabel: "Khối lớp",
    approvalRule: "Học sinh vào bằng mã cần giáo viên duyệt",
    creating: "Đang tạo…",
    create: "Tạo lớp",
    studentsShortcut: "Học sinh",
    assignmentsShortcut: "Bài giao",
    resourcesShortcut: "Tài nguyên",
    progressShortcut: "Theo dõi",
  },
  en: {
    title: "My classes",
    description: "Manage members, join codes and assigned work for each class.",
    createClass: "Create class",
    classStatus: "Class status",
    active: "Active",
    archived: "Archived",
    classList: "the class list",
    grade: (g: number) => `Grade ${g}`,
    members: (n: number) => `${n} ${n === 1 ? "member" : "members"}`,
    pending: (n: number) => `${n} waiting`,
    activeWork: (n: number) => `${n} active ${n === 1 ? "assignment" : "assignments"}`,
    archivedBadge: "Archived",
    noCode: "No code",
    codeOn: "Code on",
    codeOff: "Code off",
    needsApproval: "Needs approval",
    noClasses: "No classes yet. Create your first class.",
    noArchived: "No archived classes.",
    newClass: "Create a new class",
    className: "Class name",
    gradeLabel: "Grade",
    approvalRule: "Students joining with a code need teacher approval",
    creating: "Creating…",
    create: "Create class",
    studentsShortcut: "Students",
    assignmentsShortcut: "Assignments",
    resourcesShortcut: "Resources",
    progressShortcut: "Progress",
  },
});
const t = text();

// ---------------- Teacher ----------------

export function TeacherClasses() {
  const user = useAuth((s) => s.user)!;
  const navigate = useNavigate();
  const { classId: selected } = useParams();
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
  const currentTab = searchParams.get("tab") || "students";
  const setSelected = (id: string, tab?: string) => {
    const params = new URLSearchParams(searchParams);
    if (tab) params.set("tab", tab);
    else params.delete("tab");
    if (status === "ARCHIVED") params.set("status", "ARCHIVED");
    const query = params.toString();
    navigate(`/classes/${encodeURIComponent(id)}${query ? `?${query}` : ""}`);
  };
  const [creating, setCreating] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const createKey = useRef(idempotencyKey());
  const list = useQuery<ClassSummary[]>({
    queryKey: ["classes", status],
    queryFn: () => api("/classes?status=" + status),
  });
  const create = useMutate<{ class: ClassSummary; joinCode: string | null }>();
  const teacher = user.role === "TEACHER";
  const focusedClass = useRef<string | null>(null);
  useEffect(() => {
    if (!selected) { focusedClass.current = null; return; }
    if (focusedClass.current === selected) return;
    if (!selected || !list.data?.some((c) => c.id === selected)) return;
    const title = document.getElementById("class-detail-title");
    focusedClass.current = selected;
    title?.focus({ preventScroll: true });
    // On small mobile screens only, scroll into view smoothly
    if (window.innerWidth < 768) {
      title?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selected, list.data]);
  return (
    <div className="teacher-workspace teacher-class-listing">
      <PageHeading
        title={t.title}
        description={t.description}
        action={
          teacher ? (
            <button
              className="primary"
              onClick={() => {
                createKey.current = idempotencyKey();
                create.reset();
                setIssuedCode(null);
                setCreating(true);
              }}
            >
              + {t.createClass}
            </button>
          ) : null
        }
      />
      <div className="teacher-workspace-toolbar">
        <div className="teacher-workspace-tabs" role="tablist" aria-label={t.classStatus}>
          {(["ACTIVE", "ARCHIVED"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={status === value}
              onClick={() => navigate(value === "ARCHIVED" ? "/classes?status=ARCHIVED" : "/classes")}
            >
              {value === "ACTIVE" ? t.active : t.archived}
            </button>
          ))}
        </div>
      </div>
      <LoadError query={list} what={t.classList} />
      <div className={`teacher-class-content${selected && list.data?.some((classroom) => classroom.id === selected) ? " has-selection" : ""}`}>
        <div className="class-grid">
          {list.isLoading && <CardSkeleton count={3} />}
          {list.data?.map((c) => (
            <article
              key={c.id}
              className={"panel class-card " + (selected === c.id ? "selected" : "")}
            >
              <div
                role="button"
                tabIndex={0}
                className="class-card-main"
                aria-pressed={selected === c.id}
                onClick={() => setSelected(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(c.id);
                  }
                }}
              >
                <div className="class-card-head">
                  <Users size={20} aria-hidden="true" />
                  <h3>{c.name}</h3>
                </div>
                <p>
                  {t.grade(c.grade)} · {t.members(c.members.approved)}
                  {c.members.pending > 0 && ` · ${t.pending(c.members.pending)}`}
                </p>
                <p>{t.activeWork(c.assignments.active)}</p>
                <div className="badge-row">
                  {c.status === "ARCHIVED" ? (
                    <Badge tone="outline">{t.archivedBadge}</Badge>
                  ) : (
                    <Badge>{!c.joinCode.issued ? t.noCode : c.joinCode.enabled ? t.codeOn : t.codeOff}</Badge>
                  )}
                  {c.requiresApproval && <Badge tone="outline">{t.needsApproval}</Badge>}
                </div>
              </div>
              <div className="class-card-shortcuts" aria-label={`Lối tắt quản lý ${c.name}`}>
                <button
                  type="button"
                  className={`class-shortcut-btn${selected === c.id && currentTab === "students" ? " active" : ""}`}
                  title={t.studentsShortcut}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(c.id, "students");
                  }}
                >
                  <Users size={13} aria-hidden="true" />
                  <span>{t.studentsShortcut}</span>
                  {c.members.pending > 0 && <span className="shortcut-counter-badge">{c.members.pending}</span>}
                </button>
                <button
                  type="button"
                  className={`class-shortcut-btn${selected === c.id && currentTab === "work" ? " active" : ""}`}
                  title={t.assignmentsShortcut}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(c.id, "work");
                  }}
                >
                  <BookOpen size={13} aria-hidden="true" />
                  <span>{t.assignmentsShortcut}</span>
                </button>
                <button
                  type="button"
                  className={`class-shortcut-btn${selected === c.id && currentTab === "resources" ? " active" : ""}`}
                  title={t.resourcesShortcut}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(c.id, "resources");
                  }}
                >
                  <Layers size={13} aria-hidden="true" />
                  <span>{t.resourcesShortcut}</span>
                </button>
                {c.status !== "ARCHIVED" && (
                  <button
                    type="button"
                    className={`class-shortcut-btn${selected === c.id && currentTab === "progress" ? " active" : ""}`}
                    title={t.progressShortcut}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(c.id, "progress");
                    }}
                  >
                    <BarChart2 size={13} aria-hidden="true" />
                    <span>{t.progressShortcut}</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {selected && teacher && list.data?.some((c) => c.id === selected) && (
          <div className="teacher-class-detail">
            <ClassDetail key={selected} classroom={list.data.find((c) => c.id === selected)!} />
          </div>
        )}
        {selected && list.data && !list.data.some((c) => c.id === selected) && <Empty>Không tìm thấy lớp trong danh sách này. Hãy chọn trạng thái lớp phù hợp hoặc quay lại danh sách.</Empty>}
      </div>
      {list.data && list.data.length === 0 && (
        <Empty>{status === "ACTIVE" ? t.noClasses : t.noArchived}</Empty>
      )}
      {creating && (
        <Modal title={t.newClass} onClose={() => setCreating(false)}>
          {issuedCode ? (
            <ShownOnce code={issuedCode} onDone={() => setCreating(false)} />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                create.mutate(
                  {
                    path: "/classes",
                    key: createKey.current,
                    body: {
                      name: String(form.get("name")),
                      grade: Number(form.get("grade")),
                      requiresApproval: form.get("requiresApproval") === "on",
                    },
                  },
                  {
                    onSuccess: (data) => {
                      navigate(`/classes/${encodeURIComponent(data.class.id)}`);
                      if (data.joinCode) setIssuedCode(data.joinCode);
                      else setCreating(false);
                    },
                  },
                );
              }}
            >
              <Field label={t.className} name="name" required maxLength={200} />
              <label className="field">
                <span>{t.gradeLabel}</span>
                <select name="grade" defaultValue={8}>
                  {[6, 7, 8, 9].map((g) => (
                    <option key={g} value={g}>
                      {t.grade(g)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" name="requiresApproval" />
                {t.approvalRule}
              </label>
              <ErrorBox error={create.error} />
              <button className="primary wide" disabled={create.isPending}>
                {create.isPending ? t.creating : t.create}
              </button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
