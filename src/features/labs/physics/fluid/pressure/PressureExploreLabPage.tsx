/**
 * `/labs/:id` page of the fluid bench, registered as `k3-fluid-bench@1` in `runtime/explore-registry.ts`.
 * Runs the config the server pinned (already resolved by `Lab.tsx`): no LabRun, no submission, no score.
 */
import type { FluidLabConfig } from "@nexalab/sim/fluid";
import type { ExplorePageProps } from "../../../runtime/explore-registry";
import { observationLogKey } from "../../../shared/explore/observation-log";
import { FluidExploreBench } from "./FluidExploreBench";

export const FLUID_DRAFT_NOTICE = "Mô hình áp suất chất lỏng là giả định kỹ thuật (d = 10 000 N/m³, mức lõm của màng), chưa được reviewer Lý duyệt.";

export default function PressureExploreLabPage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as FluidLabConfig;
  return <FluidExploreBench
    config={{ ...config, title: title || config.title }}
    storageKey={observationLogKey(labId, activity.id)}
    activityId={activity.id}
    exitTo="/labs"
    draftNotice={config.review.status !== "reviewed" ? FLUID_DRAFT_NOTICE : undefined}
  />;
}
