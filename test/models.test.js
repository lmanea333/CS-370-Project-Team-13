import test from "node:test";
import assert from "node:assert/strict";

import Calendar from "../frontend/models/Calendar.js";
import Event from "../frontend/models/Event.js";
import Reminder from "../frontend/models/Reminder.js";
import Repetition from "../frontend/models/Repetition.js";
import TimeZone from "../frontend/models/TimeZone.js";
import User from "../frontend/models/User.js";

function firestoreDocument(id, data) {
    return {
        id,
        data: () => data
    };
}

test("models convert Firestore documents into class instances", () => {
    assert.ok(User.fromFirestore(
        firestoreDocument("user-1", { displayName: "Student" })
    ) instanceof User);

    assert.ok(Calendar.fromFirestore(
        firestoreDocument("calendar-1", { ownerId: "user-1" })
    ) instanceof Calendar);

    assert.ok(Event.fromFirestore(
        firestoreDocument("event-1", { title: "Lab" })
    ) instanceof Event);

    assert.ok(Reminder.fromFirestore(
        firestoreDocument("reminder-1", {
            eventId: "event-1",
            userId: "user-1"
        })
    ) instanceof Reminder);

    assert.ok(Repetition.fromFirestore(
        firestoreDocument("repetition-1", { eventId: "event-1" })
    ) instanceof Repetition);
});

test("Event and Repetition protect their array fields from mutation", () => {
    const attendees = ["user-1"];
    const days = ["monday"];
    const event = new Event({ attendeeIds: attendees });
    const repetition = new Repetition({ daysOfWeek: days });

    attendees.push("user-2");
    days.push("tuesday");

    assert.deepEqual(event.attendeeIds, ["user-1"]);
    assert.deepEqual(repetition.daysOfWeek, ["monday"]);
});

test("TimeZone validates and formats IANA time zones", () => {
    const utc = new TimeZone({ timeZoneId: "UTC" });

    assert.equal(utc.isValid(), true);
    assert.equal(TimeZone.isValidTimeZone("Not/A_Time_Zone"), false);
    assert.match(
        utc.formatDateTime(new Date("2026-01-01T12:00:00Z")),
        /2026/
    );
});
