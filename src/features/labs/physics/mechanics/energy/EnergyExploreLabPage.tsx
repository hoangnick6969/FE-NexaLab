/**
 * `/labs/:id` page of the mechanical energy bench, registered as `k5-energy-bench@1` in `runtime/explore-registry.ts`.
 * Runs the config the server pinned (already resolved by `Lab.tsx`): no LabRun, no submission, no score.
 */
import type { EnergyLabConfig } from "@nexalab/sim/mechanics/energy";
import type { ExplorePageProps } from "../../../runtime/explore-registry";
import { observationLogKey } from "../../../shared/explore/observation-log";
import { EnergyExploreBench } from "./EnergyExploreBench";

export const ENERGY_DRAFT_NOTICE = "Mô hình năng lượng cơ học là giả định kỹ thuật (P = 10·m, không ma sát), chờ đối chiếu SGK KHTN 9 và reviewer Lý.";

export default function EnergyExploreLabPage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as EnergyLabConfig;
  return <EnergyExploreBench
    config={{ ...config, title: title || config.title }}
    storageKey={observationLogKey(labId, activity.id)}
    activityId={activity.id}
    exitTo="/labs"
    draftNotice={config.review.status !== "reviewed" ? ENERGY_DRAFT_NOTICE : undefined}
  />;
}
