import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { api, idempotencyKey, useAuth } from "../../lib/api";
import { Badge, CardSkeleton, Empty, ErrorBox, Field, Modal } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { type ClassSummary } from "./class-types";
import { LoadError, ShownOnce, useMutate } from "./class-ui";
import { ClassDetail } from "./ClassDetail";

// ---------------- Teacher ----------------

export function TeacherClasses() {
  const user = useAuth((s) => s.user)!;
  const navigate = useNavigate();
  const { classId: selected } = useParams();
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
  const setSelected = (id: string) => navigate(`/classes/${encodeURIComponent(id)}${status === "ARCHIVED" ? "?status=ARCHIVED" : ""}`);
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
    title?.focus();
    title?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [selected, list.data]);
  return (
    <>
      <PageHeading
        eyebrow="CÙNG NHAU KHÁM PHÁ"
        title="Lớp học của tôi"
        description="Quản lý thành viên, mã tham gia và bài được giao cho từng lớp."
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
              + Tạo lớp
            </button>
          ) : null
        }
      />
      <div className="tabs" role="tablist" aria-label="Trạng thái lớp">
        {(["ACTIVE", "ARCHIVED"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={status === value}
            className={status === value ? "active" : ""}
            onClick={() => {
              navigate(value === "ARCHIVED" ? "/classes?status=ARCHIVED" : "/classes");
            }}
          >
            {value === "ACTIVE" ? "Đang hoạt động" : "Đã lưu trữ"}
          </button>
        ))}
      </div>
      <LoadError query={list} what="danh sách lớp" />
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
              Khối {c.grade} · {c.members.approved} thành viên
              {c.members.pending > 0 && ` · ${c.members.pending} chờ duyệt`}
            </p>
            <p>{c.assignments.active} bài đang giao</p>
            <div className="badge-row">
              {c.status === "ARCHIVED" ? (
                <Badge tone="outline">Đã lưu trữ</Badge>
              ) : (
                <Badge>{!c.joinCode.issued ? "Chưa có mã" : c.joinCode.enabled ? "Mã đang bật" : "Mã đã tắt"}</Badge>
              )}
              {c.requiresApproval && <Badge tone="outline">Cần duyệt</Badge>}
            </div>
          </button>
        ))}
      </div>
      {list.data && list.data.length === 0 && (
        <Empty>{status === "ACTIVE" ? "Chưa có lớp nào. Hãy tạo lớp đầu tiên." : "Chưa có lớp đã lưu trữ."}</Empty>
      )}
      {selected && teacher && list.data?.some((c) => c.id === selected) && (
        <ClassDetail key={selected} classroom={list.data.find((c) => c.id === selected)!} />
      )}
      {selected && list.data && !list.data.some((c) => c.id === selected) && <Empty>Không tìm thấy lớp trong danh sách này. Hãy chọn trạng thái lớp phù hợp hoặc quay lại danh sách.</Empty>}
      {creating && (
        <Modal title="Tạo lớp mới" onClose={() => setCreating(false)}>
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
              <Field label="Tên lớp" name="name" required maxLength={200} />
              <label className="field">
                <span>Khối lớp</span>
                <select name="grade" defaultValue={8}>
                  {[6, 7, 8, 9].map((g) => (
                    <option key={g} value={g}>
                      Khối {g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" name="requiresApproval" />
                Học sinh vào bằng mã cần giáo viên duyệt
              </label>
              <ErrorBox error={create.error} />
              <button className="primary wide" disabled={create.isPending}>
                {create.isPending ? "Đang tạo…" : "Tạo lớp"}
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
