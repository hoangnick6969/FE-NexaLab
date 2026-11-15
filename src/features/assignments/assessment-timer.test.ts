import test from "node:test";
import assert from "node:assert/strict";
import { clockOffset, formatClock, remainingMs, score10Text } from "./assessment-timer.ts";

test("remaining time follows the server clock, never the local one", () => {
  const received = Date.UTC(2026, 10, 15, 8, 0, 0);
  // Local clock is 90 s behind the server.
  const offset = clockOffset(new Date(received + 90_000), received);
  assert.equal(offset, 90_000);
  const expiresAt = new Date(received + 90_000 + 15 * 60_000);
  assert.equal(remainingMs(expiresAt, offset, received), 15 * 60_000);
  assert.equal(remainingMs(expiresAt, offset, received + 16 * 60_000), 0);
});

test("clock text rounds up and switches to hours", () => {
  assert.equal(formatClock(15 * 60_000), "15:00");
  assert.equal(formatClock(1), "00:01");
  assert.equal(formatClock(0), "00:00");
  assert.equal(formatClock(-5), "00:00");
  assert.equal(formatClock(2 * 3600_000 + 5_000), "2:00:05");
});

test("10-point scores use a decimal comma", () => {
  assert.equal(score10Text(8.8), "8,8");
  assert.equal(score10Text(10), "10,0");
  assert.equal(score10Text(null), "—");
});
