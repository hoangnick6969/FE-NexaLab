import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { api, idempotencyKey, useAuth } from "../../lib/api";
import { Badge, CardSkeleton, Empty, ErrorBox, Field, Modal } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { type ClassSummary } from "./class-types";
import { LoadError, ShownOnce, useMutate } from "./class-ui";
import { ClassDetail } from "./ClassDetail";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    eyebrow: "CÙNG NHAU KHÁM PHÁ",
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
  },
  en: {
    eyebrow: "EXPLORING TOGETHER",
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
  },
});
const t = text();

// ---------------- Teacher ----------------

export function TeacherClasses() {
  const user = useAuth((s) => s.user)!;
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const createKey = useRef(idempotencyKey());
  const list = useQuery<ClassSummary[]>({
    queryKey: ["classes", status],
    queryFn: () => api("/classes?status=" + status),
  });
  const create = useMutate<{ class: ClassSummary; joinCode: string | null }>();
  const teacher = user.role === "TEACHER";
  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
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
      <div className="tabs" role="tablist" aria-label={t.classStatus}>
        {(["ACTIVE", "ARCHIVED"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={status === value}
            className={status === value ? "active" : ""}
            onClick={() => {
              setStatus(value);
              setSelected(null);
            }}
          >
            {value === "ACTIVE" ? t.active : t.archived}
          </button>
        ))}
      </div>
      <LoadError query={list} what={t.classList} />
      <div className="class-grid">
        {list.isLoading && <CardSkeleton count={3} />}
        {list.data?.map((c) => (
          <button
            key={c.id}
            className={"panel class-card " + (selected === c.id ? "selected" : "")}
            aria-pressed={selected === c.id}
            onClick={() => setSelected(c.id)}
          >
            <Users size={24} />
            <h3>{c.name}</h3>
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
          </button>
        ))}
      </div>
      {list.data && list.data.length === 0 && (
        <Empty>{status === "ACTIVE" ? t.noClasses : t.noArchived}</Empty>
      )}
      {selected && teacher && list.data?.some((c) => c.id === selected) && (
        <ClassDetail classroom={list.data.find((c) => c.id === selected)!} />
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
                      setSelected(data.class.id);
                      setStatus("ACTIVE");
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
    </>
  );
}
