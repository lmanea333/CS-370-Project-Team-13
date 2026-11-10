// Firebase tools needed for event documents
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


// Name of the Firestore collection
const eventsCollection = collection(db, "events");


// Create and save a new event
async function createEvent(eventData, options = {}) {
    const eventReference = doc(eventsCollection);
    const batch = writeBatch(db);
    const repetition = options.repetition ?? "none";
    const reminderMinutes = options.reminderMinutes ?? null;
    let repetitionId = null;

    if (repetition !== "none") {
        const repetitionReference = doc(
            collection(db, "repetitions")
        );
        repetitionId = repetitionReference.id;

        batch.set(repetitionReference, {
            eventId: eventReference.id,
            frequency: repetition,
            interval: 1,
            daysOfWeek: [],
            endType: "never",
            endDate: null,
            occurrenceCount: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }

    batch.set(eventReference, {
        ...eventData,
        repetitionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    if (reminderMinutes !== null) {
        const reminderReference = doc(
            collection(db, "reminders")
        );
        const startDate = eventData.startAt instanceof Date
            ? eventData.startAt
            : eventData.startAt.toDate();
        const scheduledDate = new Date(
            startDate.getTime() - reminderMinutes * 60 * 1000
        );

        batch.set(reminderReference, {
            eventId: eventReference.id,
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

    return eventReference.id;
}


// Load events created by one user
async function getUserEvents(userId) {
    const eventsQuery = query(
        eventsCollection,
        where("createdBy", "==", userId)
    );

    const snapshot = await getDocs(eventsQuery);

    return snapshot.docs.map((eventDocument) => ({
        id: eventDocument.id,
        ...eventDocument.data()
    }));
}


// Update an existing event
async function updateEvent(eventId, changes) {
    const eventReference = doc(db, "events", eventId);

    await updateDoc(eventReference, {
        ...changes,
        updatedAt: serverTimestamp()
    });
}


// Delete an existing event
async function removeEvent(eventId) {
    const eventReference = doc(db, "events", eventId);

    await deleteDoc(eventReference);
}


// Allow other files to use these functions
export {
    createEvent,
    getUserEvents,
    updateEvent,
    removeEvent
};
