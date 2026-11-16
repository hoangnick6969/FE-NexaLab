/** Dev-only route `/dev/lab-kits/energy-explore`: the mechanical energy bench with the packaged FL-24 config. */
import { FL24_ENERGY_EXPLORE_CONFIG as config } from "@nexalab/sim/mechanics/energy";
import { observationLogKey } from "../../../../shared/explore/observation-log";
import { ENERGY_DRAFT_NOTICE } from "../EnergyExploreLabPage";
import { EnergyExploreBench } from "../EnergyExploreBench";

export default function EnergyExplorePreview() {
  return <EnergyExploreBench config={config} storageKey={observationLogKey(config.labId, config.configVersion)} exitTo="/labs" draftNotice={ENERGY_DRAFT_NOTICE} />;
}
