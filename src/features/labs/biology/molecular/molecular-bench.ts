/** Kit `k7-molecular` (FL-27 gene to protein, Explore). Items are the configured strand and its readout. */
import { fl27ExploreSchema } from "@nexalab/sim/explore-kits";
import type { ExploreBenchEntry } from "../../runtime/explore-registry";
import { kitItemsFrom } from "../explore-kit-items";

export const molecularBench: ExploreBenchEntry = {
  kit: "k7-molecular",
  group: "biology",
  validate: (raw) => {
    const result = fl27ExploreSchema.safeParse(raw);
    return result.success ? { ok: true, config: result.data } : { ok: false };
  },
  loadPage: () => import("./MolecularExplorePage"),
  listKitItems: (config) => kitItemsFrom(config, { dna_strand: "Mạch DNA mô phỏng: đọc codon và chọn biến thể gene." }),
};
