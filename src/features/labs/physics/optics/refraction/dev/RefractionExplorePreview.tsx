/** Dev-only route `/dev/lab-kits/refraction-explore`: the optics bench with the packaged FL-23 config. */
import { FL23_REFRACTION_EXPLORE_CONFIG as config } from "@nexalab/sim/optics";
import { observationLogKey } from "../../../../shared/explore/observation-log";
import { REFRACTION_DRAFT_NOTICE } from "../RefractionExploreLabPage";
import { RefractionExploreBench } from "../RefractionExploreBench";

export default function RefractionExplorePreview() {
  return <RefractionExploreBench config={config} storageKey={observationLogKey(config.labId, config.configVersion)} exitTo="/labs"
    draftNotice={config.review.status !== "reviewed" ? REFRACTION_DRAFT_NOTICE : undefined} />;
}
