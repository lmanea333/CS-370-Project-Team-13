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

const repetitionsCollection = collection(db, "repetitions");

// Firestore stores the settings for a repeating series separately from the event itself.
export async function getEventRepetitions(eventId) {
    // Find the repeat settings by the saved event ID, not by a date shown on the calendar.
    const repetitionsQuery = query(
        repetitionsCollection,
        where("eventId", "==", eventId)
    );

    const results = await getDocs(repetitionsQuery);

    return results.docs.map((repetition) => ({
        id: repetition.id,
        ...repetition.data()
    }));
}

// Change the schedule fields on the existing repeat record.
export function updateRepetition(repetitionId, changes) {
    const repetitionRef = doc(db, "repetitions", repetitionId);

    return updateDoc(repetitionRef, {
        ...changes,
        updatedAt: serverTimestamp()
    });
}

export function removeRepetition(repetitionId) {
    const repetitionRef = doc(db, "repetitions", repetitionId);

    return deleteDoc(repetitionRef);
}
