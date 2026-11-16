import { useEffect, useRef } from "react";
export { isWebPageLink, youtubeVideoId } from "./youtube-url";

type YTPlayer = { getCurrentTime(): number; getDuration(): number; destroy(): void };
type YTNamespace = { Player: new (el: HTMLElement, opts: unknown) => YTPlayer; PlayerState: { PLAYING: number; PAUSED: number; ENDED: number } };
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void } }

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT!); };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => { apiPromise = null; reject(new Error("YouTube player could not load")); };
    document.head.appendChild(script);
  });
  return apiPromise;
}

export type PlaybackSample = { currentTime: number; duration: number };

/**
 * YouTube lesson video through the official IFrame Player API (privacy-enhanced host). Reports the playback position
 * like the native <video> does: every 5 s while playing, and at once on pause and end.
 */
export function YouTubePlayer({ videoId, title, startSeconds, onSample, onError }: {
  videoId: string; title: string; startSeconds: number;
  onSample: (sample: PlaybackSample, flush: boolean, ended: boolean) => void; onError: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const handlers = useRef({ onSample, onError });
  handlers.current = { onSample, onError };
  useEffect(() => {
    let player: YTPlayer | null = null;
    let timer: number | undefined;
    let cancelled = false;
    const sample = (flush: boolean, ended: boolean) => {
      if (!player) return;
      handlers.current.onSample({ currentTime: player.getCurrentTime(), duration: player.getDuration() }, flush, ended);
    };
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      const mount = document.createElement("div");
      hostRef.current.replaceChildren(mount);
      player = new YT.Player(mount, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: Math.max(0, Math.floor(startSeconds)) },
        events: {
          onStateChange: (event: { data: number }) => {
            window.clearInterval(timer);
            if (event.data === YT.PlayerState.PLAYING) timer = window.setInterval(() => sample(false, false), 5000);
            else if (event.data === YT.PlayerState.PAUSED) sample(true, false);
            else if (event.data === YT.PlayerState.ENDED) sample(true, true);
          },
          onError: () => handlers.current.onError(),
        },
      });
    }).catch(() => handlers.current.onError());
    return () => { cancelled = true; window.clearInterval(timer); player?.destroy(); };
  }, [videoId]);
  return <div className="video-player video-player-youtube" ref={hostRef} title={title} />;
}
