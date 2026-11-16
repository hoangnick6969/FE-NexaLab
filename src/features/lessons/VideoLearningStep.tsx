import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { api, streamMaterial, type StudentLearningStep, type StudentPathway } from "../../lib/api";
import { defineText } from "../../i18n";
import { useActionToast } from "../../components/ActionToasts";
import { YouTubePlayer, isWebPageLink, youtubeVideoId, type PlaybackSample } from "./youtube-player";

const text = defineText({
  vi: {
    loadFailed: "Không tải được video",
    saveFailed: "Chưa lưu được tiến độ",
    region: "Nội dung video",
    preparing: "Đang chuẩn bị video…",
    unsupported: "Trình duyệt không hỗ trợ phát video.",
    openSourcePage: "Mở bài giảng ở trang nguồn",
    failedWithAlt: "Video hiện không phát được. Bạn vẫn có thể học bằng nội dung thay thế đã xuất bản.",
    failedNoAlt: "Video hiện không phát được. Hãy tải lại trang hoặc báo cho giáo viên.",
    hideTranscript: "Ẩn bản chép lời",
    showTranscript: "Xem bản chép lời",
    hideAlt: "Ẩn nội dung thay thế",
    showAlt: "Xem nội dung thay thế",
    transcript: "Bản chép lời",
    alternative: "Nội dung thay thế",
    finishWithAlt: "Hoàn thành bằng nội dung thay thế",
    saving: "Đang lưu tiến độ…",
    saved: (n: number) => `Đã lưu ${n}%`,
    resumeFrom: (s: number) => `tiếp tục từ ${s} giây`,
    unsaved: (s: number) => `Chưa lưu: ${s} giây`,
    saveAgain: "Thử lưu lại",
    loadErrorBody: "Hãy tải lại video hoặc báo cho giáo viên.",
    progressErrorBody: "Hãy thử lưu lại tiến độ.",
  },
  en: {
    loadFailed: "The video could not be loaded",
    saveFailed: "Progress could not be saved",
    region: "Video content",
    preparing: "Preparing the video…",
    unsupported: "This browser cannot play the video.",
    openSourcePage: "Open the lesson video on its source page",
    failedWithAlt: "The video cannot play right now. You can still learn from the published alternative.",
    failedNoAlt: "The video cannot play right now. Reload the page or tell your teacher.",
    hideTranscript: "Hide transcript",
    showTranscript: "Show transcript",
    hideAlt: "Hide the alternative",
    showAlt: "Show the alternative",
    transcript: "Transcript",
    alternative: "Alternative content",
    finishWithAlt: "Finish with the alternative",
    saving: "Saving progress…",
    saved: (n: number) => `Saved ${n}%`,
    resumeFrom: (s: number) => `resume from ${s} s`,
    unsaved: (s: number) => `Not saved: ${s} s`,
    saveAgain: "Try saving again",
    loadErrorBody: "Reload the video or let your teacher know.",
    progressErrorBody: "Try saving your progress again.",
  },
});
const t = text();

type VideoObservation = {
  positionSeconds: number;
  durationSeconds: number;
  ended: boolean;
};

