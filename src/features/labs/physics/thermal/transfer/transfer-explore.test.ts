// Run: npx tsx --test src/features/labs/physics/thermal/transfer/transfer-explore.test.ts (plain node cannot resolve @nexalab/sim subpaths).
import test from "node:test";
import assert from "node:assert/strict";
import type { ThermalLabConfig } from "@nexalab/sim/thermal";
import { listThermalKitItems } from "./kit-items.ts";
import { appendThermalEntry, describeRodsAtEnd, droppedBetween, formatTenthsC, meltedBetween, pinDropVi, tubeMeltVi, tubeStillVi, type RodView, type TubeView } from "./transfer-log.ts";

// Same fields as FL08_HEAT_TRANSFER_EXPLORE_CONFIG (the sim golden test validates that copy); tsx cannot read the sim's named exports.
const config = {
  clock: { maxSeconds: 600, speeds: [1, 10, 30] },
  conduction: { rodLengthMm: 300, pinPositionsMm: [50, 100, 150, 200, 250], materials: ["copper", "aluminium", "steel", "glass", "wood"], maxRods: 3, timeConstant: 16 },
  enabledApparatus: [
    { id: "rack", kind: "rod_rack", slot: "bench", labelVi: "Giá ba thanh dẫn nhiệt" },
    { id: "lamp", kind: "spirit_lamp", slot: "bench" },
    { id: "thermometer", kind: "thermometer", slot: "flask" },
    { id: "stopwatch", kind: "stopwatch", slot: "bench" },
  ],
} as unknown as ThermalLabConfig;
const rod = (material: string, dropped: number, times = [2, 9, 21, 37, 58]): RodView => ({ material, pins: ["a", "b", "c", "d", "e"].map((id, index) => ({ id, positionMm: 50 * (index + 1), dropped: index < dropped, meltSeconds: times[index] })) });

test("listThermalKitItems lists the enabled apparatus and marks the shared items", () => {
  const items = listThermalKitItems(config);
  assert.deepEqual(items.map((item) => [item.id, item.category, item.sharedItemId ?? null]), [["rack", "apparatus", null], ["lamp", "apparatus", null], ["thermometer", "instrument", "thermometer"], ["stopwatch", "instrument", "stopwatch"]]);
  assert.match(items[0].purposeVi, /Tối đa 3 thanh dài 300 mm \(Đồng, Nhôm, Thép, Thuỷ tinh, Gỗ\)/);
  assert.equal(items[1].labelVi, "Đèn cồn");
  assert.match(items[3].purposeVi, /tối đa 10 phút/);
});

test("pins that dropped during a skip are reported in melt order", () => {
  const events = droppedBetween([rod("copper", 1), rod("steel", 0, [14, 56, 126, 224, 350])], [rod("copper", 3), rod("steel", 1, [14, 56, 126, 224, 350])]);
  assert.deepEqual(events.map(pinDropVi), ["Đinh b của thanh Đồng rơi lúc 9 s", "Đinh a của thanh Thép rơi lúc 14 s", "Đinh c của thanh Đồng rơi lúc 21 s"]);
  assert.deepEqual(describeRodsAtEnd([rod("copper", 5), rod("glass", 0, [0, 0, 0, 0, 0])]), ["Thanh Đồng: 5/5 đinh đã rơi", "Thanh Thuỷ tinh: chưa đinh nào rơi"]);
});

test("tube lines follow the SGK wording", () => {
  const tube = (melted: boolean): TubeView => ({ id: "2", wax: "top", flame: "bottom", melts: true, melted });
  assert.deepEqual(meltedBetween([tube(false)], [tube(true)]).map((t) => tubeMeltVi(t, 40)), ["Ống (2): đun dưới đáy, viên sáp ở miệng chảy lúc 40 s"]);
  assert.equal(tubeStillVi({ id: "1", wax: "bottom", flame: "mouth", melts: false, melted: false }, 600), "Ống (1): sau 600 s viên sáp ở đáy vẫn chưa chảy");
  assert.equal(formatTenthsC(301), "30,1 °C");
});

test("notebook lines are appended with increasing numbers", () => {
  const line = { at: 1, station: "radiation" as const, simSeconds: 0, actionVi: "x", phenomenaVi: [] };
  assert.deepEqual(appendThermalEntry(appendThermalEntry([], line), line).map((entry) => entry.seq), [1, 2]);
});
