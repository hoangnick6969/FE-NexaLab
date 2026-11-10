import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { NavLink } from "react-router-dom";
import { defineText } from "../../i18n";
import { fetchMyCredits } from "./credits-api";

const text = defineText({
  vi: { label: "Tín dụng AI", title: (n: number) => `Tín dụng AI: còn ${n}` },
  en: { label: "AI credits", title: (n: number) => `AI credits: ${n} left` },
});

/**
 * Sidebar entry of the teacher credit page. Renders nothing until the API says credits are enabled, so a deployment
 * with AI_CREDITS_ENABLED=false shows no credit UI at all. Mounted for teachers only (dynamic import in the shell).
 */
export default function TeacherCreditsNav() {
  const query = useQuery({ queryKey: ["my-credits", "balance"], queryFn: () => fetchMyCredits(), staleTime: 15_000 });
  if (!query.data?.enabled) return null;
  const t = text();
  return (
    <NavLink to="/credits" title={t.title(query.data.available)} aria-label={t.title(query.data.available)}>
      <Coins />
      <span className="nav-text">
        {t.label} · {query.data.available}
      </span>
    </NavLink>
  );
}
