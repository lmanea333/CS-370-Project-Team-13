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

const repetitionsCollection = collection(db, "repetitions");   //reference to the repetitions collection

export async function getEventRepetitions(eventId) {  //gets the repetitions for an event
    const repetitionsQuery = query(
        repetitionsCollection,
        where("eventId", "==", eventId)
    );     //only looks for repetitions connected to this event

    const results = await getDocs(repetitionsQuery);  //runs the search

    return results.docs.map((repetition) => ({    //turns each result into a regular object
        id: repetition.id,  //adds the repetition document id
        ...repetition.data()     //adds the rest of the repetition information
    }));
}

export function updateRepetition(repetitionId, changes) {   //updates an existing repetition
    const repetitionRef = doc(db, "repetitions", repetitionId);     //finds the repetition by its id

    return updateDoc(repetitionRef, {
        ...changes,  //adds the new repetition information
        updatedAt: serverTimestamp()     //records when the repetition was changed
    });
}

export function removeRepetition(repetitionId) {  //deletes an existing repetition
    const repetitionRef = doc(db, "repetitions", repetitionId);   //finds the repetition by its id

    return deleteDoc(repetitionRef);     //removes the repetition from Firestore
}
