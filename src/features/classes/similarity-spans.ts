/** A matched range in the original response text (UTF-16 code unit offsets, end exclusive), as returned by subsim@1. */
export type SimilaritySpan = { start: number; end: number };
export type SpanSegment = { text: string; marked: boolean };

/**
 * Splits `text` into alternating plain and marked segments from the spans. Spans are clamped to the text, sorted and
 * merged when they touch or overlap, so the segments always concatenate back to the original text. The UI renders
 * each segment as a React text node (a `<mark>` for marked ones), never as HTML.
 */
export function segmentsOf(text: string, spans: SimilaritySpan[]): SpanSegment[] {
  if (!text) return [];
  const clamp = (n: number) => Math.max(0, Math.min(text.length, n));
  const ranges = spans
    .map((span) => ({ start: clamp(span.start), end: clamp(span.end) }))
    .filter((span) => span.end > span.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: SimilaritySpan[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  const segments: SpanSegment[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start), marked: false });
    segments.push({ text: text.slice(range.start, range.end), marked: true });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), marked: false });
  return segments;
}
