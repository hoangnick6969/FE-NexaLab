/** Dev-only route `/dev/lab-kits/thermal-explore`: the thermal bench with the packaged FL-08 config. */
import { FL08_HEAT_TRANSFER_EXPLORE_CONFIG as config } from "@nexalab/sim/thermal";
import { observationLogKey } from "../../../../shared/explore/observation-log";
import { THERMAL_DRAFT_NOTICE } from "../ThermalExploreLabPage";
import { ThermalExploreBench } from "../ThermalExploreBench";

export default function ThermalExplorePreview() {
  return <ThermalExploreBench config={config} storageKey={observationLogKey(config.labId, config.configVersion)} exitTo="/labs" draftNotice={THERMAL_DRAFT_NOTICE} />;
}
