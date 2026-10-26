export type Annotation = {
  id: string;
  pageNumber: number;
  kind: "HIGHLIGHT" | "UNDERLINE" | "NOTE";
  startOffset: number;
  endOffset: number;
  selectedText: string;
  prefix: string | null;
  suffix: string | null;
  noteText: string | null;
};

export type FallbackMark = { id: string; kind: Annotation["kind"]; left: number; top: number; width: number; height: number };

/** Maps stored character offsets in the page text layer back to a DOM Range. */
export function rangeForOffsets(container: HTMLElement, startOffset: number, endOffset: number): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node = walker.nextNode() as Text | null;
  let cursor = 0;
  let started = false;
  while (node) {
    const end = cursor + node.length;
    if (!started && startOffset >= cursor && startOffset <= end) {
      range.setStart(node, Math.min(node.length, startOffset - cursor));
      started = true;
    }
    if (started && endOffset <= end) {
      range.setEnd(node, Math.min(node.length, endOffset - cursor));
      return range;
    }
    cursor = end;
    node = walker.nextNode() as Text | null;
  }
  return null;
}
