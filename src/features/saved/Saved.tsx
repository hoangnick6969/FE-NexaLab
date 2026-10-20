import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, useAction, verdictLabel, CardSkeleton } from "../../components/ui";
import { defineText, formatDateTime } from "../../i18n";

const text = defineText({
  vi: {
    title: "Thí nghiệm đã lưu",
    description: "Mở lại cấu hình, tiếp tục thử và khám phá điều mới.",
    reopen: "Mở lại thí nghiệm",
    delete: "Xóa bản lưu",
    empty: "Chạy một thí nghiệm rồi chọn “Lưu thí nghiệm” để bắt đầu hồ sơ.",
  },
  en: {
    title: "Saved experiments",
    description: "Reopen a set-up, keep experimenting and discover something new.",
    reopen: "Reopen the experiment",
    delete: "Delete the save",
    empty: "Run an experiment and choose “Save experiment” to start your record.",
  },
});
const t = text();

export function Saved() {
  const q = useQuery({ queryKey: ["saved"], queryFn: () => api("/saved") });
  const del = useAction((id: string) => api("/saved/" + id, "DELETE"));
  return (
    <>
      <PageHeading
        title={t.title}
        description={t.description}
      />
      <ErrorBox error={q.error || del.error} />
      <div className="lesson-grid">
        {q.isLoading && <CardSkeleton count={3} />}
        {q.data?.map((s: any) => (
          <article className="panel" key={s.id}>
            <Badge>{s.labId}</Badge>
            <h3>{s.note}</h3>
            <p>{formatDateTime(s.createdAt)}</p>
            <Badge tone={s.simulationResult.verdict}>
              {verdictLabel(s.simulationResult.verdict)}
            </Badge>
            <div className="card-footer">
              <Link to={"/labs/" + s.labId} state={{ labState: s.labState }}>
                {t.reopen} →
              </Link>
              <button
                className="icon-button"
                aria-label={t.delete}
                onClick={() => del.mutate(s.id)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {q.data && q.data.length === 0 && (
        <Empty>
          {t.empty}
        </Empty>
      )}
    </>
  );
}
