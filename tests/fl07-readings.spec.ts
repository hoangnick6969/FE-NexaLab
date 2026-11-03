import { test, expect } from "@playwright/test";
import { parseThermalEnergy, parseThermalTemperature } from "../src/features/labs/physics/thermal/thermal-readings";

test("FL-07 preserves integer units and accepts comma or point tenths", () => {
  expect(parseThermalEnergy("2100")).toBe(2100000);
  expect(parseThermalTemperature("30,0")).toBe(30000);
  expect(parseThermalTemperature("30.1")).toBe(30100);
  expect(parseThermalTemperature("0.5")).toBe(500);
  expect(parseThermalEnergy("10000")).toBe(10000000);
  expect(parseThermalTemperature("100.0")).toBe(100000);
  expect(parseThermalEnergy("10001")).toBeNull();
  expect(parseThermalTemperature("100.1")).toBeNull();
});

test("FL-07 rejects grouping, excessive precision, signs, leading zeros and units", () => {
  for (const input of ["2.100", "2100,5", "2100J", "0030", "05", "", " ", "-5", "+30", "30 C", "1.000,0"])
    expect(parseThermalEnergy(input), input).toBeNull();
  for (const input of ["1.000,0", "-5", "+30", "30,05", "25.12", "0030", "05", "00.5", "30.", "30,", ".5", ",5", "", " ", "30 C", "30, 0"])
    expect(parseThermalTemperature(input), input).toBeNull();
});
