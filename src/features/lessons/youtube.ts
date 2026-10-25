export function youtubeVideoId(input: string): string | null {
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const match = url.pathname.match(/^\/embed\/([\w-]{6,})/);
      return match?.[1] ?? null;
    }
    if (host === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
  } catch { return null; }
  return null;
}

export function youtubeEmbedUrl(input: string): string | null {
  const id = youtubeVideoId(input);
  return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
}
