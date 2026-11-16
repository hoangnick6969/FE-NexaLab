/** Dev-only route `/dev/lab-kits/fluid-explore`: the fluid bench with the packaged FL-04 config. */
import { FL04_PRESSURE_EXPLORE_CONFIG as config } from "@nexalab/sim/fluid";
import { observationLogKey } from "../../../../shared/explore/observation-log";
import { FLUID_DRAFT_NOTICE } from "../PressureExploreLabPage";
import { FluidExploreBench } from "../FluidExploreBench";

export default function FluidExplorePreview() {
  return <FluidExploreBench config={config} storageKey={observationLogKey(config.labId, config.configVersion)} exitTo="/labs" draftNotice={FLUID_DRAFT_NOTICE} />;
}
