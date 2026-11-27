import assert from "node:assert/strict";
import test from "node:test";
import { getDashboardEvents } from "../frontend/js/dashboard-events.js";

const zone = "America/Los_Angeles";
const series = {
    id: "practice", title: "Practice", timeZone: zone, repeat: "weekly", repeatCount: 3,
    startAt: new Date("2026-03-01T17:00:00Z"), endAt: new Date("2026-03-01T18:00:00Z")
};

test("The dashboard lists future dates once and keeps whole-series edits linked", () => {
    const now = new Date("2026-03-02T12:00:00Z");
    const dates = getDashboardEvents([series], "upcoming", now, zone);
    assert.deepEqual(dates.map((event) => event.startAt.toISOString()), [
        "2026-03-08T16:00:00.000Z",
        "2026-03-15T16:00:00.000Z"
    ]);
    assert.equal(dates[0].seriesEvent, series);
    assert.equal(series.startAt.toISOString(), "2026-03-01T17:00:00.000Z");
});

test("Today uses the selected timezone and This week stays in its date range", () => {
    const now = new Date("2026-03-09T01:00:00Z");
    const dates = getDashboardEvents([series], "today", now, zone);
    assert.deepEqual(dates.map((event) => event.startAt.toISOString()), ["2026-03-08T16:00:00.000Z"]);
    assert.deepEqual(getDashboardEvents([series], "week", now, zone).map((event) => event.startAt.toISOString()), [
        "2026-03-15T16:00:00.000Z"
    ]);
});

test("The original first date and later non-repeating events remain visible", () => {
    const now = new Date("2026-03-01T15:00:00Z");
    const oneTime = { id: "far", startAt: new Date("2027-01-01T20:00:00Z") };
    const dates = getDashboardEvents([oneTime, series], "all", now, zone);
    assert.equal(dates.filter((event) => +event.startAt === +series.startAt).length, 1);
    assert.equal(dates.at(-1), oneTime);
});
