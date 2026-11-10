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

const calendarsCollection = collection(db, "calendars");

export async function createCalendar(calendarData) {
    const reference = await addDoc(calendarsCollection, {
        ...calendarData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    return reference.id;
}

export async function getUserCalendars(userId) {
    const snapshot = await getDocs(
        query(
            calendarsCollection,
            where("ownerId", "==", userId)
        )
    );

    return snapshot.docs.map((calendarDocument) => ({
        id: calendarDocument.id,
        ...calendarDocument.data()
    }));
}

export function updateCalendar(calendarId, changes) {
    return updateDoc(doc(db, "calendars", calendarId), {
        ...changes,
        updatedAt: serverTimestamp()
    });
}

export function removeCalendar(calendarId) {
    return deleteDoc(doc(db, "calendars", calendarId));
}
