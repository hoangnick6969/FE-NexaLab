import { useEffect, useState, type RefObject } from "react";

/** Text the student highlighted inside a container, with a little context on each side and where it sits on screen. */
export type HighlightedPassage = { text: string; prefix: string; suffix: string };
export type TextSelectionState = HighlightedPassage & { rect: { top: number; bottom: number; left: number; right: number } };

export const PASSAGE_MAX = 2000;

const BLOCKS = "p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, figcaption, dd, dt";
function blockAround(node: Node, root: HTMLElement): Node {
  const element = node instanceof Element ? node : node.parentElement;
  const block = element?.closest(BLOCKS);
  return block && root.contains(block) ? block : root;
}

/** Page chrome inside the reading area that is not lesson text: source buttons, notes, Lab cards. */
const NOT_LESSON_TEXT = "button, [role=\"note\"], [data-ask-ignore], .lesson-structured-sources, .lesson-structured-source, .lesson-source-note, .lesson-structured-provenance, .lesson-lab-card";
const BREAKS = `${BLOCKS}, div, section, tr, br`;

/**
 * The lesson text of a range as the student reads it. `Range.toString()` also returns KaTeX's hidden MathML and TeX
 * annotation (H⁺ becomes "H+H^{+}H+") and button labels, and runs blocks together ("acidTên"). Here each formula
 * becomes its TeX source in `$…$` (as stored in the lesson), chrome is dropped and blocks end with a line break.
 */
export function readableText(range: Range) {
  const box = document.createElement("div");
  box.append(range.cloneContents());
  box.querySelectorAll(".katex").forEach((formula) => {
    const tex = formula.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim();
    if (tex) formula.replaceWith(`$${tex}$`);
  });
  box.querySelectorAll(`.katex-mathml, ${NOT_LESSON_TEXT}`).forEach((element) => element.remove());
  box.querySelectorAll(BREAKS).forEach((element) => element.after("\n"));
  return (box.textContent ?? "").replace(/[ \t\u00a0]+/g, " ").replace(/ *\n[\s]*/g, "\n").trim();
}

/**
 * Tracks a non-empty selection inside `container` (lesson passage Q&A, tutor-chat-rules@5). Selections outside the
 * container, empty ones and ones over PASSAGE_MAX characters are ignored. The rect follows scrolling.
 */
export function useTextSelection(container: RefObject<HTMLElement | null>, enabled: boolean) {
  const [selection, setSelection] = useState<TextSelectionState | null>(null);
  useEffect(() => {
    if (!enabled) { setSelection(null); return; }
    let range: Range | null = null;
    const measure = () => {
      if (!range) return;
      const box = range.getBoundingClientRect();
      if (!box.width && !box.height) return;
      setSelection((previous) => previous && { ...previous, rect: { top: box.top, bottom: box.bottom, left: box.left, right: box.right } });
    };
    const capture = () => {
      const root = container.current;
      const selected = window.getSelection();
      if (!root || !selected?.rangeCount || selected.isCollapsed) { range = null; setSelection(null); return; }
      const current = selected.getRangeAt(0);
      if (!root.contains(current.commonAncestorContainer)) { range = null; setSelection(null); return; }
      const text = readableText(current);
      if (!text || text.length > PASSAGE_MAX) { range = null; setSelection(null); return; }
      // Context comes from the paragraph (or list item, heading…) around each end, never from notes or labels nearby.
      const before = current.cloneRange();
      before.selectNodeContents(blockAround(current.startContainer, root));
      before.setEnd(current.startContainer, current.startOffset);
      const after = current.cloneRange();
      after.selectNodeContents(blockAround(current.endContainer, root));
      after.setStart(current.endContainer, current.endOffset);
      range = current.cloneRange();
      const box = current.getBoundingClientRect();
      setSelection({
        text,
        prefix: readableText(before).replace(/\s+/g, " ").slice(-200).trimStart(),
        suffix: readableText(after).replace(/\s+/g, " ").slice(0, 200).trimEnd(),
        rect: { top: box.top, bottom: box.bottom, left: box.left, right: box.right },
      });
    };
    document.addEventListener("selectionchange", capture);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("selectionchange", capture);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [container, enabled]);
  return selection;
}
