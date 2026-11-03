import * as THREE from "three";

/** Scene colours (sRGB hex; THREE.Color converts to the linear working space). */
export const ECO_SCENE = {
  light: { background: "#e4ede6", fog: "#e4ede6", sky: "#e6f4ff", ground: "#6b5a40", sun: "#fff1d6", sunIntensity: 2.4, hemi: 1.0 },
  dark: { background: "#131c1b", fog: "#131c1b", sky: "#b9d4e6", ground: "#2c261c", sun: "#ffe4c2", sunIntensity: 1.7, hemi: 0.55 },
} as const;

export const ECO_COLORS = {
  grass: "#7fa65a", grassDark: "#5d8a45", bankSoil: "#8a6b4a", topsoil: "#5a4632", clay: "#9b7b55", sand: "#c9ae80",
  mud: "#6e5a42", pebble: "#8d8576", weed: "#4f8f4a", weedTip: "#86b85c", reed: "#7c8f4e", cattail: "#6b4a2e",
  lily: "#5f9a48", lilyFlower: "#f2c9d8", glass: "#e8f4f7", mercury: "#c8402f", tick: "#3e4a46", plate: "#f4f1e6",
  meadow: "#86ad5c", meadowTall: "#5f8f3e", bark: "#6b4f37", leaf: "#4f8a3f", leafLight: "#6fa64e", litter: "#8a6a42", puddle: "#5f9fb0",
  grasshopper: "#7fae3c", caterpillar: "#9cc24a", caterpillarHead: "#5d7a2a", rabbit: "#9a8572", rabbitBelly: "#e6dccb",
  frog: "#4f9a45", frogBelly: "#d9dfa0", bird: "#8f9a3e", birdBreast: "#e0c45a", beak: "#e0a33a", snake: "#6f7d3c", snakeBelly: "#c9c07a",
  fox: "#c66a2c", foxWhite: "#f3eadc", eagle: "#5b4330", eagleHead: "#f1ede4", mushroomCap: "#a8653d", mushroomStem: "#efe4cf", microbe: "#9b7fc0",
  fishBack: "#4e5c48", fishSide: "#8c9a84", fishBelly: "#dcdccb", fishBar: "#5f6e58", fishFin: "#6f7d68", fishFinEdge: "#b5655a", fishEye: "#151a17",
} as const;

/** Food-web link colours: plain, brought forward, the learner's chain, a missing link, remains to decomposers. */
export const FOOD_WEB_LINKS = {
  light: { edge: "#5f6f66", focus: "#1f4f8a", chain: "#245b47", missing: "#c8402f", decay: "#9b8a72", increase: "#1f6f45", decrease: "#a8362a" },
  dark: { edge: "#a9b8b0", focus: "#8fb8f0", chain: "#7cc3a4", missing: "#f2a99f", decay: "#b9a88f", increase: "#8fd6ac", decrease: "#f2a99f" },
} as const;

const COLD = new THREE.Color("#6fb3dd"), MILD = new THREE.Color("#4fa7a0"), WARM = new THREE.Color("#c6a85a");

/** Water tint for a temperature in tenths of a degree (0–50 °C): cold blue, mild green, warm amber. Follows the factor only, never the fish outcome. */
export function waterTint(valueDeciC: number, out = new THREE.Color()) {
  const t = THREE.MathUtils.clamp(valueDeciC / 500, 0, 1);
  return t < 0.55 ? out.copy(COLD).lerp(MILD, t / 0.55) : out.copy(MILD).lerp(WARM, (t - 0.55) / 0.45);
}
