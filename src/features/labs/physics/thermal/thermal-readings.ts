/** Display inputs are parsed as integers; units and grouping separators are never guessed. */
export function parseThermalEnergy(input: string): number | null {
  return /^(0|[1-9]\d*)$/.test(input) && Number(input) <= 10000 ? Number(input) * 1000 : null;
}

export function parseThermalTemperature(input: string): number | null {
  const match = /^(0|[1-9]\d*)([.,](\d))?$/.exec(input);
  if (!match) return null;
  const value = Number(match[1]) * 1000 + Number(match[3] ?? 0) * 100;
  return value <= 100000 ? value : null;
}

export const thermalDegrees = (value: number) => (value / 1000).toFixed(1).replace(".", ",");
export type ThermalObservation = {
  elapsedMilliseconds: number;
  meterReadingMilliJoules: number;
  thermometerReadingMilliCelsius: number;
  riseMilliCelsius: number;
  heaterState: "OFF" | "ON" | "AUTO_STOP";
};

export type ThermalEvent = { type: string; [key: string]: string | number };
export type ThermalSnapshot = {
  events: ThermalEvent[];
  observations: ThermalObservation[];
  observation: { ok: true; value: ThermalObservation };
};
