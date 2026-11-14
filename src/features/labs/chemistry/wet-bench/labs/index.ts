import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { fl10ExploreConfig } from "./fl-10-explore.config";
import { fl13Config } from "./fl-13.config";
import { fl14aConfig } from "./fl-14a.config";

/** K2 Explore configs. Adding a Lab = adding one config here (its reactions must already be in k2-reactions). */
export const k2LabConfigs: Readonly<Record<string, ChemistryLabConfig>> = {
  "fl-13": fl13Config,
  "fl-14a": fl14aConfig,
  "fl-10": fl10ExploreConfig,
};

export { fl10ExploreConfig, fl13Config, fl14aConfig };
