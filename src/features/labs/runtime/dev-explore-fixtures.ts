/**
 * DEV-only local fallback for the Sinh học Explore benches (INC-3 review). When the server has no published row for
 * one of these Labs, `/labs/:id` opens the bundled FE config instead, the same way the K2 `/dev/lab-kits/*` previews
 * open bundled configs. Production builds never take this path (`import.meta.env.DEV` is false there).
 */
import type { ExploreRow } from "./explore-labs";
import { fl26Config } from "../biology/genetics/labs/fl-26.config";
import { fl20Config } from "../biology/ecology/labs/fl-20.config";
import { fl21Config } from "../biology/ecology/labs/fl-21.config";
import { fl27Config } from "../biology/molecular/labs/fl-27.config";
import { fl16Config } from "../biology/anatomy/labs/fl-16.config";

const FIXTURES = [fl26Config, fl20Config, fl21Config, fl27Config, fl16Config];

/** A local `ExploreRow` for a bundled Lab, or undefined. `dev` defaults to the Vite DEV flag. */
export function devExploreRow(id: string, dev: boolean = import.meta.env?.DEV === true): ExploreRow | undefined {
  if (!dev) return undefined;
  const config = FIXTURES.find((item) => item.labId === id);
  if (!config) return undefined;
  return {
    id,
    title: config.title,
    mode: "explore",
    explore: {
      ok: true,
      kit: config.kit,
      engine: config.engine,
      activity: { id: `dev-${id}`, key: `${id}-explore`, version: 0, digest: "dev-fixture" },
      config,
    },
  };
}
