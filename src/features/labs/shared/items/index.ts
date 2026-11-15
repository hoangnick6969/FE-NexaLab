/** Shared item registry (P0 C2.1). It imports rendering code: use `./catalog` where only ids and names are needed. */
import { beakerItem } from "./beaker";
import type { SharedItemId } from "./catalog";
import { digitalScaleItem } from "./digital-scale";
import { graduatedCylinderItem } from "./graduated-cylinder";
import type { LabItemMetadata } from "./item";
import { stopwatchItem } from "./stopwatch";
import { thermometerItem } from "./thermometer";

export const SHARED_LAB_ITEMS = {
  beaker: beakerItem,
  "digital-scale": digitalScaleItem,
  "graduated-cylinder": graduatedCylinderItem,
  thermometer: thermometerItem,
  stopwatch: stopwatchItem,
} as const satisfies Record<SharedItemId, LabItemMetadata>;
