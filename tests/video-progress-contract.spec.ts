import { expect, test } from "@playwright/test";
import { isCredibleContinuousAdvance, stepForVideo } from "../src/features/lessons/video-progress";

test("mapped videos resolve to independent stable steps", () => {
  const steps = [
    { id: "step-a", resource: { videoId: "video-a", providerVideoId: "AAA111" } },
    { id: "step-b", resource: { videoId: "video-b", providerVideoId: "BBB222" } },
  ];
  expect(stepForVideo({ id: "video-a", url: "https://youtu.be/AAA111" }, steps)?.id).toBe("step-a");
  expect(stepForVideo({ id: "video-b", url: "https://youtu.be/BBB222" }, steps)?.id).toBe("step-b");
  expect(stepForVideo({ id: "unknown", url: "https://youtu.be/CCC333" }, steps)).toBeUndefined();
});

test("a seek jump is not accepted as continuous playback", () => {
  expect(isCredibleContinuousAdvance(10, 20, 10, 1)).toBe(true);
  expect(isCredibleContinuousAdvance(10, 500, 10, 1)).toBe(false);
  expect(isCredibleContinuousAdvance(30, 10, 1, 1)).toBe(false);
  expect(isCredibleContinuousAdvance(10, 30, 10, 2)).toBe(true);
});
