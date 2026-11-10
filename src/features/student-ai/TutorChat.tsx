import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircleQuestion, Send, X } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { ErrorBox } from "../../components/ui";
import { defineText } from "../../i18n";
import { AiChip } from "./AiChip";
import { useStudentAiStatus } from "./useStudentAi";
import type { HighlightedPassage } from "./useTextSelection";
import "./TutorChat.css";

/**
 * SAI-04 Socratic tutor chat inside a Lab or lesson (dev/test only while SG-2 / SG-4 are open). In a lesson the student
 * can highlight a passage and ask about it (tutor-chat-rules@5): the passage travels with the next question and the
 * server checks it belongs to the lesson.
 */
type Message = { id: string; role: "STUDENT" | "TUTOR"; content: string; outcome: string | null; ai: boolean; createdAt: string; passage?: string };
type Conversation = { id: string; messages: Message[] };

const text = defineText({
  vi: {
    open: "Hỏi gia sư AI", close: "Đóng gia sư", title: "Gia sư AI",
    intro: "Hỏi về bài đang học. Gia sư gợi mở từng bước, không cho đáp án và không ảnh hưởng điểm.",
    privacy: "Đừng nhập thông tin cá nhân. Cuộc trò chuyện được lưu lại để bảo đảm an toàn.",
    placeholder: "Em thắc mắc điều gì trong bài?", send: "Gửi", you: "Em", tutor: "Gia sư",
    remaining: (n: number) => `Còn ${n} ký tự`, wait: (s: number) => `Em có thể hỏi tiếp sau ${s} giây.`,
    quoted: "Đoạn em đã bôi đen", removeQuote: "Bỏ đoạn đã chọn", passagePlaceholder: "Em thắc mắc gì về đoạn này?",
    tipHighlight: "Mẹo: bôi đen một đoạn trong bài rồi bấm \"Hỏi AI về đoạn này\".",
  },
  en: {
    open: "Ask the AI tutor", close: "Close the tutor", title: "AI tutor",
    intro: "Ask about this lesson. The tutor guides you step by step, never gives the answer and never changes a score.",
    privacy: "Do not enter personal details. Conversations are kept for safety.",
    placeholder: "What are you wondering about?", send: "Send", you: "You", tutor: "Tutor",
    remaining: (n: number) => `${n} characters left`, wait: (s: number) => `You can ask again in ${s} seconds.`,
    quoted: "Your highlighted passage", removeQuote: "Remove the passage", passagePlaceholder: "What are you wondering about this passage?",
    tipHighlight: "Tip: highlight a passage in the lesson, then press \"Ask AI about this\".",
  },
});

