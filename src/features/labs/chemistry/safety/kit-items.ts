import { listSafetyScenarioReagents, type SafetyScenarioConfig, type SafetyScenarioItemRef } from "@nexalab/sim/safety-scenario";
import type { Reagent } from "@nexalab/sim/wet-bench";
import { getLocale, type Locale } from "../../../../i18n";
import type { KitItem } from "../../runtime/explore-registry";

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
  return [
    ...config.enabledApparatus.filter((item) => apparatus.has(item.id)).map((item): KitItem => ({
      id: item.id, category: "apparatus", labelVi: label(item.kind, item.labelVi ?? item.kind),
      rendererKey: item.kind, purposeVi: "",
    })),
    ...listSafetyScenarioReagents(refs).map((reagent): KitItem => ({
      id: reagent.id, category: "material", labelVi: safetyReagentLabel(reagent), purposeVi: "",
      safety: reagent.hazard,
    })),
  ];
}
