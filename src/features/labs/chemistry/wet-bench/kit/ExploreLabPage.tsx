/**
 * `/labs/:id` for Explore Labs on the K2 wet bench (FL-13, FL-14a): opens the bench with the config the
 * server pinned for this Lab (already resolved by `Lab.tsx`), with no LabRun, no submission and no score.
 */
import { useNavigate } from "react-router-dom";
import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";
import type { ExploreActivity } from "../../../runtime/explore-labs";
import { ExploreBench } from "./ExploreBench";

export default function ExploreLabPage({ labId, title, config, activity }: { labId: string; title: string; config: ChemistryLabConfig; activity: ExploreActivity }) {
  const navigate = useNavigate();
  const draft = config.review.status !== "reviewed";
  return <ExploreBench
    storageKey={`${labId}@${activity.id}`}
    config={{ ...config, title: title || config.title }}
    onExit={() => navigate("/labs")}
    exitTo="/labs"
    configSource="database"
    draftNotice={draft ? "Dữ liệu hoá học của bài này là bản nháp, đang chờ giáo viên bộ môn duyệt. Màu sắc và số đo là mô phỏng lý tưởng." : undefined}
  />;
}
