/**
 * `/labs/:id` page of the optics bench, registered as `k6-optics-bench@1` in `runtime/explore-registry.ts`.
 * Runs the config the server pinned (already resolved by `Lab.tsx`): no LabRun, no submission, no score.
 */
import type { RefractionLabConfig } from "@nexalab/sim/optics";
import type { ExplorePageProps } from "../../../runtime/explore-registry";
import { observationLogKey } from "../../../shared/explore/observation-log";
import { RefractionExploreBench } from "./RefractionExploreBench";

export const REFRACTION_DRAFT_NOTICE = "Chiết suất và cách bố trí đĩa chia độ là giả định kỹ thuật, chờ owner duyệt và đối chiếu SGK KHTN 9.";

export default function RefractionExploreLabPage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as RefractionLabConfig;
  return <RefractionExploreBench
    config={{ ...config, title: title || config.title }}
    storageKey={observationLogKey(labId, activity.id)}
    activityId={activity.id}
    exitTo="/labs"
    draftNotice={config.review.status !== "reviewed" ? REFRACTION_DRAFT_NOTICE : undefined}
  />;
}
