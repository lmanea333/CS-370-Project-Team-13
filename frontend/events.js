// Firebase tools needed for event documents
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


// Name of the Firestore collection
const eventsCollection = collection(db, "events");


// Create and save a new event
async function createEvent(eventData) {
    const documentReference = await addDoc(eventsCollection, {
        ...eventData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    return documentReference.id;
}


// Load events created by one user
async function getUserEvents(userId) {
    const eventsQuery = query(
        eventsCollection,
        where("createdBy", "==", userId)
    );

    const snapshot = await getDocs(eventsQuery);

    return snapshot.docs.map((eventDocument) => ({
        id: eventDocument.id,
        ...eventDocument.data()
    }));
}


// Update an existing event
async function updateEvent(eventId, changes) {
    const eventReference = doc(db, "events", eventId);

    await updateDoc(eventReference, {
        ...changes,
        updatedAt: serverTimestamp()
    });
}


// Delete an existing event
async function removeEvent(eventId) {
    const eventReference = doc(db, "events", eventId);

    await deleteDoc(eventReference);
}


// Allow other files to use these functions
export {
    createEvent,
    getUserEvents,
    updateEvent,
    removeEvent
};