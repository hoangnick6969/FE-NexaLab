import {
  CODON_TABLE, DENSITY_SPECIMENS, classifySubstitution, densityBench, emInduction, evaluateLeverBench, evaluateThermalBench, simulateBuoyancy,
} from "@nexalab/sim";
import type { WhatIf, WhatIfAnswer } from "../biology/ecology/what-if";

/**
 * B3 for more Labs (what-if@2): preset questions answered by each Lab's own model. FL-25 offers them in its free
 * explore (after every checkpoint); station and event Labs only after a passed attempt, so no answer helps a retry.
 * FL-01 (two graded states only), FL-10 (one fixed reaction) and FL-16 (model not in the FE package) have none.
 */
export const LAB_WHAT_IF_RULES = "what-if@2";
export type Locale = "vi" | "en";
export type LabWhatIfKind = "em-induction" | "lever" | "thermal" | "density" | "buoyancy" | "gene";
type Spec = { items: (locale: Locale) => WhatIf<string>[]; answer: (id: string, locale: Locale) => WhatIfAnswer | null };

const num = (value: number, digits: number, locale: Locale) =>
  value.toLocaleString(locale === "vi" ? "vi-VN" : "en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
const q = (id: string, vi: string, en: string) => (locale: Locale): WhatIf<string> => ({ id, question: locale === "vi" ? vi : en, action: id });

// ---------------------------------------------------------------- FL-25 electromagnetic induction
const EM_CASES: Record<string, any> = {
  "s-push": { setup: "magnet-coil", circuit: "CLOSED", poleFacingCoil: "S", magnetPosition: "INSIDE", motion: "TOWARD" },
  "s-pull": { setup: "magnet-coil", circuit: "CLOSED", poleFacingCoil: "S", magnetPosition: "OUTSIDE", motion: "AWAY" },
  "open-push": { setup: "magnet-coil", circuit: "OPEN", poleFacingCoil: "N", magnetPosition: "INSIDE", motion: "TOWARD" },
  "hold-inside": { setup: "magnet-coil", circuit: "CLOSED", poleFacingCoil: "N", magnetPosition: "INSIDE", motion: "STILL" },
  ccw: { setup: "generator", circuit: "CLOSED", rotation: "CCW", turns: 1 },
};
const em: Spec = {
  items: (l) => [
    q("s-push", "Nếu đưa cực S lại gần cuộn dây thì sao?", "What if the S pole is pushed into the coil?")(l),
    q("s-pull", "Nếu kéo cực S ra xa cuộn dây thì sao?", "What if the S pole is pulled away?")(l),
    q("open-push", "Nếu mạch hở mà vẫn đẩy nam châm vào?", "What if the circuit is open while the magnet is pushed in?")(l),
    q("hold-inside", "Nếu nam châm nằm yên bên trong cuộn dây?", "What if the magnet rests inside the coil?")(l),
    q("ccw", "Nếu quay nam châm ngược chiều kim đồng hồ?", "What if the magnet turns anticlockwise?")(l),
  ],
  answer: (id, l) => {
    const state = EM_CASES[id];
    if (!state) return null;
    const vi = l === "vi";
    const r = emInduction(state) as any;
    if (state.setup === "generator") {
      const cw = emInduction({ ...state, rotation: "CW" }) as any;
      const reversed = r.phaseDirections.every((d: string, i: number) => d === "NONE" || d !== cw.phaseDirections[i]);
      return { lines: [
        vi ? `Có dòng điện xoay chiều: đổi chiều ${r.reversalsPerTurn} lần trong mỗi vòng quay.` : `An alternating current: it reverses ${r.reversalsPerTurn} times per turn.`,
        reversed ? (vi ? "Quay ngược chiều thì ở mỗi vị trí, chiều dòng điện ngược với khi quay thuận." : "Turning the other way reverses the current at every position.") : "",
      ].filter(Boolean), note: vi ? "Mô hình định tính: không tính độ lớn dòng điện." : "Qualitative model: no current size." };
    }
    const field = { INCREASING: vi ? "tăng" : "increases", DECREASING: vi ? "giảm" : "decreases", UNCHANGED: vi ? "không đổi" : "does not change" }[r.fieldThroughCoil as string];
    const lines = [vi ? `Từ trường qua cuộn dây ${field}.` : `The field through the coil ${field}.`];
    if (r.inducedCurrent === "PRESENT") {
      lines.push(vi ? "Có dòng điện cảm ứng." : "A current is induced.");
      if (state.poleFacingCoil === "S") {
        const north = emInduction({ ...state, poleFacingCoil: "N" }) as any;
        if (north.direction !== r.direction) lines.push(vi ? "Chiều dòng điện ngược với khi làm cùng động tác với cực N: đổi cực thì đổi chiều." : "It flows the other way than with the N pole doing the same move: swapping poles swaps the direction.");
      }
    } else lines.push(state.circuit === "OPEN"
      ? (vi ? "Mạch hở nên không có dòng điện, dù từ trường qua cuộn dây vẫn thay đổi." : "The circuit is open, so no current flows even though the field changes.")
      : (vi ? "Từ trường qua cuộn dây không thay đổi nên không có dòng điện cảm ứng, dù nam châm ở ngay trong cuộn dây." : "The field does not change, so no current is induced even with the magnet inside."));
    return { lines, note: vi ? "Mô hình định tính: không tính độ lớn dòng điện." : "Qualitative model: no current size." };
  },
};

// ---------------------------------------------------------------- FL-06 lever
const LEVER_CASES: Record<string, Array<[position: number, newtons: number]>> = {
  a: [[-100, 2], [200, 1]],
  b: [[-100, 1], [200, 1]],
  c: [[-250, 1], [100, 2]],
};
const side = (position: number, l: Locale) => (position < 0 ? (l === "vi" ? "bên trái" : "left") : (l === "vi" ? "bên phải" : "right"));
const leverQuestion = (id: string) => (l: Locale) => {
  const [[p1, f1], [p2, f2]] = LEVER_CASES[id];
  const at = (p: number, f: number) => l === "vi" ? `${num(f, 1, l)} N ở ${num(Math.abs(p), 0, l)} mm ${side(p, l)}` : `${num(f, 1, l)} N at ${num(Math.abs(p), 0, l)} mm ${side(p, l)}`;
  return { id, action: id, question: l === "vi" ? `Nếu treo ${at(p1, f1)} và ${at(p2, f2)}?` : `What if ${at(p1, f1)} and ${at(p2, f2)} hang on the bar?` };
};
const lever: Spec = {
  items: (l) => Object.keys(LEVER_CASES).map((id) => leverQuestion(id)(l)),
  answer: (id, l) => {
    const cases = LEVER_CASES[id];
    if (!cases) return null;
    const r = evaluateLeverBench({ fixtureId: "lever-bench-reference-v1", attachments: cases.map(([p, f]) => ({ kind: "WEIGHT" as const, positionMillimetres: p, forceMilliNewtons: f * 1000 })) });
    if (!r.ok) return null;
    const vi = l === "vi";
    const lines = r.value.attachments.map((a: any) => vi
      ? `${side(a.positionMillimetres, l)[0].toUpperCase() + side(a.positionMillimetres, l).slice(1)}: ${num(a.forceMilliNewtons / 1000, 1, l)} N × ${num(a.armMillimetres / 1000, 3, l)} m = ${num(a.unsignedMomentMilliNewtonMillimetres / 1e6, 3, l)} N·m.`
      : `${side(a.positionMillimetres, l)}: ${num(a.forceMilliNewtons / 1000, 1, l)} N × ${num(a.armMillimetres / 1000, 3, l)} m = ${num(a.unsignedMomentMilliNewtonMillimetres / 1e6, 3, l)} N·m.`);
    lines.push(r.value.displayState === "LEVEL" ? (vi ? "Hai moment bằng nhau nên thanh nằm cân bằng." : "The moments are equal, so the bar balances.")
      : r.value.displayState === "TILT_LEFT" ? (vi ? "Moment bên trái lớn hơn nên đầu trái nghiêng xuống." : "The left moment is larger, so the left end goes down.")
      : (vi ? "Moment bên phải lớn hơn nên đầu phải nghiêng xuống." : "The right moment is larger, so the right end goes down."));
    return { lines, note: vi ? "Mô hình bỏ qua khối lượng thanh và ma sát ở điểm tựa." : "The model ignores the bar's mass and pivot friction." };
  },
};

// ---------------------------------------------------------------- FL-07 thermal energy
const THERMAL_SECONDS = [25, 75] as const;
const heat = (seconds: number) => {
  const r = evaluateThermalBench({ fixtureId: "water-calorimeter-v1", elapsedMilliseconds: seconds * 1000 });
  return r.ok ? r.value : null;
};
const thermal: Spec = {
  items: (l) => THERMAL_SECONDS.map((s) => ({ id: `t${s}`, action: `t${s}`, question: l === "vi" ? `Nếu chỉ đun ${s} giây thì sao?` : `What if the water is heated for ${s} s?` })),
  answer: (id, l) => {
    const seconds = Number(id.slice(1));
    const r = heat(seconds), ref = heat(50);
    if (!r || !ref) return null;
    const vi = l === "vi";
    const ratio = r.meterReadingMilliJoules / ref.meterReadingMilliJoules;
    return { lines: [
      vi ? `Sau ${seconds} s, joulemeter chỉ ${num(r.meterReadingMilliJoules / 1000, 0, l)} J; nước tăng ${num(r.riseMilliCelsius / 1000, 2, l)} °C, lên ${num(r.thermometerReadingMilliCelsius / 1000, 2, l)} °C.`
        : `After ${seconds} s the joulemeter reads ${num(r.meterReadingMilliJoules / 1000, 0, l)} J; the water rises ${num(r.riseMilliCelsius / 1000, 2, l)} °C to ${num(r.thermometerReadingMilliCelsius / 1000, 2, l)} °C.`,
      vi ? `So với lần đun 50 s: năng lượng bằng ${num(ratio, 2, l)} lần, độ tăng nhiệt độ cũng bằng ${num(r.riseMilliCelsius / ref.riseMilliCelsius, 2, l)} lần.`
        : `Compared with 50 s: ${num(ratio, 2, l)} times the energy and ${num(r.riseMilliCelsius / ref.riseMilliCelsius, 2, l)} times the rise.`,
    ], note: vi ? "Nhiệt lượng kế lý tưởng của mô hình: không có hao phí nhiệt." : "The model's ideal calorimeter: no heat loss." };
  },
};

// ---------------------------------------------------------------- FL-03 density
const box = (id: keyof typeof DENSITY_SPECIMENS) => {
  const s = DENSITY_SPECIMENS[id] as any;
  const volume = (s.sizeMm[0] * s.sizeMm[1] * s.sizeMm[2]) / 1000;
  return { mass: s.massG, volume, density: s.massG / volume };
};
const density: Spec = {
  items: (l) => [
    q("iron-bigger", "Nếu dùng khối sắt to gấp đôi?", "What if the iron block is twice as big?")(l),
    q("aluminium", "Nếu thay khối sắt bằng khối nhôm cùng kích thước?", "What if an aluminium block of the same size replaces the iron?")(l),
    q("more-water", "Nếu đổ 80 mL nước thay vì 40 mL?", "What if 80 mL of water is poured instead of 40 mL?")(l),
  ],
  answer: (id, l) => {
    const vi = l === "vi";
    const line = (name: string, b: { mass: number; volume: number; density: number }) =>
      vi ? `${name}: ${num(b.mass, 1, l)} g, ${num(b.volume, 1, l)} cm³ → ${num(b.density, 2, l)} g/cm³.` : `${name}: ${num(b.mass, 1, l)} g, ${num(b.volume, 1, l)} cm³ → ${num(b.density, 2, l)} g/cm³.`;
    if (id === "iron-bigger") {
      const a = box("iron-1v"), b = box("iron-2v");
      return { lines: [line(vi ? "Khối sắt nhỏ" : "Small iron block", a), line(vi ? "Khối sắt gấp đôi" : "Double iron block", b),
        vi ? "Khối lượng và thể tích cùng gấp đôi nên khối lượng riêng không đổi: nó đặc trưng cho chất, không cho kích thước." : "Mass and volume both double, so the density stays the same: it belongs to the material, not the size."], note: null };
    }
    if (id === "aluminium") {
      const a = box("iron-1v"), b = box("aluminium-1v");
      return { lines: [line(vi ? "Sắt" : "Iron", a), line(vi ? "Nhôm" : "Aluminium", b),
        vi ? "Cùng thể tích nhưng nhôm nhẹ hơn, nên khối lượng riêng của nhôm nhỏ hơn: chất khác thì khối lượng riêng khác." : "Same volume but aluminium is lighter, so its density is smaller: a different material has a different density."], note: null };
    }
    if (id === "more-water") {
      const w = (ml: number) => (densityBench({ blockId: "wood-block-a", pebbleId: "pebble-a", pouredMl: ml, pebbleInitialMl: 40 }) as any).water;
      const a = w(40), b = w(80);
      return { lines: [
        vi ? `40 mL nước nặng ${num(a.waterMassG, 1, l)} g; 80 mL nặng ${num(b.waterMassG, 1, l)} g.` : `40 mL of water weighs ${num(a.waterMassG, 1, l)} g; 80 mL weighs ${num(b.waterMassG, 1, l)} g.`,
        vi ? `Cả hai đều cho ${num(b.densityGcm3, 2, l)} g/cm³: đổ nhiều nước hơn không làm khối lượng riêng của nước thay đổi.` : `Both give ${num(b.densityGcm3, 2, l)} g/cm³: more water does not change its density.`,
      ], note: null };
    }
    return null;
  },
};

// ---------------------------------------------------------------- FL-05 buoyancy (example object, model formula)
const EXAMPLE = { massKg: 0.27, volumeM3: 100e-6, fluidDensityKgM3: 1000 };
const float = (over: Partial<typeof EXAMPLE> & { submergedVolumeM3?: number }) =>
  simulateBuoyancy({ ...EXAMPLE, submergedVolumeM3: EXAMPLE.volumeM3, ...over });
const buoyancy: Spec = {
  items: (l) => [
    q("half", "Nếu vật chỉ chìm một nửa trong nước?", "What if only half of the object is under water?")(l),
    q("salt", "Nếu thả vật vào nước muối đậm đặc hơn nước thường?", "What if the object goes into salt water, denser than fresh water?")(l),
    q("heavier", "Nếu vật nặng gấp đôi nhưng có cùng thể tích?", "What if the object is twice as heavy with the same volume?")(l),
  ],
  answer: (id, l) => {
    const vi = l === "vi";
    const full = float({});
    const f = (n: number) => `${num(n, 2, l)} N`;
    const base = vi ? `Ví dụ một vật 100 cm³, 270 g chìm hoàn toàn trong nước: lực đẩy ${f(full.buoyantForceN)}.` : `Example: a 100 cm³, 270 g object fully under water: buoyant force ${f(full.buoyantForceN)}.`;
    if (id === "half") {
      const r = float({ submergedVolumeM3: EXAMPLE.volumeM3 / 2 });
      return { lines: [base, vi ? `Chìm một nửa: lực đẩy còn ${f(r.buoyantForceN)}, vì chỉ phần thể tích chìm mới chiếm chỗ nước.` : `Half under: ${f(r.buoyantForceN)}, since only the submerged volume displaces water.`], note: vi ? "Số liệu ví dụ, công thức từ mô hình của bài." : "Example numbers, the Lab's model formula." };
    }
    if (id === "salt") {
      const r = float({ fluidDensityKgM3: 1100 });
      return { lines: [base, vi ? `Trong nước muối (1 100 kg/m³): lực đẩy ${f(r.buoyantForceN)}, lớn hơn vì chất lỏng nặng hơn.` : `In salt water (1,100 kg/m³): ${f(r.buoyantForceN)}, larger because the liquid is denser.`], note: vi ? "Số liệu ví dụ, công thức từ mô hình của bài." : "Example numbers, the Lab's model formula." };
    }
    if (id === "heavier") {
      const r = float({ massKg: EXAMPLE.massKg * 2 });
      return { lines: [base, vi ? `Nặng gấp đôi, cùng thể tích: lực đẩy vẫn ${f(r.buoyantForceN)}; chỉ số chỉ lực kế trong nước tăng từ ${f(full.springForceN)} lên ${f(r.springForceN)}.` : `Twice as heavy, same volume: still ${f(r.buoyantForceN)}; only the in-water reading rises from ${f(full.springForceN)} to ${f(r.springForceN)}.`], note: vi ? "Số liệu ví dụ, công thức từ mô hình của bài." : "Example numbers, the Lab's model formula." };
    }
    return null;
  },
};

// ---------------------------------------------------------------- FL-27 gene to protein
const CODON_CASES: Record<string, [string, string]> = { stop: ["UGG", "UGA"], silent: ["UUC", "UUU"], missense: ["GGA", "GAA"] };
const gene: Spec = {
  items: (l) => Object.entries(CODON_CASES).map(([id, [from, to]]) => ({ id, action: id, question: l === "vi" ? `Nếu codon ${from} đổi thành ${to}?` : `What if codon ${from} becomes ${to}?` })),
  answer: (id, l) => {
    const pair = CODON_CASES[id];
    if (!pair) return null;
    const [before, after] = pair.map((codon) => CODON_TABLE.get(codon)!);
    const effect = classifySubstitution(before, after);
    const vi = l === "vi";
    const name = (meaning: string) => meaning === "Stop" ? (vi ? "tín hiệu kết thúc" : "a stop signal") : meaning;
    return { lines: [
      vi ? `${pair[0]} mã hoá ${name(before)}; ${pair[1]} mã hoá ${name(after)}.` : `${pair[0]} codes for ${name(before)}; ${pair[1]} codes for ${name(after)}.`,
      effect === "SILENT" ? (vi ? "Axit amin không đổi: đột biến im lặng, protein giữ nguyên." : "Same amino acid: a silent mutation, the protein is unchanged.")
        : effect === "NONSENSE" ? (vi ? "Chuỗi dừng sớm tại đây: đột biến vô nghĩa, protein ngắn hơn." : "The chain stops early here: a nonsense mutation, a shorter protein.")
        : (vi ? "Một axit amin bị thay bằng axit amin khác: đột biến sai nghĩa." : "One amino acid is replaced by another: a missense mutation."),
    ], note: vi ? "Theo bảng mã di truyền chuẩn." : "From the standard genetic code." };
  },
};

export const LAB_WHAT_IFS: Record<LabWhatIfKind, Spec> = { "em-induction": em, lever, thermal, density, buoyancy, gene };
/** Station renderer → what-if set (only after a passed attempt). */
export const WHAT_IF_BY_RENDERER: Record<string, LabWhatIfKind> = { "density-bench": "density", "buoyancy-bench": "buoyancy", "gene-expression": "gene" };
