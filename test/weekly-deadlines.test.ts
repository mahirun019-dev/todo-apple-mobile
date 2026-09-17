import assert from "node:assert/strict";
import test from "node:test";
import { selectWeeklyDeadlines } from "../src/deadline-selector.ts";

const base = { materials: [], preparations: [] };

test("counts a JST interview event in the current week for every dashboard breakpoint", () => {
  const weekly = selectWeeklyDeadlines({
    ...base,
    events: [{ id: "bft", companyId: "bft-company", type: "interview", title: "interview", startsAt: "2026-09-19T07:27" }],
  }, new Date("2026-09-18T12:00:00+09:00").getTime());

  assert.equal(weekly.length, 1);
  assert.equal(weekly[0]?.key, "event:bft");
});

test("uses the Monday through Sunday JST week boundary", () => {
  const weekly = selectWeeklyDeadlines({
    ...base,
    events: [
      { id: "sunday", type: "interview", title: "Sunday", startsAt: "2026-09-20T23:59" },
      { id: "monday", type: "interview", title: "Monday", startsAt: "2026-09-21T00:00" },
    ],
  }, new Date("2026-09-18T12:00:00+09:00").getTime());

  assert.deepEqual(weekly.map((item) => item.id), ["sunday"]);
});
