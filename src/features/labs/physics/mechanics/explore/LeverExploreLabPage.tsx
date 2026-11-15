/**
 * `/labs/:id` page of the mechanics bench, registered as `k5-lever-bench@1` in `runtime/explore-registry.ts`.
 * Runs the config the server pinned (already resolved by `Lab.tsx`): no LabRun, no submission, no score.
 */
import type { LeverLabConfig } from "@nexalab/sim/mechanics";
import type { ExplorePageProps } from "../../../runtime/explore-registry";
import { observationLogKey } from "../../../shared/explore/observation-log";
import { LeverExploreBench } from "./LeverExploreBench";

export const LEVER_DRAFT_NOTICE = "Hằng số của mô hình đòn bẩy là giả định kỹ thuật, chưa phải số liệu SGK. Thanh và lực là mô hình lý tưởng.";

export default function LeverExploreLabPage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as LeverLabConfig;
  return <LeverExploreBench
    config={{ ...config, title: title || config.title }}
    storageKey={observationLogKey(labId, activity.id)}
    activityId={activity.id}
    exitTo="/labs"
    draftNotice={config.review.status !== "reviewed" ? LEVER_DRAFT_NOTICE : undefined}
  />;
}