export function VideoLearningStep({
  lessonId,
  step,
  hideTranscript = false,
  onReconciled,
  progressPath,
}: {
  lessonId: string;
  step: StudentLearningStep;
  hideTranscript?: boolean;
  onReconciled: (pathway: StudentPathway) => void;
  progressPath?: string;
}) {
  const toast = useActionToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const confirmedPositionRef = useRef(step.lastPosition ?? 0);
  const unsentRef = useRef<VideoObservation | null>(null);
  const pendingRef = useRef(false);
  const flushRequestedRef = useRef(false);
  const failedActionRef = useRef<"video" | "fallback" | null>(null);
  // A signed source expires (R2_READ_TTL_SECONDS); on a media error it is re-signed up to twice and playback resumes.
  const signedRef = useRef(false);
  const refreshesRef = useRef(0);
  const resumeRef = useRef<{ at: number; play: boolean } | null>(null);
  // Lesson packs link most videos to YouTube or to a publisher page: neither can play in a <video> element, so YouTube
  // uses the official embedded player and a web page gets a link to its source.
  const youtubeId = youtubeVideoId(step.resource?.url);
  const pageLink = !youtubeId && isWebPageLink(step.resource?.url) ? step.resource!.url! : null;
  const fileSource = Boolean(step.resource?.url) && !youtubeId && !pageLink;
  const [source, setSource] = useState<string | null>(null);
  const [sourceLoading, setSourceLoading] = useState(fileSource);
  const [mediaUnavailable, setMediaUnavailable] = useState(!step.resource?.url || Boolean(pageLink));
  const [showTranscript, setShowTranscript] = useState(false);
  const [showEquivalent, setShowEquivalent] = useState(!step.resource?.url);
  const [localPosition, setLocalPosition] = useState<number>(step.lastPosition ?? 0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    confirmedPositionRef.current = step.lastPosition ?? 0;
    setLocalPosition((current) => Math.max(current, step.lastPosition ?? 0));
  }, [step.lastPosition]);

  useEffect(() => {
    if (!step.resource?.url || youtubeId || pageLink) {
      setSource(null);
      setSourceLoading(false);
      setMediaUnavailable(!youtubeId);
      return;
    }
    let active = true;
    let revoke: () => void = () => undefined;
    setSource(null);
    setSourceLoading(true);
    setMediaUnavailable(false);
    streamMaterial(step.resource.url)
      .then((material) => {
        revoke = material.revoke;
        if (!active) return material.revoke();
        signedRef.current = material.signed;
        refreshesRef.current = 0;
        setSource(material.src);
        setSourceLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setSourceLoading(false);
        setMediaUnavailable(true);
        setSaveError(error instanceof Error ? error.message : t.loadFailed);
        toast({ title: t.loadFailed, description: t.loadErrorBody, tone: "error" });
      });
    return () => {
      active = false;
      revoke();
    };
  }, [step.resource?.url]);

  const sendObservation = async () => {
    if (pendingRef.current || !unsentRef.current) return;
    const observation = unsentRef.current;
    let succeeded = false;
    pendingRef.current = true;
    failedActionRef.current = "video";
    setSaveState("saving");
    setSaveError("");
    try {
      const updated = await api<any>(
        progressPath ?? `/lessons/${lessonId}/steps/${step.id}/progress`,
        "PUT",
        {
          action: observation.ended ? "ended" : "heartbeat",
          positionSeconds: observation.positionSeconds,
          durationSeconds: observation.durationSeconds,
        },
      );
      const confirmed = updated.step.lastPosition ?? observation.positionSeconds;
      confirmedPositionRef.current = Math.max(confirmedPositionRef.current, confirmed);
      if (
        unsentRef.current &&
        unsentRef.current.positionSeconds <= confirmedPositionRef.current &&
        (!unsentRef.current.ended || updated.step.state === "COMPLETED")
      ) unsentRef.current = null;
      failedActionRef.current = null;
      setSaveState("saved");
      onReconciled(updated.pathway ?? updated);
      succeeded = true;
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : t.saveFailed);
      toast({ title: t.saveFailed, description: t.progressErrorBody, tone: "error" });
    } finally {
      pendingRef.current = false;
      if (succeeded && flushRequestedRef.current && unsentRef.current) {
        flushRequestedRef.current = false;
        void sendObservation();
      }
    }
  };

  const observe = (element: PlaybackSample, flush = false, ended = false) => {
    if (!Number.isFinite(element.currentTime) || !Number.isFinite(element.duration) || element.duration < 0)
      return;
    const durationSeconds = Math.min(86400, Math.max(0, Math.floor(element.duration)));
    const positionSeconds = Math.min(durationSeconds, Math.max(0, Math.floor(element.currentTime)));
    const previous = unsentRef.current;
    unsentRef.current = {
      positionSeconds: Math.max(previous?.positionSeconds ?? 0, positionSeconds),
      durationSeconds: Math.max(previous?.durationSeconds ?? 0, durationSeconds, positionSeconds),
      ended: Boolean(previous?.ended || ended),
    };
    setLocalPosition((current) => Math.max(current, positionSeconds));
    const reachedBatch = unsentRef.current.positionSeconds - confirmedPositionRef.current >= 10;
    if (flush || reachedBatch) flushRequestedRef.current = true;
    if ((flush || reachedBatch) && saveState !== "error") void sendObservation();
  };

  const completeFallback = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    failedActionRef.current = "fallback";
    setSaveState("saving");
    setSaveError("");
    try {
      const updated = await api<any>(
        progressPath ?? `/lessons/${lessonId}/steps/${step.id}/progress`,
        "PUT",
        { action: "complete-fallback" },
      );
      unsentRef.current = null;
      flushRequestedRef.current = false;
      confirmedPositionRef.current = updated.step.lastPosition ?? 0;
      setLocalPosition(updated.step.lastPosition ?? 0);
      failedActionRef.current = null;
      setSaveState("saved");
      onReconciled(updated.pathway ?? updated);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : t.saveFailed);
      toast({ title: t.saveFailed, description: t.progressErrorBody, tone: "error" });
    } finally {
      pendingRef.current = false;
    }
  };

  const retry = () => {
    if (failedActionRef.current === "fallback") void completeFallback();
    else void sendObservation();
  };
  const officialPosition = step.lastPosition ?? 0;
  const hasUnsentEvidence = localPosition > officialPosition || Boolean(unsentRef.current?.ended);

  return (
    <section className="video-learning" aria-label={t.region}>
      {sourceLoading && <p className="video-placeholder">{t.preparing}</p>}
      {youtubeId && (
        <YouTubePlayer
          videoId={youtubeId}
          title={step.resource?.title ?? t.region}
          startSeconds={step.lastPosition ?? 0}
          onSample={(sample, flush, ended) => observe(sample, flush, ended)}
          onError={() => setMediaUnavailable(true)}
        />
      )}
      {pageLink && (
        <p className="video-source-link"><a className="secondary" href={pageLink} target="_blank" rel="noopener noreferrer">{t.openSourcePage}</a></p>
      )}
      {source && (
        <video
          ref={videoRef}
          className="video-player"
          controls
          preload="metadata"
          src={source}
          onLoadedMetadata={(event) => {
            const resume = resumeRef.current;
            resumeRef.current = null;
            const resumeAt = resume?.at ?? step.lastPosition ?? 0;
            if (resumeAt > 0 && resumeAt < event.currentTarget.duration)
              event.currentTarget.currentTime = resumeAt;
            if (resume?.play) void event.currentTarget.play().catch(() => undefined);
          }}
          onTimeUpdate={(event) => observe(event.currentTarget)}
          onPause={(event) => observe(event.currentTarget, true)}
          onEnded={(event) => observe(event.currentTarget, true, true)}
          onError={(event) => {
            const url = step.resource?.url;
            if (!signedRef.current || !url || refreshesRef.current >= 2) return setMediaUnavailable(true);
            refreshesRef.current += 1;
            resumeRef.current = { at: event.currentTarget.currentTime, play: !event.currentTarget.paused };
            streamMaterial(url).then((material) => setSource(material.src)).catch(() => setMediaUnavailable(true));
          }}
        >
          {t.unsupported}
        </video>
      )}
      {mediaUnavailable && (
        <p className="video-unavailable" role="status">
          {step.resource?.equivalentText
            ? t.failedWithAlt
            : t.failedNoAlt}
        </p>
      )}
      <div className="video-actions">
        {step.resource?.transcript && !hideTranscript && (
          <button
            type="button"
            className="secondary"
            aria-expanded={showTranscript}
            aria-controls={`video-transcript-${step.id}`}
            onClick={() => setShowTranscript((value) => !value)}
          >
            {showTranscript ? t.hideTranscript : t.showTranscript}
          </button>
        )}
        {step.resource?.equivalentText && (
          <button
            type="button"
            className="secondary"
            aria-expanded={showEquivalent}
            aria-controls={`video-equivalent-${step.id}`}
            onClick={() => setShowEquivalent((value) => !value)}
          >
            {showEquivalent ? t.hideAlt : t.showAlt}
          </button>
        )}
      </div>
      {showTranscript && step.resource?.transcript && !hideTranscript && <div id={`video-transcript-${step.id}`} className="video-transcript"><h5>{t.transcript}</h5><p>{step.resource.transcript}</p></div>}
      {showEquivalent && step.resource?.equivalentText && (
        <div id={`video-equivalent-${step.id}`} className="video-equivalent">
          <h5>{t.alternative}</h5>
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(step.resource.equivalentText) }} />
          {step.state !== "COMPLETED" && (
            <button
              type="button"
              className="primary video-fallback-complete"
              disabled={saveState === "saving"}
              onClick={() => void completeFallback()}
            >
              {t.finishWithAlt}
            </button>
          )}
        </div>
      )}
      <div className="video-save-status" role={saveState === "error" ? "alert" : "status"}>
        {saveState === "saving" && t.saving}
        {saveState === "saved" && t.saved(step.progressValue)}
        {saveState === "idle" && `${t.saved(step.progressValue)}${officialPosition ? `, ${t.resumeFrom(officialPosition)}` : ""}`}
        {hasUnsentEvidence && saveState !== "saving" && saveState !== "error" && `, ${t.unsaved(localPosition)}`}
        {saveState === "error" && (
          <><span>{saveError || t.saveFailed}</span><button type="button" onClick={retry}>{t.saveAgain}</button></>
        )}
      </div>
    </section>
  );
}

