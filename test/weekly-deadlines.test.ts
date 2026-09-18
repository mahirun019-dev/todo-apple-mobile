import assert from "node:assert/strict";
import test from "node:test";
import { selectWeeklyDeadlines } from "../src/deadline-selector.ts";
import { getDeadlineUrgency } from "../src/deadline-selector.ts";
import { compareCompanyStageToEvent, progressionStageForEvent, shouldOfferInterviewStageSync } from "../src/interview-stage.ts";

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

test("treats tomorrow's deadline as warning, not overdue", () => {
  assert.equal(
    getDeadlineUrgency("2026-09-19T07:27", new Date("2026-09-18T08:00:00+09:00").getTime()),
    "warning",
  );
});

test("offers only forward interview-stage synchronization", () => {
  assert.equal(shouldOfferInterviewStageSync("saved", "first_interview"), true);
  assert.equal(shouldOfferInterviewStageSync("first_interview", "second_interview"), true);
  assert.equal(shouldOfferInterviewStageSync("second_interview", "second_interview"), false);
  assert.equal(shouldOfferInterviewStageSync("final_interview", "first_interview"), false);
  assert.equal(shouldOfferInterviewStageSync("offer", "final_interview"), false);
  assert.equal(shouldOfferInterviewStageSync("rejected", "first_interview"), false);
  assert.equal(shouldOfferInterviewStageSync("withdrawn", "first_interview"), false);
});

test("maps comparable schedule types to progression stages", () => {
  assert.equal(progressionStageForEvent("briefing"), "briefing");
  assert.equal(progressionStageForEvent("es"), "es_submitted");
  assert.equal(progressionStageForEvent("web_test"), "web_test");
  assert.equal(progressionStageForEvent("interview", "second_interview"), "second_interview");
  assert.equal(progressionStageForEvent("research"), undefined);
  assert.equal(progressionStageForEvent("resume"), undefined);
});

test("checks backward and terminal event progression without changing the company stage", () => {
  assert.equal(compareCompanyStageToEvent("first_interview", "briefing").kind, "backward");
  assert.equal(compareCompanyStageToEvent("first_interview", "interview", "first_interview").kind, "same");
  assert.equal(compareCompanyStageToEvent("first_interview", "interview", "second_interview").kind, "forward");
  assert.equal(compareCompanyStageToEvent("offer", "briefing").kind, "terminal");
  assert.equal(compareCompanyStageToEvent("second_interview", "research").kind, "informational");
});
