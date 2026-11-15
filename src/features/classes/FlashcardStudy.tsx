import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, RotateCcw, Star, Shuffle, ClipboardCheck } from "lucide-react";
import { api } from "../../lib/api";
import { CardSkeleton, Empty, ErrorBox } from "../../components/ui";
import type { Resource } from "./ClassSpaceResources";
import "./flashcard-study.css";

/**
 * One Quiz card. Two-sided cards (DECK) carry front/back only; A-D questions (STUDY_QUIZ) also carry their own
 * options, answer key and explanation, which "Làm thử đề" uses as they are.
 */
type Card = { id: string; front: string; back: string; explanation?: string | null; options?: string[]; correctOption?: number };
/** Latest "Làm thử đề" result. Kept in the student's own practice state only; the teacher board never reads it. */
type SelfTestResult = { correct: number; total: number; at: string };
type DeckState = { starredCards: string[]; revealed: Record<string, boolean>; lastIndex: number };

const isQuizResource = (kind: string) => kind === "DECK" || kind === "STUDY_QUIZ";

function toQuizCards(resource: Resource): Card[] {
  if (resource.kind === "DECK") return resource.content.cards ?? [];
  return (resource.content.questions ?? []).map((q: any) => {
    const options: string[] = (q.options ?? []).map((o: any) => (typeof o === "string" ? o : o.text));
    const hasKey = typeof q.correctOption === "number" && q.correctOption < options.length;
    return {
      id: q.id,
      front: q.prompt,
      back: hasKey ? `${String.fromCharCode(65 + q.correctOption)}. ${options[q.correctOption]}` : "Giáo viên chưa đặt đáp án cho câu này.",
      explanation: q.explanation ?? null,
      options,
      correctOption: hasKey ? q.correctOption : undefined,
    };
  });
}

export default function FlashcardStudy() {
  const { classId, resourceId } = useParams();
  const list = useQuery<Resource[]>({ queryKey: ["class-resources", classId], queryFn: () => api(`/classes/${classId}/resources`) });
  const resource = list.data?.find((item) => item.id === resourceId && isQuizResource(item.kind));
  return (
    <main className="flashcard-study">
      <Link className="study-back" to={`/classes/${encodeURIComponent(classId ?? "")}?tab=resources`}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Quay về lớp học</span>
      </Link>
      {list.isLoading ? (
        <CardSkeleton count={1} />
      ) : list.error ? (
        <>
          <ErrorBox error={list.error} />
          <button className="secondary" onClick={() => void list.refetch()}>Thử lại</button>
        </>
      ) : !resource ? (
        <Empty>Bộ thẻ không tồn tại hoặc chưa được chia sẻ với bạn.</Empty>
      ) : (
        <StudyDeck key={resource.id} resource={resource} />
      )}
    </main>
  );
}

