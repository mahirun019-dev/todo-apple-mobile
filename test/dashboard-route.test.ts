import assert from "node:assert/strict";
import test from "node:test";
import { dashboardCanonicalHref } from "../src/route.ts";

test("legacy dashboard query canonicalizes to the base path", () => {
  assert.equal(
    dashboardCanonicalHref("https://example.test/todo-apple-mobile/?view=dashboard"),
    "/todo-apple-mobile/",
  );
});

test("the Yami dashboard canonicalizes to the official path without a dashboard query", () => {
  assert.equal(
    dashboardCanonicalHref("https://mahirun019-dev.github.io/yami/?view=dashboard"),
    "/yami/",
  );
});

test("dashboard route filters are removed while unrelated query and hash remain", () => {
  assert.equal(
    dashboardCanonicalHref("https://example.test/todo-apple-mobile/?view=dashboard&filter=old&company=123&src=bookmark#top"),
    "/todo-apple-mobile/?src=bookmark#top",
  );
});

test("non-dashboard routes are not rewritten", () => {
  assert.equal(
    dashboardCanonicalHref("https://example.test/todo-apple-mobile/?view=companies"),
    null,
  );
});
