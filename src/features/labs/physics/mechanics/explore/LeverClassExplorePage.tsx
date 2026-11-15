/**
 * Class Explore page of the mechanics bench (P0 C3, D1-3.1): the bench with the config derived for one assignment (the
 * load fixed on the bar), its own notebook key, and the student's task panel. No LabRun, no verdict, no progress.
 */
import type { LeverLabConfig } from "@nexalab/sim/mechanics";
import type { ClassExplorePageProps } from "../../../runtime/explore-registry";
import { LEVER_DRAFT_NOTICE } from "./LeverExploreLabPage";
import { LeverExploreBench } from "./LeverExploreBench";

export default function LeverClassExplorePage({ title, config: raw, storageKey, onExit, classSection }: ClassExplorePageProps) {
  const config = raw as LeverLabConfig;
  return <LeverExploreBench
    config={{ ...config, title: title || config.title }}
    storageKey={storageKey}
    onExit={onExit}
    classSection={classSection}
    draftNotice={config.review.status !== "reviewed" ? LEVER_DRAFT_NOTICE : undefined}
  />;
}
