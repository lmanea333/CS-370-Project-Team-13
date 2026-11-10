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

export async function getUserReminders(userId) {
    const snapshot = await getDocs(
        query(
            remindersCollection,
            where("userId", "==", userId)
        )
    );

    return snapshot.docs.map((reminderDocument) => ({
        id: reminderDocument.id,
        ...reminderDocument.data()
    }));
}

export function updateReminder(reminderId, changes) {
    return updateDoc(doc(db, "reminders", reminderId), {
        ...changes,
        updatedAt: serverTimestamp()
    });
}

export function removeReminder(reminderId) {
    return deleteDoc(doc(db, "reminders", reminderId));
}
