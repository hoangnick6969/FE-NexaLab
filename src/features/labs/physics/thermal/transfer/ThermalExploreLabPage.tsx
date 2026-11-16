/**
 * `/labs/:id` page of the thermal bench, registered as `k4-thermal-bench@1` in `runtime/explore-registry.ts`.
 * Runs the config the server pinned (already resolved by `Lab.tsx`): no LabRun, no submission, no score.
 */
import type { ThermalLabConfig } from "@nexalab/sim/thermal";
import type { ExplorePageProps } from "../../../runtime/explore-registry";
import { observationLogKey } from "../../../shared/explore/observation-log";
import { ThermalExploreBench } from "./ThermalExploreBench";

export const THERMAL_DRAFT_NOTICE = "Bảng 28.1 lấy từ SGK; thời gian rơi đinh là thang minh hoạ và hằng số trạm bức xạ là giả định kỹ thuật, chưa được reviewer Lý duyệt.";

export default function ThermalExploreLabPage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as ThermalLabConfig;
  return <ThermalExploreBench
    config={{ ...config, title: title || config.title }}
    storageKey={observationLogKey(labId, activity.id)}
    activityId={activity.id}
    exitTo="/labs"
    draftNotice={config.review.status !== "reviewed" ? THERMAL_DRAFT_NOTICE : undefined}
  />;
}
