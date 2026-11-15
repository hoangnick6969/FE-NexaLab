/**
 * Shared item catalogue: ids and metadata only, no rendering code.
 * Light module, safe to import from item lists and routing (`listKitItems`).
 */
import type { LabItemMetadata } from "./item";

export const SHARED_ITEM_META = {
  beaker: { id: "beaker", category: "apparatus", labelVi: "Cốc thuỷ tinh", purposeVi: "Chứa và pha trộn chất lỏng; vạch chia giúp ước lượng thể tích." },
  "digital-scale": { id: "digital-scale", category: "instrument", labelVi: "Cân điện tử", purposeVi: "Hiện khối lượng của vật đặt trên đĩa cân." },
} as const satisfies Record<string, LabItemMetadata>;

export type SharedItemId = keyof typeof SHARED_ITEM_META;
