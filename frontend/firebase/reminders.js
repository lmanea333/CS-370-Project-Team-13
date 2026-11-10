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

const remindersCollection = collection(db, "reminders");   //reference to the reminders collection

export async function getUserReminders(userId) {  //gets all reminders for one user
    const remindersQuery = query(
        remindersCollection,
        where("userId", "==", userId)
    );    //only looks for reminders that belong to this user

    const results = await getDocs(remindersQuery);  //runs the search

    return results.docs.map((reminder) => ({   //turns each result into a regular object
        id: reminder.id,     //adds the reminder document id
        ...reminder.data()  //adds the rest of the reminder information
    }));
}

export function updateReminder(reminderId, changes) {    //updates an existing reminder
    const reminderRef = doc(db, "reminders", reminderId);  //finds the reminder using its id

    return updateDoc(reminderRef, {
        ...changes,     //adds the new reminder information
        updatedAt: serverTimestamp()  //records when the reminder was changed
    });
}

export function removeReminder(reminderId) {  //deletes an existing reminder
    const reminderRef = doc(db, "reminders", reminderId);     //finds the reminder using its id

    return deleteDoc(reminderRef);   //removes the reminder from Firestore
}