export function TutorChat({ contextKind, contextId, passage = null, onPassageChange }: {
  contextKind: "LAB" | "LESSON"; contextId: string;
  /** Lesson only: the highlighted passage to send with the next question; cleared after sending. */
  passage?: HighlightedPassage | null; onPassageChange?: (passage: HighlightedPassage | null) => void;
}) {
  const t = text();
  const status = useStudentAiStatus();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const list = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  // Opened from a highlight: dock the panel beside the text so the student keeps reading where they are.
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    if (!passage) return;
    setOpen(true);
    setDocked(true);
  }, [passage]);
  // Focus once the panel (and its textarea) is rendered.
  useEffect(() => { if (open && passage) input.current?.focus(); }, [open, passage]);
  const queryClient = useQueryClient();
  const key = ["tutor-conversation", contextKind, contextId];
  const conversation = useQuery({
    queryKey: key,
    queryFn: () => api<Conversation>("/tutor/conversations", "POST", { contextKind, contextId }),
    enabled: open && status.chatEnabled,
  });
  const send = useMutation({
    mutationFn: (message: string) => api<{ messages: Message[] }>(`/tutor/conversations/${encodeURIComponent(conversation.data!.id)}/messages`, "POST",
      passage ? { message, passage: { text: passage.text, prefix: passage.prefix.slice(-200), suffix: passage.suffix.slice(0, 200) } } : { message }),
    onSuccess: (result) => {
      setDraft("");
      onPassageChange?.(null);
      queryClient.setQueryData<Conversation>(key, (previous) => previous ? { ...previous, messages: [...previous.messages, ...result.messages] } : previous);
    },
    onError: (error) => {
      const seconds = error instanceof ApiError && error.code === "TUTOR_RATE_LIMITED" ? Number((error.details as any)?.retryAfterSeconds) : NaN;
      if (Number.isFinite(seconds) && seconds > 0) setWaitUntil(Date.now() + seconds * 1000);
    },
  });
  useEffect(() => { list.current?.lastElementChild?.scrollIntoView({ block: "nearest" }); }, [conversation.data?.messages.length]);
  useEffect(() => {
    if (!waitUntil) return;
    const timer = setInterval(() => { setNow(Date.now()); if (Date.now() >= waitUntil) setWaitUntil(null); }, 1000);
    return () => clearInterval(timer);
  }, [waitUntil]);
  if (!status.chatEnabled) return null;
  const waiting = waitUntil ? Math.max(0, Math.ceil((waitUntil - now) / 1000)) : 0;
  const message = draft.trim();
  return (
    <div className="tutor-chat" data-open={open} data-docked={open && docked} data-testid="tutor-chat">
      {!open ? (
        <button type="button" className="secondary tutor-chat-toggle" onClick={() => setOpen(true)}>
          <MessageCircleQuestion size={16} aria-hidden /> {t.open}
        </button>
      ) : (
        <section className="panel tutor-chat-panel" aria-labelledby="tutor-chat-title">
          <header>
            <h3 id="tutor-chat-title"><MessageCircleQuestion size={18} aria-hidden /> {t.title}</h3>
            <button type="button" className="text-button" aria-label={t.close} onClick={() => { setOpen(false); setDocked(false); onPassageChange?.(null); }}><X size={16} aria-hidden /></button>
          </header>
          <p className="tiny muted">{t.intro}</p>
          <ol className="tutor-chat-messages" ref={list} aria-live="polite" aria-label={t.title} tabIndex={0}>
            {conversation.data?.messages.map((item) => (
              <li key={item.id} data-role={item.role}>
                <span className="tiny muted">{item.role === "STUDENT" ? t.you : t.tutor} {item.ai && <AiChip provider="ai" />}</span>
                {item.passage && <small className="muted tutor-chat-quote-ref">“{item.passage.length > 100 ? item.passage.slice(0, 100) + "…" : item.passage}”</small>}
                <p>{item.content}</p>
              </li>
            ))}
          </ol>
          <ErrorBox error={conversation.error} />
          {passage && <div className="tutor-chat-quote" data-testid="tutor-chat-quote">
            <div><small className="muted">{t.quoted}</small><blockquote className="textbook-ask-quote">{passage.text}</blockquote></div>
            <button type="button" className="text-button" aria-label={t.removeQuote} onClick={() => onPassageChange?.(null)}><X size={14} aria-hidden /></button>
          </div>}
          <form onSubmit={(event) => { event.preventDefault(); if (message && conversation.data) send.mutate(message); }}>
            <textarea ref={input} aria-label={passage ? t.passagePlaceholder : t.placeholder} rows={2} maxLength={status.maxMessage} placeholder={passage ? t.passagePlaceholder : t.placeholder} value={draft} onChange={(event) => setDraft(event.target.value)} />
            <div className="tutor-chat-actions">
              <small className="muted">{t.remaining(status.maxMessage - draft.length)}</small>
              <button type="submit" className="primary" disabled={!message || send.isPending || !conversation.data || waiting > 0}><Send size={15} aria-hidden /> {t.send}</button>
            </div>
          </form>
          {waiting > 0 ? <p className="tiny muted" role="status">{t.wait(waiting)}</p>
            : !(send.error instanceof ApiError && send.error.code === "TUTOR_RATE_LIMITED") && <ErrorBox error={send.error} />}
          {contextKind === "LESSON" && onPassageChange && !passage && <small className="muted">{t.tipHighlight}</small>}
          <small className="muted">{t.privacy}</small>
        </section>
      )}
    </div>
  );
}
