import { Suspense, lazy } from "react";
import { useAuth } from "../../lib/api";
import { PageLoader } from "../../components/ui";
import { StudentClasses } from "./StudentClasses";

// Teacher screens (class management, evidence and the TAI-04 insights) are a separate chunk, so a student never downloads
// them. scripts/check-insights-bundle.mjs proves this on the built output.
const TeacherClasses = lazy(() => import("./TeacherClasses").then((m) => ({ default: m.TeacherClasses })));

export function Classes() {
  const user = useAuth((state) => state.user)!;
  if (user.role === "STUDENT") return <StudentClasses />;
  return (
    <Suspense fallback={<PageLoader />}>
      <TeacherClasses />
    </Suspense>
  );
}
