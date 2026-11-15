/**
 * Wet bench item list (P0 C2.3 `listKitItems`), built from the apparatus manifest and the sim reagents.
 * Apparatus carry the key of their entry in `apparatus-renderers.tsx` and, when a shared item draws them, its id.
 */
import { reagentById, type ChemistryLabConfig } from "@nexalab/sim/wet-bench";
import type { KitItem } from "../../../runtime/explore-registry";
import { K2_APPARATUS } from "./apparatus-manifest";
import { apparatusLabel } from "./bench-reducer";

export function listWetBenchKitItems(config: ChemistryLabConfig): KitItem[] {
  const tubes = config.enabledApparatus.filter((item) => item.kind === "test_tube").length;
  const apparatus = config.enabledApparatus
    .filter((item, index, all) => item.kind !== "test_tube" || all.findIndex((other) => other.kind === "test_tube") === index)
    .map((item): KitItem => ({
      id: item.id,
      category: K2_APPARATUS[item.kind].role === "instrument" ? "instrument" : "apparatus",
      labelVi: item.kind === "test_tube" ? `${K2_APPARATUS.test_tube.labelVi} × ${tubes}` : apparatusLabel(config, item.id),
      purposeVi: K2_APPARATUS[item.kind].purposeVi,
      rendererKey: item.kind,
      kindLabelVi: K2_APPARATUS[item.kind].labelVi,
      ...(K2_APPARATUS[item.kind].sharedItem ? { sharedItemId: K2_APPARATUS[item.kind].sharedItem } : {}),
    }));
  const materials = [...config.availableReagents].sort((a, b) => a.shelfPosition - b.shelfPosition).flatMap((bottle): KitItem[] => {
    const reagent = reagentById(bottle.reagentId);
    return reagent ? [{
      id: reagent.id, category: "material", labelVi: reagent.labelVi, purposeVi: "",
      safety: { level: reagent.hazard.level, tags: reagent.hazard.tags, noteSim: reagent.safetyNoteSim, noteReal: reagent.safetyNoteRealLab },
    }] : [];
  });
  return [...apparatus, ...materials];
}
