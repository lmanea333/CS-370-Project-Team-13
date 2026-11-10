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

export async function getEventRepetitions(eventId) {
    const snapshot = await getDocs(
        query(
            repetitionsCollection,
            where("eventId", "==", eventId)
        )
    );

    return snapshot.docs.map((repetitionDocument) => ({
        id: repetitionDocument.id,
        ...repetitionDocument.data()
    }));
}

export function updateRepetition(repetitionId, changes) {
    return updateDoc(doc(db, "repetitions", repetitionId), {
        ...changes,
        updatedAt: serverTimestamp()
    });
}

export function removeRepetition(repetitionId) {
    return deleteDoc(doc(db, "repetitions", repetitionId));
}
