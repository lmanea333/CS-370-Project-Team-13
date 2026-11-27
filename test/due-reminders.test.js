import assert from "node:assert/strict";
import test from "node:test";
import { getDueReminders } from "../frontend/js/due-reminders.js";

const start = Date.parse("2026-11-27T20:00:00Z");
const dueAt = start - 10 * 60_000;
const event = { id: "class", startAt: new Date(start), title: "Class" };
const reminder = {
    id: "alert", eventId: "class", status: "pending", deliveryMethod: "in-app",
    scheduledFor: { toMillis: () => dueAt }, minutesBefore: 10
};

test("A reminder appears at its scheduled time, not before", () => {
    assert.deepEqual(getDueReminders([reminder], [event], dueAt - 1), []);
    assert.deepEqual(getDueReminders([reminder, reminder], [event], dueAt), [
        { id: "alert", title: "Class", scheduledFor: dueAt }
    ]);
});

test("Dismissed, rescheduled, and deleted events do not leave stale alerts", () => {
    assert.deepEqual(getDueReminders([{ ...reminder, status: "sent" }], [event], start), []);
    assert.deepEqual(getDueReminders([reminder], [{ ...event, startAt: new Date(start + 60_000) }], start), []);
    assert.deepEqual(getDueReminders([reminder], [], start), []);
});
