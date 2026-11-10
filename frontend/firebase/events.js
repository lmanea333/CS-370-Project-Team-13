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

const eventsCollection = collection(db, "events");   //reference to the events collection

async function createEvent(eventData, options = {}) {  //creates a new event
    const eventRef = doc(eventsCollection);     //makes a reference for the new event
    const batch = writeBatch(db);  //puts all the writes into one batch
    const repetition = options.repetition ?? "none";      //defaults to no repetition
    const reminderMinutes = options.reminderMinutes ?? null;   //defaults to no reminder
    let repetitionId = null;  //stays null if the event does not repeat

    if (repetition !== "none") {    //only runs if repetition was selected
        const repetitionRef = doc(
            collection(db, "repetitions")
        );  //makes a new repetition document

        repetitionId = repetitionRef.id;     //saves its id for the event

        batch.set(repetitionRef, {
            eventId: eventRef.id,   //links it to the event
            frequency: repetition,      //how often it repeats
            interval: 1,
            daysOfWeek: [],
            endType: "never",  //repeats until the user changes it
            endDate: null,
            occurrenceCount: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }

    batch.set(eventRef, {   //adds the event to the batch
        ...eventData,
        repetitionId,      //null if the event does not repeat
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    if (reminderMinutes !== null) {  //only runs if a reminder was selected
        const reminderRef = doc(
            collection(db, "reminders")
        );     //makes a new reminder document

        const startDate = eventData.startAt instanceof Date
            ? eventData.startAt
            : eventData.startAt.toDate();   //makes sure the start time is a date

        const scheduledDate = new Date(
            startDate.getTime() - reminderMinutes * 60 * 1000
        );  //finds when the reminder should be sent

        batch.set(reminderRef, {
            eventId: eventRef.id,     //links the reminder to the event
            occurrenceId: null,
            userId: eventData.createdBy,  //reminder belongs to the event creator
            minutesBefore: reminderMinutes,
            deliveryMethod: "in-app",
            status: "pending",      //reminder has not been sent yet
            scheduledFor: Timestamp.fromDate(scheduledDate),
            sentAt: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }

    await batch.commit();   //saves all the documents together

    return eventRef.id;      //returns the new event id
}

async function getUserEvents(userId) {  //gets events created by one user
    const eventsQuery = query(
        eventsCollection,
        where("createdBy", "==", userId)
    );    //only looks for events from this user

    const results = await getDocs(eventsQuery);  //runs the search

    return results.docs.map((event) => ({
        id: event.id,     //adds the document id
        ...event.data()  //adds the rest of the event data
    }));
}

async function updateEvent(eventId, changes) {    //updates an event
    const eventRef = doc(db, "events", eventId);  //finds the event by its id

    await updateDoc(eventRef, {
        ...changes,
        updatedAt: serverTimestamp()     //saves the time of the update
    });
}

async function removeEvent(eventId) {  //deletes an event
    const eventRef = doc(db, "events", eventId);      //finds the event by its id

    await deleteDoc(eventRef);   //removes it from Firestore
}

export {
    createEvent,
    getUserEvents,
    updateEvent,
    removeEvent
};
