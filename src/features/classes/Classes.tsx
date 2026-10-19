import { useAuth } from "../../lib/api";
import { StudentClasses } from "./StudentClasses";
import { TeacherClasses } from "./TeacherClasses";

export function Classes() {
  const user = useAuth((s) => s.user)!;
  return user.role === "STUDENT" ? <StudentClasses /> : <TeacherClasses />;
}
