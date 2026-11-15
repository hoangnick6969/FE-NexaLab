/** Shared item registry (P0 C2.1). It imports rendering code: use `./catalog` where only ids and names are needed. */
import { beakerItem } from "./beaker";
import type { SharedItemId } from "./catalog";
import { digitalScaleItem } from "./digital-scale";
import type { LabItemMetadata } from "./item";

export const SHARED_LAB_ITEMS = { beaker: beakerItem, "digital-scale": digitalScaleItem } as const satisfies Record<SharedItemId, LabItemMetadata>;
