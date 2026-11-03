import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import * as fe from "../src/features/labs/biology/anatomy/kit/optics";
import * as feEvidence from "../src/features/labs/biology/anatomy/eye-optics/eye-optics-evidence";

/**
 * FL-16 single-source check. The server model (`BE-NexaLab/packages/sim/eye-optics.ts`)
 * owns every optics constant; the FE kit copies the ones it needs for display.
 * This spec runs in Node only (no browser) and fails on any drift. It needs the
 * sibling BE checkout, as in the local workspace; without it the spec is skipped
 * with a reason instead of passing silently.
 */
const BE_MODEL = fileURLToPath(new URL("../../BE-NexaLab/packages/sim/eye-optics.ts", import.meta.url));
const BE_SIM = fileURLToPath(new URL("../../BE-NexaLab/packages/sim/index.ts", import.meta.url));
const hasBackend = existsSync(BE_MODEL) && existsSync(BE_SIM);

test.describe("FL-16 optics constants parity (BE eye-optics@1.0.0 ↔ FE EX-A kit)", () => {
  test.skip(!hasBackend, `Sibling BE checkout not found at ${BE_MODEL}`);

  test("optical constants are identical", async () => {
    const be = await import(pathToFileURL(BE_MODEL).href);
    expect(fe.VITREOUS_INDEX).toBe(be.VITREOUS_INDEX);
    expect(fe.CORNEA_POWER_D).toBe(be.CORNEA_POWER_D);
    expect(fe.FOCUS_TOLERANCE_D).toBe(be.FOCUS_TOLERANCE_D);
    expect(feEvidence.POWER_STEP_D).toBe(be.POWER_STEP_D);
    expect(feEvidence.LENS_RANGE_D).toEqual(be.LENS_POWER_RANGE_D);
    expect(feEvidence.GLASSES_RANGE_D).toEqual(be.GLASSES_POWER_RANGE_D);
  });

  test("scenarios match id, axial length (mm vs m), object distance and ametropia", async () => {
    const be = await import(pathToFileURL(BE_MODEL).href);
    expect(feEvidence.EYE_OPTICS_SCENARIOS.map((s) => s.id)).toEqual(be.EYE_OPTICS_SCENARIOS.map((s: { id: string }) => s.id));
    for (const [index, scenario] of feEvidence.EYE_OPTICS_SCENARIOS.entries()) {
      const server = be.EYE_OPTICS_SCENARIOS[index];
      expect(scenario.axialMm / 1000).toBeCloseTo(server.axialLengthM, 12);
      expect(scenario.objectDistanceM).toBe(server.objectDistanceM);
      expect(scenario.ametropia).toBe(server.ametropia);
    }
  });

  test("every FE distance choice is accepted by the server schema, and each scenario target is reachable", async () => {
    const be = await import(pathToFileURL(BE_MODEL).href);
    for (const value of feEvidence.DISTANCE_OPTIONS_M) {
      if (value === null) continue;
      expect(value).toBeGreaterThanOrEqual(be.DISTANCE_RANGE_M.min);
      expect(value).toBeLessThanOrEqual(be.DISTANCE_RANGE_M.max);
    }
    for (const scenario of be.EYE_OPTICS_SCENARIOS) expect(feEvidence.DISTANCE_OPTIONS_M).toContain(scenario.objectDistanceM);
  });

  test("part ids and Vietnamese names match the server list", async () => {
    const sim = await import(pathToFileURL(BE_SIM).href);
    const server = Object.fromEntries(sim.eyeParts.map((part: { id: string; name: string }) => [part.id, part.name]));
    expect(feEvidence.EYE_PART_NAMES).toEqual(server);
  });

  test("accepted synonyms match the server, and the retina label shows both names", async () => {
    const be = await import(pathToFileURL(BE_MODEL).href);
    expect(feEvidence.EYE_PART_ALIASES).toEqual(be.EYE_OPTICS_ANSWER_ALIASES);
    for (const alias of feEvidence.EYE_PART_ALIASES.retina ?? []) {
      expect(feEvidence.EYE_PART_LABELS.retina).toContain(alias);
      expect(be.isAcceptedPartName("retina", alias)).toBe(true);
    }
  });

  test("required power and default draft agree with the server", async () => {
    const be = await import(pathToFileURL(BE_MODEL).href);
    for (const scenario of feEvidence.EYE_OPTICS_SCENARIOS) {
      expect(fe.requiredPowerD(scenario.axialMm, scenario.objectDistanceM)).toBeCloseTo(be.requiredPowerD(scenario.axialMm / 1000, scenario.objectDistanceM), 12);
    }
    // The FE default draft must parse under the server schema (phase 1 empty is allowed).
    expect(be.eyeOpticsEvidenceSchema.safeParse(feEvidence.defaultEyeOpticsEvidence()).success).toBe(true);
  });

  test("the display ray trace puts the image on the retina exactly where the server says it is in focus", async () => {
    const be = await import(pathToFileURL(BE_MODEL).href);
    for (const scenario of feEvidence.EYE_OPTICS_SCENARIOS) {
      const required = be.requiredPowerD(scenario.axialMm / 1000, scenario.objectDistanceM);
      const focused = fe.traceEye({ axialMm: scenario.axialMm, objectDistanceM: scenario.objectDistanceM, providedPowerD: required });
      expect(Math.abs(focused.imageOffsetMm ?? Infinity)).toBeLessThan(0.06);
      // Too much power puts the image in front of the retina (positive), too little behind it.
      expect(fe.traceEye({ axialMm: scenario.axialMm, objectDistanceM: scenario.objectDistanceM, providedPowerD: required + 1 }).imageOffsetMm!).toBeGreaterThan(0);
      expect(fe.traceEye({ axialMm: scenario.axialMm, objectDistanceM: scenario.objectDistanceM, providedPowerD: required - 1 }).imageOffsetMm!).toBeLessThan(0);
    }
  });
});
