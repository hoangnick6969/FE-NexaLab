import {
  ECOLOGY_AGE_SAMPLES, ECOLOGY_SITES, FOOD_WEB_EDGES, FOOD_WEB_SPECIES,
  ecologyTolerance, foodWeb,
} from "@nexalab/sim";

/**
 * B3 — "Nếu… thì sao?" on the Lab's own scene, rules only (what-if@1).
 * Every answer is read from the pinned shared model (food-web@1.0.0, ecology-tolerance@1.0.0): no species, link or
 * number outside the model. Offered only in free explore, after every checkpoint is done, so it never answers a
 * question still to be predicted. Advisory preview, not graded, not stored (FR-22).
 */
export const WHAT_IF_RULES = "what-if@1";

export type Locale = "vi" | "en";
export type WhatIf<A> = { id: string; question: string; action: A };
export type WhatIfAnswer = { lines: string[]; note: string | null };

type SpeciesId = keyof typeof FOOD_WEB_SPECIES;
/** Capitalises the first letter of a sentence only; names inside a sentence stay lower case. */
const cap = (text: string) => text.charAt(0).toLocaleUpperCase("vi") + text.slice(1);
const list = (items: string[], locale: Locale) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} ${locale === "vi" ? "và" : "and"} ${items.at(-1)}`;

// ---------------------------------------------------------------- FL-21 food web

export type FoodWebAction = { removed: SpeciesId };

export function foodWebWhatIfs(names: Record<string, string>, locale: Locale): WhatIf<FoodWebAction>[] {
  return (Object.keys(FOOD_WEB_SPECIES) as SpeciesId[])
    // The model does not simulate losing the decomposers (foodWebSchema rejects it).
    .filter((id) => FOOD_WEB_SPECIES[id].role !== "DECOMPOSER")
    .map((id) => ({
      id: `remove:${id}`,
      question: locale === "vi" ? `Nếu mất ${names[id].toLocaleLowerCase("vi")} thì sao?` : `What if the ${names[id].toLowerCase()} disappeared?`,
      action: { removed: id },
    }));
}

export function foodWebAnswer(removed: SpeciesId, names: Record<string, string>, locale: Locale): WhatIfAnswer {
  const result = foodWeb({ setup: "remove", webId: "W1", speciesId: removed }) as any;
  const n = (id: string) => names[id].toLocaleLowerCase(locale);
  const foods = FOOD_WEB_EDGES.filter(([, eater]) => eater === removed).map(([food]) => food);
  const eaters = FOOD_WEB_EDGES.filter(([food]) => food === removed).map(([, eater]) => eater);
  const vi = locale === "vi";
  const x = n(removed);
  const lines: string[] = [];
  if (foods.length) {
    const up = list(foods.filter((id) => result.effects[id].effect === "INCREASE").map(n), locale);
    lines.push(vi ? `${x} ăn ${list(foods.map(n), locale)}, nên ${up} có thể tăng lên vì bớt bị ăn.`
      : `The ${x} eats ${list(foods.map(n), locale)}, so the ${up} may increase: fewer of them are eaten.`);
  } else if (FOOD_WEB_SPECIES[removed].role === "PRODUCER")
    lines.push(vi ? `${x} là sinh vật sản xuất: tự tạo chất hữu cơ, không ăn loài nào trong lưới.`
      : `The ${x} is a producer: it makes its own food and eats nothing in the web.`);
  const only = eaters.filter((id) => result.effects[id].onlyFood);
  const others = eaters.filter((id) => !result.effects[id].onlyFood);
  if (only.length)
    lines.push(vi ? `${list(only.map(n), locale)} chỉ ăn ${x} trong lưới này, nên mất nguồn thức ăn duy nhất và có thể giảm đi.`
      : `The ${list(only.map(n), locale)} only eat${only.length === 1 ? "s" : ""} the ${x} in this web, so may decrease: that was the only food.`);
  if (others.length)
    lines.push(vi ? `${list(others.map(n), locale)} cũng ăn ${x}, nên có thể giảm đi vì mất một nguồn thức ăn, nhưng vẫn còn thức ăn khác.`
      : `The ${list(others.map(n), locale)} also eat${others.length === 1 ? "s" : ""} the ${x}, so may decrease, but still ${others.length === 1 ? "has" : "have"} other food.`);
  if (!eaters.length)
    lines.push(vi ? `Không loài nào trong lưới ăn ${x}.` : `Nothing in the web eats the ${x}.`);
  lines.push(vi ? `${result.brokenChains} chuỗi thức ăn đi qua ${x} bị đứt.`
    : `${result.brokenChains} food chain${result.brokenChains === 1 ? "" : "s"} through the ${x} ${result.brokenChains === 1 ? "is" : "are"} broken.`);
  return {
    lines: lines.map(cap),
    note: vi ? "Mô hình chỉ xét ảnh hưởng trực tiếp; các loài khác không bị ảnh hưởng trực tiếp. Lưới thức ăn là minh hoạ."
      : "The model shows direct effects only; other species are not directly affected. The web is illustrative.",
  };
}

// ---------------------------------------------------------------- FL-20 tolerance

export type EcologyAction =
  | { scene: "pond"; valueDeciC: number }
  | { scene: "import"; speciesId: "fish-a" | "fish-b" | "fish-c" }
  | { scene: "pyramid"; sampleId: "P1" | "P2" | "P3" };

/** "5,6 °C" / "5.6 °C"; whole degrees without a decimal. */
export const deciC = (value: number, locale: Locale) =>
  `${value % 10 ? (value / 10).toFixed(1).replace(".", locale === "vi" ? "," : ".") : value / 10} °C`;

const TEMPERATURES = [40, 200, 430] as const;
const FISH = ["fish-a", "fish-b", "fish-c"] as const;
const fishName = (id: string, locale: Locale) => (locale === "vi" ? "cá " : "fish ") + id.slice(-1).toUpperCase();

export function ecologyWhatIfs(locale: Locale): WhatIf<EcologyAction>[] {
  const vi = locale === "vi";
  const site = ECOLOGY_SITES["site-demo"].range;
  return [
    ...TEMPERATURES.map((value) => ({
      id: `pond:${value}`,
      question: vi ? `Nếu nước ao ở ${deciC(value, locale)} thì cá rô phi sao?` : `What if the pond water is at ${deciC(value, locale)}?`,
      action: { scene: "pond" as const, valueDeciC: value },
    })),
    ...FISH.map((speciesId) => ({
      id: `import:${speciesId}`,
      question: vi ? `Nếu thả ${fishName(speciesId, locale)} vào nơi nước ${deciC(site.minDeciC, locale)}–${deciC(site.maxDeciC, locale)}?`
        : `What if ${fishName(speciesId, locale)} is farmed where water goes ${deciC(site.minDeciC, locale)}–${deciC(site.maxDeciC, locale)}?`,
      action: { scene: "import" as const, speciesId },
    })),
    ...(Object.keys(ECOLOGY_AGE_SAMPLES) as Array<"P1" | "P2" | "P3">).map((sampleId) => ({
      id: `pyramid:${sampleId}`,
      question: vi ? `Nếu quần thể có tháp tuổi như mẫu ${sampleId}?` : `What if a population has the age structure of sample ${sampleId}?`,
      action: { scene: "pyramid" as const, sampleId },
    })),
  ];
}

export function ecologyAnswer(action: EcologyAction, locale: Locale): WhatIfAnswer {
  const vi = locale === "vi";
  const c = (value: number) => deciC(value, locale);
  if (action.scene === "pond") {
    const result = ecologyTolerance({ setup: "tolerance", speciesId: "ca-ro-phi", factor: "TEMPERATURE", valueDeciC: action.valueDeciC }) as any;
    const { minDeciC, maxDeciC } = result.limits;
    const t = c(action.valueDeciC);
    return {
      lines: [
        vi ? `Giới hạn chịu đựng nhiệt độ của cá rô phi là ${c(minDeciC)} đến ${c(maxDeciC)}.` : `Tilapia tolerates ${c(minDeciC)} to ${c(maxDeciC)}.`,
        result.zone === "WITHIN" ? (vi ? `${t} nằm trong khoảng này nên cá rô phi tồn tại được.` : `${t} is inside that range, so tilapia survives.`)
          : result.zone === "BELOW_MIN" ? (vi ? `${t} thấp hơn giới hạn dưới ${c(minDeciC)} nên cá rô phi không tồn tại được.` : `${t} is below the lower limit ${c(minDeciC)}, so tilapia cannot survive.`)
          : (vi ? `${t} cao hơn giới hạn trên ${c(maxDeciC)} nên cá rô phi không tồn tại được.` : `${t} is above the upper limit ${c(maxDeciC)}, so tilapia cannot survive.`),
      ],
      note: vi ? "Giới hạn nhiệt độ của cá rô phi theo SGK KHTN 8." : "Tilapia limits from the KHTN 8 textbook.",
    };
  }
  if (action.scene === "import") {
    const result = ecologyTolerance({ setup: "import-comparison", siteId: "site-demo", factor: "TEMPERATURE" }) as any;
    const fish = result.candidates.find((item: any) => item.speciesId === action.speciesId);
    const name = fishName(action.speciesId, locale);
    const site = result.site;
    const lines = [vi ? `${name} chịu được ${c(fish.limits.minDeciC)} đến ${c(fish.limits.maxDeciC)}; nước nơi đó thay đổi từ ${c(site.minDeciC)} đến ${c(site.maxDeciC)}.`
      : `${name} tolerates ${c(fish.limits.minDeciC)} to ${c(fish.limits.maxDeciC)}; the water there goes from ${c(site.minDeciC)} to ${c(site.maxDeciC)}.`];
    const cold = vi ? `lúc lạnh nhất ${c(site.minDeciC)} thấp hơn giới hạn dưới ${c(fish.limits.minDeciC)}` : `the coldest ${c(site.minDeciC)} is below its lower limit ${c(fish.limits.minDeciC)}`;
    const heat = vi ? `lúc nóng nhất ${c(site.maxDeciC)} cao hơn giới hạn trên ${c(fish.limits.maxDeciC)}` : `the warmest ${c(site.maxDeciC)} is above its upper limit ${c(fish.limits.maxDeciC)}`;
    lines.push(fish.suitable ? (vi ? `Cả lúc lạnh nhất và nóng nhất đều nằm trong giới hạn nên ${name} nuôi được quanh năm.` : `Both the coldest and warmest water are within its limits, so ${name} can be farmed all year.`)
      : vi ? `${name} không nuôi được quanh năm vì ${fish.failsOn === "BOTH" ? `${cold} và ${heat}` : fish.failsOn === "COLD" ? cold : heat}.`
      : `${name} cannot be farmed all year: ${fish.failsOn === "BOTH" ? `${cold} and ${heat}` : fish.failsOn === "COLD" ? cold : heat}.`);
    return { lines: lines.map(cap), note: vi ? "Số liệu cá A, B, C là minh hoạ." : "Fish A, B and C data are illustrative." };
  }
  const result = ecologyTolerance({ setup: "age-structure", sampleId: action.sampleId }) as any;
  const { pre, reproductive, post } = result.counts;
  return {
    lines: [
      vi ? `Mẫu ${action.sampleId}: trước sinh sản ${pre}%, đang sinh sản ${reproductive}%, sau sinh sản ${post}%.`
        : `Sample ${action.sampleId}: pre-reproductive ${pre}%, reproductive ${reproductive}%, post-reproductive ${post}%.`,
      result.pyramid === "GROWING" ? (vi ? `Nhóm trước sinh sản nhiều hơn hẳn nhóm đang sinh sản, nên đây là tháp phát triển: số lượng có xu hướng tăng.`
        : `Many more young than breeding adults: a growing pyramid, numbers tend to rise.`)
        : result.pyramid === "DECLINING" ? (vi ? `Nhóm trước sinh sản ít hơn hẳn nhóm đang sinh sản, nên đây là tháp suy thoái: số lượng có xu hướng giảm.`
          : `Far fewer young than breeding adults: a declining pyramid, numbers tend to fall.`)
        : (vi ? `Nhóm trước sinh sản và nhóm đang sinh sản xấp xỉ nhau, nên đây là tháp ổn định.` : `Young and breeding adults are about equal: a stable pyramid.`),
    ],
    note: vi ? "Số liệu mẫu P1–P3 là minh hoạ." : "Samples P1–P3 are illustrative.",
  };
}
