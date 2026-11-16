import { listSafetyScenarioReagents, type SafetyApparatusKind, type SafetyScenarioConfig, type SafetyScenarioItemRef, type SafetyScenarioScene } from "@nexalab/sim/safety-scenario";
import type { Reagent } from "@nexalab/sim/wet-bench";
import { getLocale, type Locale } from "../../../../i18n";
import type { KitItem } from "../../runtime/explore-registry";
import { SHARED_ITEM_META } from "../../shared/items/catalog";

const labels: Record<string, string> = {
  safety_goggles: "Safety goggles",
  protective_gloves: "Protective gloves",
  lab_coat: "Lab coat",
  beaker_100ml: "Glass beaker",
  test_tube: "Test tube",
  test_tube_holder: "Test tube holder",
  alcohol_lamp: "Alcohol lamp",
  CuSO4_0_1M: "0.1 M CuSO₄ solution",
  H2SO4_0_05M: "Dilute H₂SO₄ solution (0.05 M)",
};

const tags: Record<Locale, Record<string, string>> = {
  vi: { corrosive: "Ăn mòn", irritant: "Gây kích ứng", toxic_if_swallowed: "Độc khi nuốt", flammable: "Dễ cháy" },
  en: { corrosive: "Corrosive", irritant: "Irritant", toxic_if_swallowed: "Toxic if swallowed", flammable: "Flammable" },
};

const levels = {
  vi: { none: "", caution: "Cẩn thận", warning: "Nguy hiểm", danger: "Rất nguy hiểm" },
  en: { none: "", caution: "Caution", warning: "Warning", danger: "Danger" },
};

const purposes: Record<SafetyApparatusKind, Record<Locale, string>> = {
  safety_goggles: { vi: "Bảo vệ mắt trong phòng thí nghiệm.", en: "Protects the eyes in the laboratory." },
  protective_gloves: { vi: "Trang bị bảo vệ tay.", en: "Protective equipment for the hands." },
  lab_coat: { vi: "Che phủ da và quần áo khi làm việc trong phòng thí nghiệm.", en: "Covers skin and clothing during lab work." },
  beaker_100ml: { vi: SHARED_ITEM_META.beaker.purposeVi, en: "Holds and mixes liquids. Its graduations indicate approximate volume." },
  test_tube: { vi: "Chứa lượng nhỏ chất dùng trong thí nghiệm.", en: "Holds small samples for experiments." },
  test_tube_holder: { vi: "Giữ ống nghiệm khi quan sát thao tác đun.", en: "Holds the test tube during the heating demonstration." },
  alcohol_lamp: { vi: "Nguồn nhiệt trong tình huống đun ống nghiệm.", en: "The heat source in the test-tube scenario." },
};

const label = (id: string, vi: string) => getLocale() === "en" ? labels[id] ?? vi : vi;
export const safetyReagentLabel = (reagent: Reagent) => label(reagent.id, reagent.labelVi);
export const formatSafetyHazard = (hazard: Reagent["hazard"]) => {
  const locale = getLocale();
  return [levels[locale][hazard.level], ...hazard.tags.map((tag) => tags[locale][tag])].filter(Boolean).join(" · ");
};

export function listSafetyKitItems(
  config: SafetyScenarioConfig,
  refs: readonly SafetyScenarioItemRef[] = config.scenes.flatMap((scene) => [
    ...scene.itemRefs, ...scene.consequences.flatMap((consequence) => consequence.hazardRefs),
  ]),
): KitItem[] {
  const apparatus = new Set(refs.filter((ref) => ref.kind === "apparatus").map((ref) => ref.id));
  const locale = getLocale();
  return [
    ...config.enabledApparatus.filter((item) => apparatus.has(item.id)).map((item): KitItem => ({
      id: item.id, category: "apparatus", labelVi: label(item.kind, item.labelVi ?? item.kind),
      rendererKey: item.kind, purposeVi: purposes[item.kind][locale],
      ...(item.kind === "beaker_100ml" ? { sharedItemId: "beaker" } : {}),
    })),
    ...listSafetyScenarioReagents(refs).map((reagent): KitItem => ({
      id: reagent.id, category: "material", labelVi: safetyReagentLabel(reagent), purposeVi: locale === "vi"
        ? "Chai mẫu để nhận diện thông tin trên nhãn." : "Sample bottle for reading the chemical label.",
      safety: reagent.hazard,
    })),
  ];
}

export function listSafetySceneItems(config: SafetyScenarioConfig, scene: SafetyScenarioScene): KitItem[] {
  const items = listSafetyKitItems(config, scene.itemRefs);
  if (scene.id === "read-label") items.push({
    id: "unlabelled-bottle", rendererKey: "unlabelled-bottle", category: "material",
    labelVi: getLocale() === "vi" ? "Chai mất nhãn" : "Unlabelled bottle", purposeVi: "",
  });
  return items;
}
