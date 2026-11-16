/**
 * FL-26 Mendel bench logic (K8 bàn di truyền, kit `k8-garden`): config check, item list, the Punnett
 * board's cell state and the journal's description of a change. Pure functions; the page only draws them.
 */
import { mendelCross } from "@nexalab/sim/mendel-cross";
import { parseFl26MendelConfig, type Fl26MendelConfig } from "@nexalab/sim/mendel-config";
import type { ExploreBenchEntry, KitItem } from "../../runtime/explore-registry";

const APPARATUS_PURPOSE: Record<string, string> = {
  pea_plot: "Chậu đậu Hà Lan: nơi lai thí nghiệm, mỗi cây mang một cặp alen của một tính trạng.",
  punnett_board: "Ma trận Punnett: liệt kê các tổ hợp giao tử của bố và mẹ để đếm kiểu gen, kiểu hình.",
};

export const listMendelKitItems = (config: Fl26MendelConfig): KitItem[] =>
  config.enabledApparatus.map((item) => ({
    id: item.id,
    category: "apparatus",
    labelVi: item.labelVi ?? item.kind,
    purposeVi: APPARATUS_PURPOSE[item.kind] ?? "",
  }));

/** The parent pairs a student may cross on this bench, in the order the config lists them. */
export const allowedCrosses = (config: Fl26MendelConfig) => config.spec.allowedParents;

/** One line for the journal: which cross, and the exact ratios the model gives for it. */
export function describeMendelChange(parents: [string, string]): string {
  const result = mendelCross({ setup: "monohybrid", parents });
  const genotype = result.genotypeRatio.join(" : ");
  const phenotype = result.phenotypeRatio.join(" : ");
  return `Lai ${parents[0]} × ${parents[1]}: kiểu gen ${genotype}, kiểu hình ${phenotype}`;
}

export const mendelBench: ExploreBenchEntry = {
  kit: "k8-garden",
  group: "biology",
  validate: (raw) => {
    try {
      return { ok: true, config: parseFl26MendelConfig(raw) };
    } catch {
      return { ok: false };
    }
  },
  loadPage: () => import("./MendelBenchPage"),
  listKitItems: listMendelKitItems,
};
