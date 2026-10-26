import { youtubeVideoId } from "./youtube";

export type VideoIdentity = { id?: string; url: string; providerVideoId?: string };
export type VideoStepIdentity = { resource?: { videoId?: string; providerVideoId?: string } | null };

export function stepForVideo<T extends VideoStepIdentity>(video: VideoIdentity, steps: T[]): T | undefined {
  const providerId = video.providerVideoId || youtubeVideoId(video.url);
  return steps.find((step) => step.resource?.videoId === video.id)
    ?? steps.find((step) => Boolean(providerId) && step.resource?.providerVideoId === providerId)
    ?? (steps.length === 1 ? steps[0] : undefined);
}

export function isCredibleContinuousAdvance(previousPosition: number, position: number, elapsedSeconds: number, playbackRate: number) {
  const advance = position - previousPosition;
  return advance >= -1 && advance <= elapsedSeconds * playbackRate + 3;
}
