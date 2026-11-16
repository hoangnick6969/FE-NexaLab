/** Class Explore (P0 C3): shapes shared by the teacher flow, the student bench and the review board. */
import type { ExploreRequirement, MeasureUnit, RequirementMeasurement } from "@nexalab/sim/explore/requirements";
import { defineText } from "../../../i18n";

export type { ExploreRequirement, MeasureUnit, RequirementMeasurement };
export type MeasureRequirement = Extract<ExploreRequirement, { kind: "measure" }>;
/** One handed-in value, an integer in the requirement's unit. Rows saved by the first clients carry `tenthsPh` instead. */
export type MeasureAnswer = { itemId: string; value?: number; tenthsPh?: number };
export const answerValue = (item: MeasureAnswer) => item.value ?? item.tenthsPh ?? 0;

export type ExploreSubmission = {
  id: string;
  answers: { measures: MeasureAnswer[]; explanation?: string };
  status: "SUBMITTED" | "REVIEWED";
  submittedAt: string;
  feedback: string | null;
  reviewedAt: string | null;
  /** Handed in after the teacher's due date (read against the current due date by the server). */
  late?: boolean;
  /** Until the due date, and only while the teacher has not commented. */
  canResubmit?: boolean;
};

/** What `GET /assignments/:id` returns for a Class Explore assignment (student view). */
export type ExploreAssignmentView = {
  id: string;
  title: string;
  contentType: "explore_lab";
  dueDate: string | null;
  overdue: boolean;
  classroom: { id: string; name: string };
  explore: {
    snapshot: {
      title: string;
      labId: string;
      activity: { id: string; key: string; version: number; digest: string };
      instructions: string;
      requirements: ExploreRequirement[];
      effectiveConfig: Record<string, any>;
      effectiveConfigDigest: string;
    };
    submission: ExploreSubmission | null;
  };
};

export const EXPLANATION_MAX = 2000;

/** pH shown with one decimal and a comma, the way the bench and the textbook write it: 10 → "1,0". */
export const formatTenthsPh = (tenths: number) => (tenths / 10).toFixed(1).replace(".", ",");

/**
 * A pH the student typed: 0 to 14 with at most one decimal, "," or "." as the separator.
 * Returns tenths of a pH unit, which is what the server stores.
 */
export function parsePhInput(raw: string): { ok: true; tenths: number } | { ok: false } {
  const match = /^(\d{1,2})(?:[.,](\d))?$/.exec(raw.trim());
  if (!match) return { ok: false };
  const tenths = Number(match[1]) * 10 + Number(match[2] ?? 0);
  return tenths >= 0 && tenths <= 140 ? { ok: true, tenths } : { ok: false };
}

/** Moment in N·m with three decimals and a comma, as the moment table shows it: 150 → "0,150". */
export const formatMilliNewtonMetres = (value: number) => (value / 1000).toFixed(3).replace(".", ",");

/** A moment the student typed in N·m: 0 to 100 with at most three decimals. Returns thousandths of a N·m (mN·m). */
export function parseMomentInput(raw: string): { ok: true; value: number } | { ok: false } {
  const match = /^(\d{1,3})(?:[.,](\d{1,3}))?$/.exec(raw.trim());
  if (!match) return { ok: false };
  const value = Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
  return value <= 100_000 ? { ok: true, value } : { ok: false };
}

/** Show and read a value by its unit (MEASURE_UNITS in the sim). */
export const formatMeasure = (unit: MeasureUnit, value: number) => (unit === "tenthsPh" ? formatTenthsPh(value) : formatMilliNewtonMetres(value));
export function parseMeasureInput(unit: MeasureUnit, raw: string): { ok: true; value: number } | { ok: false } {
  if (unit === "milliNewtonMetres") return parseMomentInput(raw);
  const ph = parsePhInput(raw);
  return ph.ok ? { ok: true, value: ph.tenths } : { ok: false };
}
export const unitOf = (requirements: readonly ExploreRequirement[], itemId: string): MeasureUnit =>
  requirements.find((item): item is MeasureRequirement => item.kind === "measure" && item.itemId === itemId)?.unit ?? "tenthsPh";

/** Words for a measurement: `asked` in lists of what to hand in, `field` on the input, `help` above the form, `invalid` on a bad value. */
export const measureText = defineText({
  vi: {
    ph_meter: {
      asked: (name: string) => `Số đo pH của ${name}`, field: (name: string) => `pH của ${name}`,
      help: "Đo bằng bút đo pH trên bàn rồi ghi số em đọc được (ví dụ 7,0).",
      invalid: "Nhập số từ 0 đến 14, tối đa một chữ số thập phân (ví dụ 7,0).",
    },
    moment: {
      asked: (name: string) => `Moment ${name} khi thanh cân bằng`, field: (name: string) => `Moment ${name} (N·m)`,
      help: "Khi thanh đã nằm ngang, tính moment mỗi bên bằng F × d rồi ghi theo N·m (ví dụ 0,150).",
      invalid: "Nhập số N·m từ 0 đến 100, tối đa ba chữ số thập phân (ví dụ 0,150).",
    },
  },
  en: {
    ph_meter: {
      asked: (name: string) => `pH of ${name}`, field: (name: string) => `pH of ${name}`,
      help: "Measure with the pH pen on the bench and write the number you read (for example 7.0).",
      invalid: "Enter a number from 0 to 14 with at most one decimal (for example 7.0).",
    },
    moment: {
      asked: (name: string) => `Moment (${name}) when the bar is level`, field: (name: string) => `Moment (${name}), N·m`,
      help: "Once the bar is level, work out each side's moment as F × d and write it in N·m (for example 0.150).",
      invalid: "Enter N·m from 0 to 100 with at most three decimals (for example 0.150).",
    },
  },
});

/** Where the notebook, safety acknowledgement and prompt answers of an assignment are kept on this device. */
export const assignmentStorageKey = (labId: string, assignmentId: string) => `${labId}@assignment:${assignmentId}`;
