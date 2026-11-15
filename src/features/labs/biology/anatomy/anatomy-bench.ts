/** Kit `anatomy` (FL-16 studio, Kit bổ trợ, group explore-support). Items are the configured eye model. */
import { fl16ExploreSchema } from "@nexalab/sim/explore-kits";
import type { ExploreBenchEntry } from "../../runtime/explore-registry";
import { kitItemsFrom } from "../explore-kit-items";

export const anatomyBench: ExploreBenchEntry = {
  kit: "anatomy",
  group: "explore-support",
  validate: (raw) => {
    const result = fl16ExploreSchema.safeParse(raw);
    return result.success ? { ok: true, config: result.data } : { ok: false };
  },
  loadPage: () => import("./AnatomyExplorePage"),
  listKitItems: (config) => kitItemsFrom(config, { eye_model: "Mô hình mắt: xem độ tụ cần có khi nhìn vật ở gần hoặc ở xa." }),
};
