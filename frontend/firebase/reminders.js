import {
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

const remindersCollection = collection(db, "reminders");

// Only load reminders for this account so edits never touch another user's reminders.
export async function getUserReminders(userId) {
    const remindersQuery = query(
        remindersCollection,
        where("userId", "==", userId)
    );

    const results = await getDocs(remindersQuery);

    return results.docs.map((reminder) => ({
        id: reminder.id,
        ...reminder.data()
    }));
}

// The reminder bell uses this to save a dismissal so the alert stays gone after reloading.
export function updateReminder(reminderId, changes) {
    const reminderRef = doc(db, "reminders", reminderId);

    return updateDoc(reminderRef, {
        ...changes,
        updatedAt: serverTimestamp()
    });
}

// Delete the reminder document rather than updating its status.
export function removeReminder(reminderId) {
    const reminderRef = doc(db, "reminders", reminderId);

    return deleteDoc(reminderRef);
}
