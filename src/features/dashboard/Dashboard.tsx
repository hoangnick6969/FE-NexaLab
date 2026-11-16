import { useQuery } from "@tanstack/react-query";
import { api, useAuth } from "../../lib/api";
import { StudentDashboard } from "./StudentDashboard";
import { TeacherDashboard } from "./TeacherDashboard";
import { ParentDashboard } from "./ParentDashboard";

/** One home per role: the student's, the teacher's, and the parent's (admins have their own page at the same route). */
export function Dashboard() {
  const user = useAuth((s) => s.user)!;
  const isStudent = user.role === "STUDENT";
  const stats = useQuery({
    queryKey: ["progress", user.id],
    queryFn: () => api("/progress/" + user.id),
    enabled: isStudent,
  });
  const assignments = useQuery({
    queryKey: ["assignments"],
    queryFn: () => api("/assignments"),
    enabled: isStudent,
  });
  if (isStudent) {
    return <StudentDashboard user={user} stats={stats} assignments={assignments} />;
  }
  if (user.role === "TEACHER") return <TeacherDashboard />;
  return <ParentDashboard />;
}
