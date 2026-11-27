import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    writeBatch,
    where
} from "firebase/firestore";

import { db } from "./config.js";
import { getUserReminders } from "./reminders.js";

const eventsCollection = collection(db, "events");

async function createEvent(eventData, options = {}) {
    const eventRef = doc(eventsCollection);
    // Save the event, its repeat settings, and its reminder together so the app can't save only part of an event.
    const batch = writeBatch(db);
    const repetition = options.repetition ?? "none";
    const reminderMinutes = options.reminderMinutes ?? null;
    let repetitionId = null;

    // Give the repeat settings their own ID so the event can point to them.
    if (repetition !== "none") {
        const repetitionRef = doc(
            collection(db, "repetitions")
        );

        repetitionId = repetitionRef.id;

        batch.set(repetitionRef, {
            eventId: eventRef.id,
            frequency: repetition,
            interval: 1,
            daysOfWeek: [],
            endType: options.repeatCount ? "count" : "never",
            endDate: null,
            occurrenceCount: options.repeatCount ?? null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }

    // Save the event with that repeat ID, or with null for a one-time event.
    batch.set(eventRef, {
        ...eventData,
        repetitionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    // Work backward from the event's start time to find when the in-app reminder should appear.
    if (reminderMinutes !== null) {
        const reminderRef = doc(
            collection(db, "reminders")
        );

        const startDate = eventData.startAt instanceof Date
            ? eventData.startAt
            : eventData.startAt.toDate();

        const scheduledDate = new Date(
            startDate.getTime() - reminderMinutes * 60 * 1000
        );

        batch.set(reminderRef, {
            eventId: eventRef.id,
            occurrenceId: null,
            userId: eventData.createdBy,
            minutesBefore: reminderMinutes,
            deliveryMethod: "in-app",
            status: "pending",
            scheduledFor: Timestamp.fromDate(scheduledDate),
            sentAt: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }

    await batch.commit();

    return eventRef.id;
}

// Load events created by this account. The shared-calendar view loads its events separately.
async function getUserEvents(userId) {
    const eventsQuery = query(
        eventsCollection,
        where("createdBy", "==", userId)
    );

    const results = await getDocs(eventsQuery);

    return results.docs.map((event) => ({
        id: event.id,
        ...event.data()
    }));
}

async function updateEvent(eventId, changes) {
    const eventRef = doc(db, "events", eventId);

    await updateDoc(eventRef, {
        ...changes,
        updatedAt: serverTimestamp()
    });
}

async function removeEvent(eventId) {
    const eventRef = doc(db, "events", eventId);

    await deleteDoc(eventRef);
}

// Update the saved event. Its repeat dates will be generated again from the new settings.
async function editEvent(eventId, changes, options = {}) {
    const eventRef = doc(db, "events", eventId);
    const batch = writeBatch(db);
    const repetition = options.repetition ?? "none";
    const reminderMinutes = options.reminderMinutes ?? null;
    let repetitionId = null;

    // Replace the old schedule when the series is edited. Turning repeats off leaves no schedule.
    if (options.oldRepetitionId) {
        batch.delete(doc(db, "repetitions", options.oldRepetitionId));
    }

    if (repetition !== "none") {
        const repetitionRef = doc(collection(db, "repetitions"));
        repetitionId = repetitionRef.id;

        batch.set(repetitionRef, {
            eventId: eventId,
            frequency: repetition,
            interval: 1,
            daysOfWeek: [],
            endType: options.repeatCount ? "count" : "never",
            endDate: null,
            occurrenceCount: options.repeatCount ?? null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }

    batch.update(eventRef, {
        ...changes,
        repetitionId,
        updatedAt: serverTimestamp()
    });

    // Replace old reminders because the saved start time or reminder setting may have changed.
    const reminders = await getUserReminders(options.userId);
    reminders
        .filter((reminder) => reminder.eventId === eventId)
        .forEach((reminder) => {
            batch.delete(doc(db, "reminders", reminder.id));
        });

    // If reminders are still enabled, schedule a new alert from the updated start time.
    if (reminderMinutes !== null) {
        const reminderRef = doc(collection(db, "reminders"));
        const startDate = changes.startAt instanceof Date
            ? changes.startAt
            : changes.startAt.toDate();

        const scheduledDate = new Date(
            startDate.getTime() - reminderMinutes * 60 * 1000
        );

        batch.set(reminderRef, {
            eventId: eventId,
            occurrenceId: null,
            userId: options.userId,
            minutesBefore: reminderMinutes,
            deliveryMethod: "in-app",
            status: "pending",
            scheduledFor: Timestamp.fromDate(scheduledDate),
            sentAt: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }

    await batch.commit();
}

// Delete the event and its related records together so old reminders don't hang around.
async function deleteEventAndExtras(event, userId) {
    const batch = writeBatch(db);

    if (event.repetitionId) {
        batch.delete(doc(db, "repetitions", event.repetitionId));
    }

    const reminders = await getUserReminders(userId);
    reminders
        .filter((reminder) => reminder.eventId === event.id)
        .forEach((reminder) => {
            batch.delete(doc(db, "reminders", reminder.id));
        });

    batch.delete(doc(db, "events", event.id));

    await batch.commit();
}

export {
    createEvent,
    getUserEvents,
    updateEvent,
    removeEvent,
    editEvent,
    deleteEventAndExtras
};
