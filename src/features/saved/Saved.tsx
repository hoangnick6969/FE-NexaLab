import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, useAction, verdictLabel, CardSkeleton } from "../../components/ui";

export function Saved() {
  const q = useQuery({ queryKey: ["saved"], queryFn: () => api("/saved") });
  const del = useAction((id: string) => api("/saved/" + id, "DELETE"));
  return (
    <>
      <PageHeading
        title="Thí nghiệm đã lưu"
        description="Mở lại cấu hình, tiếp tục thử và khám phá điều mới."
      />
      <ErrorBox error={q.error || del.error} />
      <div className="lesson-grid">
        {q.isLoading && <CardSkeleton count={3} />}
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
                Mở lại thí nghiệm →
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
      {q.data && q.data.length === 0 && (
        <Empty>
          Chạy một thí nghiệm rồi chọn “Lưu thí nghiệm” để bắt đầu hồ sơ.
        </Empty>
      )}
    </>
  );
}
