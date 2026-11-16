/** Dev-only route `/dev/lab-kits/lens-explore`: the lens bench with the packaged FL-23 thin lens config. */
import { FL23_LENS_EXPLORE_CONFIG as config } from "@nexalab/sim/optics/lens";
import { observationLogKey } from "../../../../shared/explore/observation-log";
import { LENS_DRAFT_NOTICE } from "../LensExploreLabPage";
import { LensExploreBench } from "../LensExploreBench";

export default function LensExplorePreview() {
  return <LensExploreBench config={config} storageKey={observationLogKey(config.labId, config.configVersion)} exitTo="/labs"
    draftNotice={config.review.status !== "reviewed" ? LENS_DRAFT_NOTICE : undefined} />;
}
