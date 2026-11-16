/**
 * What each Kit has: the apparatus, instruments and reagents of its published Explore benches, read from the same
 * `listKitItems` the bench panel uses, so this page and the bench can never disagree. Pure, so it is tested without a browser.
 */
import { exploreBench, type ExploreBenchEntry, type KitItem } from "../runtime/explore-registry";

export type KitGroup = ExploreBenchEntry["group"];
export const KIT_GROUPS: readonly KitGroup[] = ["chemistry", "physics", "biology", "explore-support"];

export type CatalogLab = { id: string; catalogId: string; title: string };
export type CatalogEntry = {
  /** Same thing across Labs: the renderer key of an apparatus, the id of a reagent. */
  key: string;
  label: string;
  purpose: string;
  category: KitItem["category"];
  sharedItemId?: string;
  safety?: KitItem["safety"];
  usedIn: CatalogLab[];
};
export type KitCatalog = { group: KitGroup; benches: string[]; apparatus: CatalogEntry[]; instruments: CatalogEntry[]; materials: CatalogEntry[]; labs: CatalogLab[] };

type Row = { id: string; title: string; mode?: string; explore?: { ok: true; kit: string; config: any } | { ok: false } };

export function collectKitCatalogs(rows: readonly Row[]): KitCatalog[] {
  const catalogs = new Map<KitGroup, KitCatalog & { byKey: Map<string, CatalogEntry> }>();
  for (const row of rows) {
    if (row.mode !== "explore" || !row.explore || row.explore.ok !== true) continue;
    const bench = exploreBench(row.explore.kit);
    if (!bench) continue;
    let catalog = catalogs.get(bench.group);
    if (!catalog) catalogs.set(bench.group, catalog = { group: bench.group, benches: [], apparatus: [], instruments: [], materials: [], labs: [], byKey: new Map() });
    if (!catalog.benches.includes(bench.kit)) catalog.benches.push(bench.kit);
    const lab: CatalogLab = { id: row.id, catalogId: row.explore.config?.catalogId ?? row.id, title: row.title };
    catalog.labs.push(lab);
    for (const item of bench.listKitItems(row.explore.config)) {
      const key = `${item.category === "material" ? "material" : "item"}:${item.rendererKey ?? item.id}`;
      let entry = catalog.byKey.get(key);
      if (!entry) {
        entry = {
          key: item.rendererKey ?? item.id, label: item.kindLabelVi ?? item.labelVi, purpose: item.purposeVi, category: item.category,
          ...(item.sharedItemId ? { sharedItemId: item.sharedItemId } : {}), ...(item.safety ? { safety: item.safety } : {}), usedIn: [],
        };
        catalog.byKey.set(key, entry);
        (item.category === "material" ? catalog.materials : item.category === "instrument" ? catalog.instruments : catalog.apparatus).push(entry);
      }
      if (!entry.usedIn.some((used) => used.id === lab.id)) entry.usedIn.push(lab);
    }
  }
  return KIT_GROUPS.flatMap((group) => {
    const found = catalogs.get(group);
    if (!found) return [];
    const { byKey: _byKey, ...catalog } = found;
    return [catalog];
  });
}
