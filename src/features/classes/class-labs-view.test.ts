import test from "node:test";
import assert from "node:assert/strict";
import { isLabWork, showsInView } from "./class-labs-view.ts";

const active = { status: "ACTIVE" } as const;
const archived = { status: "ARCHIVED" } as const;

test("a Guided lab and an Explore lab are lab work; other kinds are not", () => {
  assert.equal(isLabWork({ contentType: "lab" }), true);
  assert.equal(isLabWork({ contentType: "explore_lab" }), true);
  for (const contentType of ["lesson", "test", "written", "exam"] as const) assert.equal(isLabWork({ contentType }), false, contentType);
});

test("the Active tab lists lab work that is active in an active class, whatever kind it is", () => {
  for (const contentType of ["lab", "explore_lab"] as const) {
    assert.equal(showsInView("active", active, { contentType, status: "ACTIVE" }), true, contentType);
    assert.equal(showsInView("active", active, { contentType, status: "ARCHIVED" }), false, contentType);
    assert.equal(showsInView("active", archived, { contentType, status: "ACTIVE" }), false, contentType);
  }
});

test("the Archived tab lists lab work that was archived, or that sits in an archived class", () => {
  for (const contentType of ["lab", "explore_lab"] as const) {
    assert.equal(showsInView("archived", active, { contentType, status: "ARCHIVED" }), true, contentType);
    assert.equal(showsInView("archived", archived, { contentType, status: "ACTIVE" }), true, contentType);
    assert.equal(showsInView("archived", active, { contentType, status: "ACTIVE" }), false, contentType);
  }
});

test("non-lab work never shows on the Class Lab page", () => {
  assert.equal(showsInView("active", active, { contentType: "test", status: "ACTIVE" }), false);
  assert.equal(showsInView("archived", archived, { contentType: "lesson", status: "ARCHIVED" }), false);
});
