import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles, X } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { ErrorBox } from "../../components/ui";
import { defineText } from "../../i18n";
import { AiChip } from "./AiChip";
import "./TutorChat.css";

/**
 * B5: ask about a highlighted textbook passage (EBOOK tutor conversation, textbook-qa@1). Dev/test only while SG-2 /
 * SG-4 are open. The passage and page travel with the question; the server refuses injected passages and answer requests.
 */
type Message = { id: string; role: "STUDENT" | "TUTOR"; content: string; outcome: string | null; ai: boolean; passage?: string; pageNumber?: number };
type Conversation = { id: string; messages: Message[] };
export type TextbookSelection = { text: string; prefix: string; suffix: string };

const text = defineText({
  vi: {
    title: "Hỏi AI về đoạn sách", close: "Đóng hỏi AI",
    pick: "Bôi đen một đoạn trong trang sách rồi đặt câu hỏi về đoạn đó.",
    selected: (page: number) => `Đoạn đã chọn · trang ${page}`, placeholder: "Em muốn hỏi gì về đoạn này?", send: "Hỏi",
    note: "AI giải thích theo đúng đoạn sách, không giải hộ bài tập và không ảnh hưởng điểm. Đừng nhập thông tin cá nhân.",
    page: (n: number) => `Trang ${n}`, wait: (s: number) => `Em có thể hỏi tiếp sau ${s} giây.`,
  },
  en: {
    title: "Ask AI about this passage", close: "Close ask AI",
    pick: "Highlight a passage on the page, then ask about it.",
    selected: (page: number) => `Selected passage · page ${page}`, placeholder: "What do you want to ask about this passage?", send: "Ask",
    note: "The AI explains the passage itself, never solves exercises and never changes a score. Do not enter personal details.",
    page: (n: number) => `Page ${n}`, wait: (s: number) => `You can ask again in ${s} seconds.`,
  },
});

export function TextbookAsk({ subjectId, pageNumber, selection, maxMessage, onClose }: {
  subjectId: string; pageNumber: number; selection: TextbookSelection | null; maxMessage: number; onClose: () => void;
}) {
  const t = text();
  const [draft, setDraft] = useState("");
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const key = ["tutor-conversation", "EBOOK", subjectId];
  const conversation = useQuery({ queryKey: key, queryFn: () => api<Conversation>("/tutor/conversations", "POST", { contextKind: "EBOOK", contextId: subjectId }) });
  const ask = useMutation({
    mutationFn: () => api<{ messages: Message[] }>(`/tutor/conversations/${encodeURIComponent(conversation.data!.id)}/messages`, "POST", {
      message: draft.trim(), passage: { text: selection!.text, prefix: selection!.prefix.slice(-200), suffix: selection!.suffix.slice(0, 200), pageNumber },
    }),
    onSuccess: (result) => {
      setDraft("");
      queryClient.setQueryData<Conversation>(key, (previous) => previous ? { ...previous, messages: [...previous.messages, ...result.messages] } : previous);
    },
    onError: (error) => {
      const seconds = error instanceof ApiError && error.code === "TUTOR_RATE_LIMITED" ? Number((error.details as any)?.retryAfterSeconds) : NaN;
      if (Number.isFinite(seconds) && seconds > 0) { setWaitUntil(Date.now() + seconds * 1000); setTimeout(() => setWaitUntil(null), seconds * 1000); }
    },
  });
  const recent = (conversation.data?.messages ?? []).slice(-6);
  return (
    <section className="panel tutor-chat-panel textbook-ask" aria-labelledby="textbook-ask-title" data-testid="textbook-ask">
      <header>
        <h3 id="textbook-ask-title"><Sparkles size={18} aria-hidden /> {t.title}</h3>
        <button type="button" className="text-button" aria-label={t.close} onClick={onClose}><X size={16} aria-hidden /></button>
      </header>
      {recent.length > 0 && <ol className="tutor-chat-messages" aria-live="polite">
        {recent.map((item) => (
          <li key={item.id} data-role={item.role}>
            {item.passage && <small className="muted">{t.page(item.pageNumber ?? pageNumber)} · “{item.passage.length > 80 ? item.passage.slice(0, 80) + "…" : item.passage}”</small>}
            {item.ai && <AiChip provider="anthropic" />}
            <p>{item.content}</p>
          </li>
        ))}
      </ol>}
      {selection ? <>
        <small className="muted">{t.selected(pageNumber)}</small>
        <blockquote className="textbook-ask-quote">{selection.text}</blockquote>
        <form onSubmit={(event) => { event.preventDefault(); if (draft.trim() && conversation.data) ask.mutate(); }}>
          <textarea aria-label={t.placeholder} rows={2} maxLength={maxMessage} placeholder={t.placeholder} value={draft} onChange={(event) => setDraft(event.target.value)} />
          <div className="tutor-chat-actions">
            <span />
            <button type="submit" className="primary" disabled={!draft.trim() || ask.isPending || !conversation.data || Boolean(waitUntil)}><Send size={15} aria-hidden /> {t.send}</button>
          </div>
        </form>
      </> : <p className="muted">{t.pick}</p>}
      {waitUntil ? <p className="tiny muted" role="status">{t.wait(Math.max(1, Math.ceil((waitUntil - Date.now()) / 1000)))}</p>
        : <ErrorBox error={conversation.error || (ask.error instanceof ApiError && ask.error.code === "TUTOR_RATE_LIMITED" ? null : ask.error)} />}
      <small className="muted">{t.note}</small>
    </section>
  );
}
