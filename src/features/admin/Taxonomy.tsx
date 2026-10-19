import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { ErrorBox, Field, useAction } from "../../components/ui";
import { QueryState, ReasonDialog, Status } from "./admin-ui";

// ───────────────────────── taxonomy ─────────────────────────
export function Taxonomy() {
  const q = useQuery({ queryKey: ["admin", "taxonomy"], queryFn: () => api("/admin/taxonomy") });
  const act = useAction(({ path, method = "POST", body }: any) => api(path, method, body));
  const [dialog, setDialog] = useState<any>(null);
  const d = q.data;
  const submit = (path: string, method = "POST") => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const body: any = { ...f };
    if ("ebookUrl" in f) body.ebookUrl = f.ebookUrl.trim() || null;
    if (f.grade) body.grade = Number(f.grade);
    if ("outcomeCodes" in f)
      body.outcomeCodes = f.outcomeCodes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    act.mutate({ path, method, body }, { onSuccess: () => form.reset() });
  };
  const domains = Object.entries(d?.domains ?? {}) as Array<[string, string]>;
  return (
    <section className="panel">
      <h2>Phân loại chương trình</h2>
      <p className="tiny muted">
        Mã định danh không thể ghi đè: tạo trùng mã sẽ bị từ chối. Yêu cầu cần đạt đang được dùng chỉ có thể lưu trữ, không sửa nội dung.
      </p>
      <ErrorBox error={!dialog ? act.error : null} />
      <QueryState query={q}>
        {d && (
          <div className="admin-grid">
            <div>
              <h3>Môn học</h3>
              <ul className="admin-list">
                {d.subjects.map((s: any) => (
                  <li key={s.id}>
                    <b>{s.id}</b> {s.name}{" "}
                    <span className="tiny muted">
                      ({s.lessons} bài, {s.labs} phòng)
                    </span>
                    <form className="admin-inline" onSubmit={submit(`/admin/subjects/${encodeURIComponent(s.id)}`, "PUT")} aria-label={`Cập nhật sách tham khảo môn ${s.name}`}>
                      <Field label="URL ebook HTTPS" name="ebookUrl" type="url" placeholder="https://…" defaultValue={s.ebookUrl ?? ""} />
                      <input type="hidden" name="name" value={s.name} />
                      <button className="text-button">Lưu liên kết</button>
                    </form>
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/subjects")} aria-label="Thêm môn học">
                <Field label="Mã môn" name="id" required />
                <Field label="Tên môn" name="name" required />
                <Field label="URL ebook HTTPS (tùy chọn)" name="ebookUrl" type="url" placeholder="https://…" />
                <button className="secondary">Thêm</button>
              </form>
            </div>
            <div>
              <h3>Chương</h3>
              <ul className="admin-list">
                {d.chapters.map((c: any) => (
                  <li key={c.code}>
                    <b>{c.code}</b> {c.title} · Khối {c.grade} · {d.domains[c.domain] ?? c.domain} <Status value={c.status} />{" "}
                    <button type="button" className="text-button" onClick={() => setDialog({ kind: "chapter", item: c })}>
                      {c.status === "active" ? "Lưu trữ" : "Khôi phục"}
                    </button>
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/chapters")} aria-label="Thêm chương">
                <Field label="Mã chương" name="code" required />
                <label className="field">
                  <span>Môn</span>
                  <select name="subjectId" required>
                    {d.subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Khối</span>
                  <select name="grade">
                    <option value="8">8</option>
                    <option value="9">9</option>
                  </select>
                </label>
                <label className="field">
                  <span>Mạch nội dung</span>
                  <select name="domain">
                    {domains.map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Tên chương" name="title" required />
                <button className="secondary">Thêm</button>
              </form>
            </div>
            <div>
              <h3>Chủ đề</h3>
              <ul className="admin-list">
                {d.topics.map((t: any) => (
                  <li key={t.code}>
                    <b>{t.code}</b> {t.title} · chương {t.chapterCode} · YCCĐ: {(t.outcomeCodes as string[]).join(", ") || "—"}{" "}
                    <Status value={t.status} />
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/topics")} aria-label="Thêm chủ đề">
                <Field label="Mã chủ đề" name="code" required />
                <label className="field">
                  <span>Chương</span>
                  <select name="chapterCode" required>
                    {d.chapters
                      .filter((c: any) => c.status === "active")
                      .map((c: any) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                  </select>
                </label>
                <Field label="Tên chủ đề" name="title" required />
                <Field label="Mã YCCĐ (phân cách bằng dấu phẩy)" name="outcomeCodes" />
                <button className="secondary">Thêm</button>
              </form>
            </div>
            <div>
              <h3>Yêu cầu cần đạt</h3>
              <ul className="admin-list">
                {d.outcomes.map((o: any) => (
                  <li key={o.code}>
                    <b>{o.code}</b> {o.statement}{" "}
                    <span className="tiny muted">
                      ({o.lessons} bài{o.synthetic ? ", dữ liệu mẫu" : ""})
                    </span>{" "}
                    <Status value={o.status} />{" "}
                    <button type="button" className="text-button" onClick={() => setDialog({ kind: "outcome", item: o })}>
                      {o.status === "active" ? "Lưu trữ" : "Khôi phục"}
                    </button>
                  </li>
                ))}
              </ul>
              <form className="admin-inline" onSubmit={submit("/admin/outcomes")} aria-label="Thêm yêu cầu cần đạt">
                <Field label="Mã YCCĐ" name="code" required />
                <label className="field">
                  <span>Khối</span>
                  <select name="grade">
                    <option value="8">8</option>
                    <option value="9">9</option>
                  </select>
                </label>
                <label className="field">
                  <span>Mạch nội dung</span>
                  <select name="domain">
                    {domains.map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Chương" name="chapter" required />
                <Field label="Nội dung yêu cầu" name="statement" required minLength={5} />
                <button className="secondary">Thêm</button>
              </form>
            </div>
          </div>
        )}
      </QueryState>
      {dialog && (
        <ReasonDialog
          title={dialog.item.status === "active" ? "Lưu trữ mục phân loại" : "Khôi phục mục phân loại"}
          effect={
            dialog.item.status === "active"
              ? "Mục đã lưu trữ vẫn giữ trên các bài học, chủ đề đang tham chiếu nhưng không thể gắn mới."
              : "Mục được dùng lại cho các bài học và chủ đề mới."
          }
          confirmLabel={dialog.item.status === "active" ? "Lưu trữ" : "Khôi phục"}
          danger={dialog.item.status === "active"}
          pending={act.isPending}
          error={act.error}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => {
            const status = dialog.item.status === "active" ? "archived" : "active";
            const body =
              dialog.kind === "chapter"
                ? { title: dialog.item.title, status, reason }
                : { statement: dialog.item.statement, status, reason };
            act.mutate(
              { path: `/admin/${dialog.kind === "chapter" ? "chapters" : "outcomes"}/${dialog.item.code}`, method: "PUT", body },
              { onSuccess: () => setDialog(null) },
            );
          }}
        />
      )}
    </section>
  );
}
