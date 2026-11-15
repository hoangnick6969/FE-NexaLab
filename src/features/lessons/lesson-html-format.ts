import katex from "katex";

/**
 * Lessons released by the content tool before canonical_html.normalize_lesson_html ran in render_content
 * are stored as HTML whose paragraphs still hold raw Markdown/LaTeX: `\-` bullets, `■` bullets,
 * pipe tables split across `<p>` or `<br>`, and `$...$` formulas. These helpers repair that HTML on read
 * so stored lessons render without a re-import.
 */

const BREAK = /<br\s*\/?>/i;
const PARAGRAPH_RUN = /(?:<p>(?:(?!<\/?p\b)[\s\S])*<\/p>\s*)+/gi;
// A bare "-" needs a following space so negative numbers ("-5 °C") stay text.
const BULLET = /^(?:\\-\s*|[-–•]\s+|■\s*)(.+)$/u;
const SEPARATOR_CELL = /^:?-{2,}:?$/;

function isTableLine(line: string) {
  return line.startsWith("|") && (line.match(/\|/g) ?? []).length >= 2;
}

function tableCells(line: string) {
  return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function renderTable(rows: string[]) {
  const cells = rows.map(tableCells).filter((row) => !row.every((cell) => SEPARATOR_CELL.test(cell)));
  if (!cells.length) return "";
  const width = Math.max(...cells.map((row) => row.length));
  const padded = cells.map((row) => [...row, ...Array(width - row.length).fill("")]);
  const [head, ...body] = padded;
  const headHtml = head.map((cell) => `<th>${cell}</th>`).join("");
  const bodyHtml = body.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("");
  return `<div class="lesson-table-scroll"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

type LineKind = "table" | "bullet" | "text";
const kindOf = (line: string): LineKind => isTableLine(line) ? "table" : BULLET.test(line) ? "bullet" : "text";

/** Turns runs of consecutive paragraphs into proper tables and lists, keeping ordinary paragraphs as they were. */
function repairParagraphRun(run: string) {
  const paragraphs = [...run.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map((match) => match[1].split(BREAK).map((line) => line.trim()).filter(Boolean));
  const out: string[] = [];
  let pending: { kind: LineKind; lines: string[] } | null = null;
  const flush = () => {
    if (!pending) return;
    if (pending.kind === "table") out.push(renderTable(pending.lines));
    else if (pending.kind === "bullet") out.push(`<ul>${pending.lines.map((line) => `<li>${line.match(BULLET)![1].trim()}</li>`).join("")}</ul>`);
    else out.push(`<p>${pending.lines.join("<br>")}</p>`);
    pending = null;
  };
  for (const lines of paragraphs) {
    // Plain text never continues across a paragraph boundary; tables and lists do.
    if (pending?.kind === "text") flush();
    for (const line of lines) {
      const kind = kindOf(line);
      if (pending && pending.kind !== kind) flush();
      if (!pending) pending = { kind, lines: [] };
      pending.lines.push(line);
    }
  }
  flush();
  return out.join("\n");
}

/** Repairs Markdown left inside stored lesson HTML. Runs before sanitizing; the output is sanitized afterwards. */
export function repairLessonHtml(html: string) {
  return html
    .replace(PARAGRAPH_RUN, (run) => repairParagraphRun(run))
    .replace(/\\-/g, "-")
    .replace(/(^|>|\s)■\s*/gu, "$1• ");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", "#39": "'", apos: "'", nbsp: " " };

function decodeEntities(value: string) {
  return value.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_match, name: string) => ENTITIES[name]);
}

function renderFormula(source: string, displayMode: boolean) {
  const tex = decodeEntities(source.replace(/<br\s*\/?>/gi, " "))
    // OCR sometimes yields the modifier circumflex (U+02C6) where LaTeX needs a caret.
    .replace(/ˆ/g, "^")
    .trim();
  if (!tex) return null;
  return katex.renderToString(tex, { throwOnError: false, displayMode, trust: false, output: "htmlAndMathml" });
}

/**
 * Renders `$$...$$` (display) and `$...$` (inline) formulas in already sanitized HTML. It must run after
 * DOMPurify: KaTeX output is generated from text with trust disabled, and sanitizing it would strip the
 * MathML and inline styles it relies on. Formulas never span tags other than `<br>`.
 */
export function renderLessonMath(html: string) {
  return html
    // `W$_{c}$` from OCR: pull the base letter into the formula.
    .replace(/([A-Za-z])\$(_\{[^$<>]+\})\$/g, "$$$1$2$$")
    .replace(/\$\$((?:(?!\$\$)[^<>]|<br\s*\/?>)+?)\$\$/gi, (match, formula: string) => renderFormula(formula, true) ?? match)
    .replace(/(^|[^\\$])\$([^$<>\n]+?)\$(?!\$)/g, (match, prefix: string, formula: string) => {
      const rendered = renderFormula(formula, false);
      return rendered ? prefix + rendered : match;
    });
}
