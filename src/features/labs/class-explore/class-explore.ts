/** Class Explore (P0 C3): shapes shared by the teacher flow, the student bench and the review board. */

export type ExploreRequirement =
  | { kind: "measure"; itemId: string; measurement: "ph_meter"; unit: "tenthsPh" }
  | { kind: "explain" };

export type ExploreSubmission = {
  id: string;
  answers: { measures: Array<{ itemId: string; tenthsPh: number }>; explanation?: string };
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

/** Where the notebook, safety acknowledgement and prompt answers of an assignment are kept on this device. */
export const assignmentStorageKey = (labId: string, assignmentId: string) => `${labId}@assignment:${assignmentId}`;
