import { Sparkles } from "lucide-react";
import { defineText } from "../../i18n";
import type { HighlightedPassage, TextSelectionState } from "./useTextSelection";
import "./TutorChat.css";

const text = defineText({
  vi: { ask: "Hỏi AI về đoạn này" },
  en: { ask: "Ask AI about this" },
});

const BUTTON_WIDTH = 190;
const GAP = 8;

/**
 * Floating button next to a highlight in a lesson (tutor-chat-rules@5). It sits below the selection so the mobile
 * selection menu, which opens above it, does not cover it; it flips above when there is no room below.
 */
export function PassageAskButton({ selection, onAsk }: { selection: TextSelectionState; onAsk: (passage: HighlightedPassage) => void }) {
  const t = text();
  const { rect } = selection;
  const viewportWidth = window.innerWidth;
  const left = Math.min(Math.max(16, (rect.left + rect.right) / 2 - BUTTON_WIDTH / 2), Math.max(16, viewportWidth - BUTTON_WIDTH - 16));
  const below = rect.bottom + GAP + 40 < window.innerHeight;
  const top = below ? rect.bottom + GAP : Math.max(8, rect.top - GAP - 40);
  if (rect.bottom < 0 || rect.top > window.innerHeight) return null;
  return (
    <button
      type="button"
      className="primary passage-ask-button"
      data-testid="passage-ask-button"
      style={{ top, left }}
      // Keep the selection alive: a mousedown on a button would otherwise collapse it before the click.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        onAsk({ text: selection.text, prefix: selection.prefix, suffix: selection.suffix });
        window.getSelection()?.removeAllRanges();
      }}
    >
      <Sparkles size={15} aria-hidden /> {t.ask}
    </button>
  );
}
