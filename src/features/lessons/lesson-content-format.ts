export function normalizeLessonMarkdown(value: string) {
  return value
    .replace(/([.!?])\s+(?=(?:Chuẩn bị|Tiến hành|Quan sát|Giải thích|Hướng dẫn giải|Chú ý)\s*:)/gi, "$1\n\n")
    .replace(/\s+(?=(?:Chuẩn bị|Tiến hành|Quan sát|Giải thích|Hướng dẫn giải|Chú ý)\s*:)/gi, "\n\n")
    .replace(/([.:;!?])\s+-\s+(?=\p{Lu})/gu, "$1\n- ");
}

export function stripRepeatedSectionHeading(value: string, heading: string) {
  const body = value.trimStart();
  const cleanHeading = heading.trim();
  const withoutNumber = cleanHeading.replace(/^(?:\d+(?:\.\d+)*[.)]?|[IVXLCDM]+[.)])\s+/i, "");

  for (const candidate of [cleanHeading, withoutNumber]) {
    if (!candidate || body.slice(0, candidate.length).toLocaleLowerCase("vi") !== candidate.toLocaleLowerCase("vi")) continue;
    const next = body[candidate.length];
    if (next && !/[\s:–—-]/u.test(next)) continue;
    if (next && /\s/u.test(next) && !/^\p{Lu}/u.test(body.slice(candidate.length).trimStart())) continue;
    return body.slice(candidate.length).replace(/^[\s:–—-]+/u, "");
  }

  return value;
}

export function groupLabOutcomes(value: string) {
  const outcomes = value.split(/;\s*/).map((outcome) => outcome.trim().replace(/[.!?]$/, "")).filter(Boolean);
  return outcomes.length <= 3 ? outcomes : [...outcomes.slice(0, 2), outcomes.slice(2).join("; ")];
}

export function markMissingFigureReferences(value: string) {
  if (/<img\b|!\[[^\]]*\]\([^)]+\)/i.test(value)) return value;
  return value.replace(/\(?\b(Hình\s+\d+(?:\.\d+)?[a-z]?)\)?/gi, "($1 — chưa có ảnh minh họa)");
}
