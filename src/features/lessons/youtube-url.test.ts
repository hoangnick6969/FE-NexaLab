import assert from "node:assert/strict";
import test from "node:test";
import { isWebPageLink, youtubeVideoId } from "./youtube-url.ts";

test("youtubeVideoId reads watch, short, embed and shorts links", () => {
  assert.equal(youtubeVideoId("https://www.youtube.com/watch?v=mTN7ijVi8GQ"), "mTN7ijVi8GQ");
  assert.equal(youtubeVideoId("https://youtu.be/mTN7ijVi8GQ?t=30"), "mTN7ijVi8GQ");
  assert.equal(youtubeVideoId("https://www.youtube.com/embed/mTN7ijVi8GQ"), "mTN7ijVi8GQ");
  assert.equal(youtubeVideoId("https://m.youtube.com/shorts/mTN7ijVi8GQ"), "mTN7ijVi8GQ");
  assert.equal(youtubeVideoId("https://www.hoc10.vn/bai-giang/khoa-hoc-tu-nhien/lop-6"), null);
  assert.equal(youtubeVideoId("assetv:abc"), null);
  assert.equal(youtubeVideoId(undefined), null);
});

test("isWebPageLink separates publisher pages from playable files and assets", () => {
  assert.equal(isWebPageLink("https://www.hoc10.vn/bai-giang/khoa-hoc-tu-nhien/lop-6"), true);
  assert.equal(isWebPageLink("https://cdn.example.test/lesson.mp4"), false);
  assert.equal(isWebPageLink("https://cdn.example.test/lesson.webm?sig=1"), false);
  assert.equal(isWebPageLink("assetv:abc123"), false);
});
