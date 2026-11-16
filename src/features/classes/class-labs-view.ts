/**
 * Which assignments the Class Lab page lists. One rule for the list, the Archived tab and the empty state, so a kind of lab
 * work (a Guided lab or an Explore lab) can never show in one of them and be missing from another.
 */
import type { ClassSummary, TeacherAssignment } from "./class-types";

export type ClassLabsView = "active" | "archived";

/** Lab work is what a teacher manages on the Class Lab page; lessons, tests and written tasks stay on the class's Assign tab. */
export const isLabWork = (assignment: Pick<TeacherAssignment, "contentType">) =>
  assignment.contentType === "lab" || assignment.contentType === "explore_lab";

export function showsInView(
  view: ClassLabsView,
  classroom: Pick<ClassSummary, "status">,
  assignment: Pick<TeacherAssignment, "contentType" | "status">,
) {
  if (!isLabWork(assignment)) return false;
  return view === "active"
    ? classroom.status === "ACTIVE" && assignment.status === "ACTIVE"
    : classroom.status === "ARCHIVED" || assignment.status === "ARCHIVED";
}
