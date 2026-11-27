import assert from "node:assert/strict";
import test from "node:test";
import { getTimeZones } from "@vvo/tzdb";
import { fromZonedTime } from "date-fns-tz";
import { getTimeZoneOptions } from "../frontend/js/time-zone-options.js";

const options = getTimeZoneOptions();

test("Time-zone labels show abbreviations without changing saved IDs", () => {
    assert.deepEqual(options.map(({ value }) => value), getTimeZones({ includeUtc: true }).map(({ name }) => name));
    assert.match(options.find(({ value }) => value === "America/Los_Angeles").label, /Pacific Time \(PST\/PDT\)/);
    assert.match(options.find(({ value }) => value === "America/Phoenix").label, /Mountain Time \(MST\)/);
});

test("Selecting Pacific Time still uses the right offset in winter and summer", () => {
    const pacific = options.find(({ label }) => label.includes("Pacific Time (PST/PDT)") && label.includes("Los Angeles"));
    assert.equal(fromZonedTime("2026-01-10T09:00:00", pacific.value).toISOString(), "2026-01-10T17:00:00.000Z");
    assert.equal(fromZonedTime("2026-07-10T09:00:00", pacific.value).toISOString(), "2026-07-10T16:00:00.000Z");
});
