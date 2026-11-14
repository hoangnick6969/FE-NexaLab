/**
 * `/labs/:id` for Explore-first K2 Labs (FL-13, FL-14a): opens the bench directly, with no LabRun,
 * no submission and no score. The Lab row from `GET /labs` must be visible to the user, as for any Lab.
 */
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api, useAuth } from "../../../../../lib/api";
import { LabSpace } from "../../../shared/LabSpace";
import { resolveExploreConfig } from "../../../runtime/explore-labs";
import { ExploreBench } from "./ExploreBench";

export default function ExploreLabPage({ labId }: { labId: string }) {
  const navigate = useNavigate();
  const role = useAuth((state) => state.user!.role);
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => api<any[]>("/labs") });
  const row = labs.data?.find((item) => item.id === labId);

  if (labs.isLoading) return <LabSpace title="Phòng thí nghiệm" exitTo="/labs"><p role="status" className="panel">Đang tải bài thực hành…</p></LabSpace>;
  if (role === "STUDENT" && labs.isSuccess && !row) {
    return <LabSpace title="Phòng thí nghiệm" exitTo="/labs"><section className="panel"><h1>Bài thực hành chưa được phát hành</h1><p>Bài này chưa có trong danh sách Lab của em.</p><Link className="primary" to="/labs">Về danh sách Lab</Link></section></LabSpace>;
  }
  const { config, source } = resolveExploreConfig(labId, row);
  if (!config) return <LabSpace title="Phòng thí nghiệm" exitTo="/labs"><section className="panel"><p>Không tìm thấy cấu hình bộ Kit cho bài này.</p></section></LabSpace>;
  const draft = config.review.status !== "reviewed";
  return <ExploreBench
    config={{ ...config, title: row?.title ?? config.title }}
    onExit={() => navigate("/labs")}
    exitTo="/labs"
    configSource={source}
    draftNotice={draft ? "Dữ liệu hoá học của bài này là bản nháp, đang chờ giáo viên bộ môn duyệt. Màu sắc và số đo là mô phỏng lý tưởng." : undefined}
  />;
}
