import {
    addDoc, 
    collection, 
    deleteDoc, 
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,      
    where
} from "firebase/firestore";

import { db } from "./config.js";

const calendarRef = collection(db, "calendars");

// Return the new document ID so the event form can select this calendar.
export async function createCalendar(calendarData) {
    const newCalendar = await addDoc(calendarRef, {
        ...calendarData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    return newCalendar.id;
}

// The main calendar picker lists calendars the current user owns. Shared calendars are loaded separately.
export async function getUserCalendars(userId) {
    const userCalendarsQuery = query(
        calendarRef,
        where("ownerId", "==", userId)
    );

    // Keep each document ID with its fields so calendar choices can save the right ID.
    const results = await getDocs(userCalendarsQuery);

    return results.docs.map((calendar) => {
        return {
            id: calendar.id,
            ...calendar.data()
        };
    });
}

// Apply the changed fields without replacing the rest of the calendar.
export function updateCalendar(calendarId, changes) {
    const calendar = doc(db, "calendars", calendarId);

    return updateDoc(calendar, {
        ...changes,
        updatedAt: serverTimestamp()
    });
}

// This deletes the calendar document, not its events.
export function removeCalendar(calendarId) {
    const calendar = doc(db, "calendars", calendarId);
    return deleteDoc(calendar);
}
