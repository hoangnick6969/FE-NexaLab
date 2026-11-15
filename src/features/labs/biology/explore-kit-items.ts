import type { KitItem } from "../runtime/explore-registry";

/** Kit items of an INC-3 bench: the configured apparatus, each with the purpose its kind is given here. */
export function kitItemsFrom(config: { enabledApparatus: ReadonlyArray<{ id: string; kind: string; labelVi?: string }> }, purposes: Record<string, string>): KitItem[] {
  return config.enabledApparatus.map((item) => ({
    id: item.id,
    category: "apparatus",
    labelVi: item.labelVi ?? item.kind,
    purposeVi: purposes[item.kind] ?? "",
  }));
}
