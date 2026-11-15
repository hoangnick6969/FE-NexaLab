import { useQuery } from "@tanstack/react-query";
import { api, useAuth } from "../../lib/api";

/** Whether the LLM path and the tutor chat are on (dev/test only while SG-2 is open). */
export function useStudentAiStatus() {
  const isStudent = useAuth((state) => state.user?.role === "STUDENT");
  const hints = useQuery({ queryKey: ["tutor-status"], queryFn: () => api<{ provider: string; llmEnabled?: boolean }>("/tutor/status"), staleTime: 60_000 });
  const chat = useQuery({ queryKey: ["tutor-chat-status"], queryFn: () => api<{ enabled: boolean; maxMessage: number }>("/tutor/chat/status"), enabled: isStudent, staleTime: 60_000, retry: false });
  return { llmEnabled: Boolean(hints.data?.llmEnabled), chatEnabled: isStudent && Boolean(chat.data?.enabled), maxMessage: chat.data?.maxMessage ?? 500 };
}
