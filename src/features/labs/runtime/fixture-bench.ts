/**
 * Minimal second Explore bench, registered in dev builds only (F0-2 "Xong khi"): it proves `/labs/:id`
 * opens a bench chosen by `row.explore.kit`. No engine, no scene: a titled list of configured items.
 */
import { z } from "zod";
import type { ExploreBenchEntry, KitItem } from "./explore-registry";

const item = z.object({ id: z.string().regex(/^[a-z0-9-]{1,40}$/), labelVi: z.string().min(1), purposeVi: z.string().min(1) }).strict();
export const fixtureConfigSchema = z.object({
  labId: z.string().regex(/^[a-z0-9-]{2,40}$/),
  kit: z.literal("explore-fixture@1"),
  engine: z.literal("fixture@1"),
  title: z.string().min(1),
  items: z.array(item).min(1).max(20),
}).strict();
export type FixtureConfig = z.infer<typeof fixtureConfigSchema>;

export const listFixtureKitItems = (config: FixtureConfig): KitItem[] =>
  config.items.map((entry) => ({ id: entry.id, category: "apparatus", labelVi: entry.labelVi, purposeVi: entry.purposeVi }));

export const fixtureBench: ExploreBenchEntry = {
  kit: "explore-fixture@1",
  group: "explore-support",
  validate: (raw) => {
    const result = fixtureConfigSchema.safeParse(raw);
    return result.success ? { ok: true, config: result.data } : { ok: false };
  },
  loadPage: () => import("./FixtureBenchPage"),
  listKitItems: listFixtureKitItems,
};
