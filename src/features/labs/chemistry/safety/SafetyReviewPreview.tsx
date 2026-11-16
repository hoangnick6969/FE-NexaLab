import { FL15_SAFETY_CONFIG as config } from "@nexalab/sim/safety-scenario";
import SafetyExploreLabPage from "./SafetyExploreLabPage";

export default function SafetyReviewPreview() {
  const key = `lab-safety-review-v${config.configVersion}`;
  return <SafetyExploreLabPage labId={config.labId} title={config.title} config={config}
    activity={{ id: key, key, digest: "preview", version: config.configVersion }} />;
}
