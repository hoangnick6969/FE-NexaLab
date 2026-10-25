import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl, youtubeVideoId } from "../src/features/lessons/youtube";

describe("youtube URL mapping", () => {
  it.each([
    ["https://www.youtube.com/watch?v=5bYlFrS-xTw&list=PLDHr_ecbSve4L1v52dd02aQzOwaTj-d74&index=2", "5bYlFrS-xTw"],
    ["https://youtu.be/5bYlFrS-xTw?list=PLDHr_ecbSve4L1v52dd02aQzOwaTj-d74", "5bYlFrS-xTw"],
    ["https://youtube.com/embed/5bYlFrS-xTw?list=abc", "5bYlFrS-xTw"],
  ])("extracts %s", (input, id) => expect(youtubeVideoId(input)).toBe(id));
  it("drops playlist parameters from the embed URL", () => expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=5bYlFrS-xTw&list=abc")).toBe("https://www.youtube.com/embed/5bYlFrS-xTw"));
});
