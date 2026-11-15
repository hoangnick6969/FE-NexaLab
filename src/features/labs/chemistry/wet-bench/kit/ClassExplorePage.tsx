/**
 * Class Explore page of the K2 wet bench (P0 C3): the bench with the config derived for one assignment, its own notebook
 * key, and the student's task panel. Registered as `loadClassPage` of `k2-wet-bench@1`; no LabRun, no verdict, no progress.
 */
import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";
import type { ClassExplorePageProps } from "../../../runtime/explore-registry";
import { ExploreBench } from "./ExploreBench";

export default function ClassExplorePage({ title, config: raw, storageKey, onExit, classSection }: ClassExplorePageProps) {
  const config = raw as ChemistryLabConfig;
  const draft = config.review.status !== "reviewed";
  return <ExploreBench
    storageKey={storageKey}
    config={{ ...config, title: title || config.title }}
    onExit={onExit}
    classSection={classSection}
    drawerDefaultOpen
    configSource="database"
    draftNotice={draft ? "Dữ liệu hoá học của bài này là bản nháp, đang chờ giáo viên bộ môn duyệt. Màu sắc và số đo là mô phỏng lý tưởng." : undefined}
  />;
}
