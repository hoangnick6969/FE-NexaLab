/** Dev-only route `/dev/lab-kits/lever-explore`: the mechanics bench with the packaged FL-06 config. */
import { FL06_LEVER_EXPLORE_CONFIG as config } from "@nexalab/sim/mechanics";
import { observationLogKey } from "../../../../shared/explore/observation-log";
import { LEVER_DRAFT_NOTICE } from "../LeverExploreLabPage";
import { LeverExploreBench } from "../LeverExploreBench";

export default function LeverExplorePreview() {
  return <LeverExploreBench config={config} storageKey={observationLogKey(config.labId, config.configVersion)} exitTo="/labs" draftNotice={LEVER_DRAFT_NOTICE} />;
}
