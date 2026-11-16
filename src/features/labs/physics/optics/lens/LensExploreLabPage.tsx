/**
 * `/labs/:id` page of the lens bench, registered as `k6-lens-bench@1` in `runtime/explore-registry.ts`.
 * Runs the config the server pinned (already resolved by `Lab.tsx`): no LabRun, no submission, no score.
 */
import type { LensLabConfig } from "@nexalab/sim/optics/lens";
import type { ExplorePageProps } from "../../../runtime/explore-registry";
import { observationLogKey } from "../../../shared/explore/observation-log";
import { LensExploreBench } from "./LensExploreBench";

export const LENS_DRAFT_NOTICE = "Bộ thấu kính, cách đo tiêu cự và quy ước dấu là giả định kỹ thuật, chờ owner duyệt và đối chiếu SGK KHTN 9.";

export default function LensExploreLabPage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as LensLabConfig;
  return <LensExploreBench config={{ ...config, title: title || config.title }} storageKey={observationLogKey(labId, activity.id)} activityId={activity.id} exitTo="/labs"
    draftNotice={config.review.status !== "reviewed" ? LENS_DRAFT_NOTICE : undefined} />;
}
