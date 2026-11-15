/**
 * `/labs/:id` page of the K2 wet bench (FL-13, FL-14a), registered as `k2-wet-bench@1` in
 * `runtime/explore-registry.ts`. Opens the bench with the config the server pinned for this Lab
 * (already resolved by `Lab.tsx`), with no LabRun, no submission and no score.
 */
import { useNavigate } from "react-router-dom";
import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";
import type { ExplorePageProps } from "../../../runtime/explore-registry";
import { observationLogKey } from "../../../shared/explore/observation-log";
import { ExploreBench } from "./ExploreBench";

export default function ExploreLabPage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const navigate = useNavigate();
  const config = raw as ChemistryLabConfig;
  const draft = config.review.status !== "reviewed";
  return <ExploreBench
    storageKey={observationLogKey(labId, activity.id)}
    config={{ ...config, title: title || config.title }}
    onExit={() => navigate("/labs")}
    exitTo="/labs"
    configSource="database"
    draftNotice={draft ? "Dữ liệu hoá học của bài này là bản nháp, đang chờ giáo viên bộ môn duyệt. Màu sắc và số đo là mô phỏng lý tưởng." : undefined}
  />;
}