export function StudyDeck({ resource }: { resource: Resource }) {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "starred" ? "STARRED" : "ALL";

  const allCards: Card[] = useMemo(() => toQuizCards(resource), [resource]);

  const storageKey = `nexa_fc_state_${resource.id}`;
  const legacyKey = `nexa_fc_starred_${resource.id}`;

  const localCached = useMemo(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) return { starredCards: JSON.parse(legacy) };
      return null;
    } catch {
      return null;
    }
  }, [storageKey, legacyKey]);

  const [starredCards, setStarredCards] = useState<string[]>(() => {
    const fromApi = resource.practice?.state?.starredCards;
    const fromLocal = localCached?.starredCards;
    if (Array.isArray(fromApi) && fromApi.length > 0) {
      if (Array.isArray(fromLocal) && fromLocal.length > 0) {
        return Array.from(new Set([...fromApi, ...fromLocal]));
      }
      return fromApi;
    }
    if (Array.isArray(fromLocal) && fromLocal.length > 0) {
      return fromLocal;
    }
    return Array.isArray(fromApi) ? fromApi : [];
  });

  const [filterMode, setFilterMode] = useState<"ALL" | "STARRED">(() => {
    if (initialMode === "STARRED" && starredCards.length > 0) return "STARRED";
    return "ALL";
  });
  const [isShuffled, setIsShuffled] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [revealed, setRevealed] = useState<Record<string, boolean>>(() => {
    const fromApi = resource.practice?.state?.revealed;
    const fromLocal = localCached?.revealed;
    return { ...(fromLocal ?? {}), ...(fromApi ?? {}) };
  });

  const [index, setIndex] = useState<number>(() => {
    const fromApi = resource.practice?.state?.lastIndex;
    const fromLocal = localCached?.lastIndex;
    const candidate = typeof fromApi === "number" ? fromApi : typeof fromLocal === "number" ? fromLocal : 0;
    if (candidate >= 0 && candidate < allCards.length) {
      return candidate;
    }
    return 0;
  });

  const [mode, setMode] = useState<"STUDY" | "TEST">("STUDY");
  const [selfTest, setSelfTest] = useState<SelfTestResult | null>(() => {
    const saved = resource.practice?.state?.selfTest;
    return saved && typeof saved.correct === "number" && typeof saved.total === "number" ? saved : null;
  });
  // The practice endpoint replaces the whole state, so every save carries the latest self-test result along.
  const selfTestRef = useRef(selfTest);
  const selfTestQuestions = useMemo(() => buildSelfTest(allCards), [allCards]);

  const save = useMutation({
    mutationFn: (state: DeckState & { selfTest?: SelfTestResult }) =>
      api(`/classes/${resource.classId}/resources/${resource.id}/practice`, "PUT", { state }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["class-resources", resource.classId] });
    },
  });

  const syncState = useCallback(
    (deckState: DeckState) => {
      const newState = selfTestRef.current ? { ...deckState, selfTest: selfTestRef.current } : deckState;
      try {
        localStorage.setItem(storageKey, JSON.stringify({ ...deckState, updatedAt: Date.now() }));
        localStorage.setItem(legacyKey, JSON.stringify(deckState.starredCards));
      } catch {}

      qc.setQueryData<Resource[]>(["class-resources", resource.classId], (old) => {
        if (!old) return old;
        return old.map((item) => {
          if (item.id !== resource.id) return item;
          return {
            ...item,
            practice: {
              ...(item.practice ?? { updatedAt: new Date().toISOString(), scored: false as const }),
              state: {
                ...(item.practice?.state ?? {}),
                ...newState,
              },
            },
          };
        });
      });

      save.mutate(newState);
    },
    [qc, resource.classId, resource.id, save, storageKey, legacyKey]
  );

  const activeCards = useMemo(() => {
    let list = filterMode === "STARRED"
      ? allCards.filter((c) => starredCards.includes(c.id))
      : [...allCards];

    if (isShuffled && list.length > 1) {
      list = [...list].sort((a, b) => (a.id > b.id ? 1 : -1));
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(((i * 9301 + 49297) % 233280) / 233280 * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    return list;
  }, [allCards, starredCards, filterMode, isShuffled]);

  useEffect(() => {
    if (index >= activeCards.length && activeCards.length > 0) {
      setIndex(0);
      setFlipped(false);
    }
  }, [activeCards.length, index]);

  const card = activeCards[index];
  const isCurrentStarred = Boolean(card && starredCards.includes(card.id));

  const toggleStar = (targetCardId: string) => {
    const nextStarred = starredCards.includes(targetCardId)
      ? starredCards.filter((id) => id !== targetCardId)
      : [...starredCards, targetCardId];
    setStarredCards(nextStarred);
    syncState({ starredCards: nextStarred, revealed, lastIndex: index });
  };

  function move(next: number) {
    if (next >= activeCards.length) {
      setIsFinished(true);
      return;
    }
    setIsFinished(false);
    const nextIdx = Math.max(0, Math.min(activeCards.length - 1, next));
    setIndex(nextIdx);
    setFlipped(false);
    syncState({ starredCards, revealed, lastIndex: nextIdx });
  }

  function flip() {
    if (!card) return;
    const nextFlipped = !flipped;
    setFlipped(nextFlipped);
    const nextRevealed = { ...revealed, [card.id]: nextFlipped };
    setRevealed(nextRevealed);
    syncState({ starredCards, revealed: nextRevealed, lastIndex: index });
  }

  const restartDeck = (mode: "ALL" | "STARRED" = "ALL") => {
    setFilterMode(mode);
    setIndex(0);
    setFlipped(false);
    setIsFinished(false);
    syncState({ starredCards, revealed, lastIndex: 0 });
  };

  const finishSelfTest = (result: SelfTestResult) => {
    selfTestRef.current = result;
    setSelfTest(result);
    syncState({ starredCards, revealed, lastIndex: index });
  };

  const progressPercent = activeCards.length > 0
    ? Math.round(((index + (isFinished ? 1 : 0)) / activeCards.length) * 100)
    : 0;

  return (
    <section
      className="study-workspace"
      aria-labelledby="study-title"
      tabIndex={0}
      onKeyDown={(event) => {
        if (mode === "TEST" || event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(index - 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          move(index + 1);
        } else if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          flip();
        } else if (event.key.toLowerCase() === "s" || event.key.toLowerCase() === "b") {
          event.preventDefault();
          if (card) toggleStar(card.id);
        } else if (event.key.toLowerCase() === "r") {
          event.preventDefault();
          restartDeck(filterMode);
        }
      }}
    >
      <header className="study-heading">
        <div className="study-header-main">
          <div className="study-title-block">
            <h1 id="study-title">{resource.title}</h1>
            <p className="study-subtitle muted">
              Quiz · {allCards.length} câu
              {selfTest && <> · Lần làm thử gần nhất: <b>{selfTest.correct}/{selfTest.total}</b> câu đúng</>}
            </p>
          </div>

          <div className="study-header-controls">
            {mode === "TEST" ? (
              <button type="button" className="study-shuffle-btn" onClick={() => setMode("STUDY")}>
                <ArrowLeft size={13} aria-hidden="true" />
                <span>Quay lại học thẻ</span>
              </button>
            ) : (
            <>
            {selfTestQuestions.length > 0 && (
              <button type="button" className="study-shuffle-btn" onClick={() => setMode("TEST")} title="Làm đề trắc nghiệm A, B, C, D để tự kiểm tra mức độ hiểu bài">
                <ClipboardCheck size={13} aria-hidden="true" />
                <span>Làm thử đề</span>
              </button>
            )}
            <div className="study-filter-segmented" role="tablist" aria-label="Lọc thẻ học">
              <button
                type="button"
                role="tab"
                aria-selected={filterMode === "ALL"}
                className={`study-filter-link${filterMode === "ALL" ? " is-active" : ""}`}
                onClick={() => restartDeck("ALL")}
              >
                Tất cả ({allCards.length})
              </button>
              <span className="study-filter-divider" aria-hidden="true">·</span>
              <button
                type="button"
                role="tab"
                aria-selected={filterMode === "STARRED"}
                className={`study-filter-link${filterMode === "STARRED" ? " is-active" : ""}`}
                onClick={() => {
                  if (starredCards.length > 0) restartDeck("STARRED");
                  else setFilterMode("STARRED");
                }}
              >
                Đã lưu ({starredCards.length})
              </button>
            </div>

            <button
              type="button"
              className={`study-shuffle-btn${isShuffled ? " is-active" : ""}`}
              onClick={() => {
                setIsShuffled(!isShuffled);
                setIndex(0);
                setFlipped(false);
              }}
              title="Trộn thứ tự thẻ"
            >
              <Shuffle size={13} aria-hidden="true" />
              <span>{isShuffled ? "Đang trộn" : "Trộn thẻ"}</span>
            </button>

            {index > 0 && !isFinished && (
              <button
                type="button"
                className="study-shuffle-btn"
                onClick={() => restartDeck(filterMode)}
                title="Học lại từ đầu (Phím R)"
              >
                <RotateCcw size={13} aria-hidden="true" />
                <span>Học từ đầu</span>
              </button>
            )}
            </>
            )}
          </div>
        </div>

        {/* Minimal Hairline Progress Tracker */}
        {mode === "STUDY" && activeCards.length > 0 && !isFinished && (
          <div className="study-progress-wrap" aria-label={`Tiến độ thẻ ${index + 1} trên ${activeCards.length}`}>
            <div className="study-progress-labels">
              <span>Thẻ <b>{index + 1}</b> / {activeCards.length}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="study-progress-line">
              <div className="study-progress-indicator" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </header>

      {mode === "TEST" ? (
        <SelfTest cards={allCards} onFinish={finishSelfTest} onExit={() => setMode("STUDY")} />
      ) : allCards.length === 0 ? (
        <Empty>Bộ thẻ này chưa có nội dung.</Empty>
      ) : filterMode === "STARRED" && activeCards.length === 0 ? (
        <div className="study-empty-starred-card">
          <h3>Chưa có thẻ nào được lưu</h3>
          <p className="muted">
            Khi học, hãy nhấn nút <b>Lưu thẻ</b> ở góc thẻ (hoặc phím S) để đánh dấu các khái niệm cần ôn lại.
          </p>
          <button type="button" className="secondary button-compact" onClick={() => setFilterMode("ALL")}>
            Xem tất cả {allCards.length} thẻ
          </button>
        </div>
      ) : isFinished ? (
        <div className="study-completion-card">
          <h2>Hoàn thành lượt ôn tập</h2>
          <p className="completion-summary muted">
            Bạn đã xem qua toàn bộ <b>{activeCards.length}</b> thẻ học trong chế độ này.
            {starredCards.length > 0 && (
              <span> Hiện có <b>{starredCards.length}</b> thẻ được lưu để ôn kỹ.</span>
            )}
          </p>

          <div className="completion-actions">
            <button
              type="button"
              className="primary button-compact"
              onClick={() => restartDeck(filterMode)}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Học lại lượt này</span>
            </button>
            {filterMode === "ALL" && starredCards.length > 0 && (
              <button
                type="button"
                className="secondary button-compact"
                onClick={() => restartDeck("STARRED")}
              >
                <span>Chỉ ôn {starredCards.length} thẻ đã lưu</span>
              </button>
            )}
            <Link className="secondary button-compact" to={`/classes/${encodeURIComponent(resource.classId)}?tab=resources`}>
              Quay về lớp học
            </Link>
          </div>
        </div>
      ) : !card ? (
        <Empty>Không tìm thấy thẻ học.</Empty>
      ) : (
        <>
          <div className="study-card-wrapper">
            {/* A div, not a <button>: the card holds the star buttons, and buttons cannot nest. */}
            <div
              role="button"
              tabIndex={0}
              className={`study-flip${flipped ? " is-flipped" : ""}`}
              aria-label={`${flipped ? "Đáp án" : "Câu hỏi"}: ${flipped ? card.back : [card.front, ...(card.options ?? []).map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`)].join(" ")}. Nhấn để lật thẻ.`}
              aria-pressed={flipped}
              onClick={flip}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                // The workspace also flips on Space/Enter; stop here so the card flips once.
                e.preventDefault();
                e.stopPropagation();
                flip();
              }}
            >
              <span className="study-flip-inner">
                {/* Front Face */}
                <span className="study-face study-face-front" aria-hidden={flipped}>
                  <div className="study-face-header">
                    <span className="study-side-label">CÂU HỎI</span>

                    <button
                      type="button"
                      className={`study-star-btn${isCurrentStarred ? " is-starred" : ""}`}
                      tabIndex={flipped ? -1 : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(card.id);
                      }}
                      onKeyDown={(e) => {
                        // Enter/Space activate this button; keep them from flipping the card.
                        if (e.key === "Enter" || e.key === " ") e.stopPropagation();
                      }}
                      title={isCurrentStarred ? "Bỏ lưu thẻ này (Phím S)" : "Lưu thẻ để ôn lại (Phím S)"}
                      aria-label={isCurrentStarred ? "Bỏ lưu thẻ này" : "Lưu thẻ này"}
                    >
                      <Star size={15} className={isCurrentStarred ? "fill-current" : ""} />
                      <span>{isCurrentStarred ? "Đã lưu" : "Lưu thẻ"}</span>
                    </button>
                  </div>

                  {card.options?.length ? (
                    // A-D question: the options sit under the prompt on the front, so the back's "B. ..." makes sense.
                    <span className="study-content study-content-question">
                      <span className="study-question-prompt">{card.front}</span>
                      <span className="study-question-options">
                        {card.options.map((option, optionIndex) => (
                          <span key={optionIndex} className="study-question-option">
                            <b>{String.fromCharCode(65 + optionIndex)}.</b> {option}
                          </span>
                        ))}
                      </span>
                    </span>
                  ) : (
                    <span className="study-content">{card.front}</span>
                  )}

                  <div className="study-face-footer">
                    <span className="study-hint">
                      <RotateCcw size={13} aria-hidden="true" />
                      <span>Nhấn thẻ hoặc nhấn Space để lật</span>
                    </span>
                  </div>
                </span>

                {/* Back Face */}
                <span className="study-face study-face-back" aria-hidden={!flipped}>
                  <div className="study-face-header">
                    <span className="study-side-label is-answer">ĐÁP ÁN</span>

                    <button
                      type="button"
                      className={`study-star-btn${isCurrentStarred ? " is-starred" : ""}`}
                      tabIndex={!flipped ? -1 : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(card.id);
                      }}
                      onKeyDown={(e) => {
                        // Enter/Space activate this button; keep them from flipping the card.
                        if (e.key === "Enter" || e.key === " ") e.stopPropagation();
                      }}
                      title={isCurrentStarred ? "Bỏ lưu thẻ này (Phím S)" : "Lưu thẻ để ôn lại (Phím S)"}
                      aria-label={isCurrentStarred ? "Bỏ lưu thẻ này" : "Lưu thẻ này"}
                    >
                      <Star size={15} className={isCurrentStarred ? "fill-current" : ""} />
                      <span>{isCurrentStarred ? "Đã lưu" : "Lưu thẻ"}</span>
                    </button>
                  </div>

                  <span className="study-content study-content-back">{card.back}</span>
                  {card.explanation && <span className="study-explanation">Giải thích: {card.explanation}</span>}

                  <div className="study-face-footer">
                    <span className="study-hint">
                      <RotateCcw size={13} aria-hidden="true" />
                      <span>Nhấn thẻ hoặc nhấn Space để xem lại câu hỏi</span>
                    </span>
                  </div>
                </span>
              </span>
            </div>
          </div>

          {/* Navigation Controls Dock */}
          <nav className="study-navigation" aria-label="Điều hướng thẻ học">
            <button
              type="button"
              className="secondary study-nav-btn"
              disabled={index === 0}
              onClick={() => move(index - 1)}
              title="Thẻ trước (←)"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              <span>Thẻ trước</span>
            </button>

            <button
              type="button"
              className="secondary study-flip-btn"
              onClick={flip}
              title="Lật thẻ (Space)"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>{flipped ? "Xem câu hỏi" : "Lật đáp án"}</span>
            </button>

            <button
              type="button"
              className={`study-nav-btn ${flipped ? "primary" : "secondary"}`}
              onClick={() => move(index + 1)}
              title="Thẻ sau (→)"
            >
              <span>{index === activeCards.length - 1 ? "Hoàn thành" : "Thẻ sau"}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </nav>

          <footer className="study-keyboard-guide muted">
            Phím tắt: ← → chuyển thẻ · Space lật thẻ · S lưu thẻ · R học lại
          </footer>
        </>
      )}

      {save.error && (
        <div className="study-save-error">
          <ErrorBox error={save.error} />
          <button className="secondary button-compact" disabled={save.isPending} onClick={() => syncState({ revealed, starredCards, lastIndex: index })}>
            Thử lưu lại
          </button>
        </div>
      )}
    </section>
  );
}

type SelfTestQuestion = { id: string; prompt: string; options: string[]; correct: number; explanation?: string | null };

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * "Làm thử đề" questions. A question that has its own options (AI, CSV or direct Quiz) is shown with exactly those
 * options A, B, C, D in their order. Only a legacy two-sided card (back only) gets up to three distractors taken from
 * other cards' backs. A question without an answer key cannot be checked and is left out.
 */
function buildSelfTest(cards: Card[]): SelfTestQuestion[] {
  const backs = [...new Set(cards.filter((c) => !c.options).map((c) => c.back.trim()))];
  return cards.flatMap((card) => {
    if (card.options) {
      if (card.correctOption === undefined) return [];
      return [{ id: card.id, prompt: card.front, options: card.options, correct: card.correctOption, explanation: card.explanation }];
    }
    const answer = card.back.trim();
    const distractors = shuffle(backs.filter((back) => back !== answer)).slice(0, 3);
    if (!distractors.length) return [];
    const options = shuffle([answer, ...distractors]);
    return [{ id: card.id, prompt: card.front, options, correct: options.indexOf(answer) }];
  });
}

/** "Bạn không biết?": the question counts as answered (and wrong) and its answer is shown at once. */
const SKIPPED = -1;

/**
 * Self-check scored in the browser and shown to the student only; the result is stored with the student's own
 * practice state, which no teacher route reads.
 */
function SelfTest({ cards, onFinish, onExit }: { cards: Card[]; onFinish: (result: SelfTestResult) => void; onExit: () => void }) {
  const [round, setRound] = useState(0);
  // Frozen per round: saving the result refreshes the resource (and so `cards`), which must not reshuffle the test.
  const [questions, setQuestions] = useState(() => shuffle(buildSelfTest(cards)));
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const correct = questions.filter((q) => answers[q.id] === q.correct).length;
  const letter = (i: number) => String.fromCharCode(65 + i);

  const submit = () => {
    setSubmitted(true);
    onFinish({ correct, total: questions.length, at: new Date().toISOString() });
  };
  const restart = () => {
    setAnswers({});
    setSubmitted(false);
    setRound((n) => n + 1);
    setQuestions(shuffle(buildSelfTest(cards)));
  };

  return (
    <div className="study-completion-card study-selftest">
      <h2>Làm thử đề</h2>
      <p className="completion-summary muted">
        Đề gồm <b>{questions.length}</b> câu trắc nghiệm từ Quiz này. Kết quả chỉ hiển thị cho em, không ghi vào sổ theo dõi của giáo viên.
      </p>
      {submitted && (
        <p className="notice" role="status">
          Em trả lời đúng <b>{correct}/{questions.length}</b> câu ({Math.round((correct / questions.length) * 100)}%).
        </p>
      )}
      {questions.map((q, i) => {
        const chosen = answers[q.id];
        const skipped = chosen === SKIPPED;
        // A question shows its result once the test is submitted, or right away when the student gives up on it.
        const revealed = submitted || skipped;
        return (
          <section key={q.id} className="selftest-card" aria-labelledby={`selftest-q-${round}-${q.id}`}>
            <header className="selftest-card-head">
              <p id={`selftest-q-${round}-${q.id}`} className="selftest-prompt">{q.prompt}</p>
              <span className="selftest-counter">{i + 1}/{questions.length}</span>
            </header>
            <ol className="selftest-option-list" type="A">
              {q.options.map((option, optionIndex) => <li key={optionIndex}>{option}</li>)}
            </ol>

            <p className="selftest-pick-label">Chọn đáp án đúng</p>
            <div className="selftest-answer-grid" role="radiogroup" aria-labelledby={`selftest-q-${round}-${q.id}`}>
              {q.options.map((option, optionIndex) => {
                const state = !revealed
                  ? chosen === optionIndex ? " is-selected" : ""
                  : optionIndex === q.correct ? " is-correct" : chosen === optionIndex ? " is-wrong" : "";
                return (
                  <button
                    key={optionIndex}
                    type="button"
                    role="radio"
                    aria-checked={chosen === optionIndex}
                    className={`selftest-answer${state}`}
                    disabled={revealed}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optionIndex }))}
                  >
                    <span className="selftest-answer-letter">{letter(optionIndex)}</span>
                    <span className="selftest-answer-text">{option}</span>
                  </button>
                );
              })}
            </div>

            {revealed ? (
              <div className="selftest-feedback" role="status">
                <p className={chosen === q.correct ? "selftest-verdict is-correct" : "selftest-verdict is-wrong"}>
                  {chosen === q.correct
                    ? "✓ Đúng"
                    : `${skipped ? "Bỏ qua" : "✗ Sai"} · Đáp án đúng: ${letter(q.correct)}. ${q.options[q.correct]}`}
                </p>
                {q.explanation && <p className="selftest-explanation"><b>Giải thích:</b> {q.explanation}</p>}
              </div>
            ) : (
              <button type="button" className="selftest-skip" onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: SKIPPED }))}>
                Bạn không biết?
              </button>
            )}
          </section>
        );
      })}
      <div className="completion-actions">
        {submitted ? (
          <button type="button" className="primary button-compact" onClick={restart}>
            <RotateCcw size={14} aria-hidden="true" />
            <span>Làm đề mới</span>
          </button>
        ) : (
          <button type="button" className="primary button-compact" disabled={answered < questions.length} onClick={submit}>
            Nộp bài ({answered}/{questions.length})
          </button>
        )}
        <button type="button" className="secondary button-compact" onClick={onExit}>Quay lại học thẻ</button>
      </div>
    </div>
  );
}
