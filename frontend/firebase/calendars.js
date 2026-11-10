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

//add a new calendar and return its generated ID
export async function createCalendar(calendarData) {
    const newCalendar = await addDoc(calendarRef, {
        ...calendarData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    return newCalendar.id;
}

//get all calendars that belong to a user
export async function getUserCalendars(userId) {
    const userCalendarsQuery = query(
        calendarRef,
        where("ownerId", "==", userId)
    );

    const results = await getDocs(userCalendarsQuery);

    return results.docs.map((calendar) => {
        return {
            id: calendar.id,
            ...calendar.data()
        };
    });
}

//update the calendar and record when it was changed
export function updateCalendar(calendarId, changes) {
    const calendar = doc(db, "calendars", calendarId);

    return updateDoc(calendar, {
        ...changes,
        updatedAt: serverTimestamp()
    });
}

//delete a calendar using its ID
export function removeCalendar(calendarId) {
    const calendar = doc(db, "calendars", calendarId);
    return deleteDoc(calendar);
}
