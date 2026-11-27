import {
    collection,
    deleteDoc,
    doc,
    getDocFromServer,
    getDocsFromServer,
    onSnapshot,
    query,
    setDoc,
    where
} from "firebase/firestore";
import { db } from "./config.js";

const shares = collection(db, "calendarShares");

// A calendar can only have one share per email address.
function shareRef(calendarId, email) {
    return doc(shares, `${calendarId}:${email}`);
}

// Saving the share gives access; it does not send an invitation email.
export function grantCalendarAccess(calendarId, ownerId, viewerEmail) {
    return setDoc(shareRef(calendarId, viewerEmail), {
        calendarId, ownerId, viewerEmail
    });
}

export function revokeCalendarAccess(calendarId, viewerEmail) {
    return deleteDoc(shareRef(calendarId, viewerEmail));
}

export async function getCalendarViewers(calendarId, ownerId) {
    const results = await getDocsFromServer(query(
        shares,
        where("ownerId", "==", ownerId),
        where("calendarId", "==", calendarId)
    ));
    return results.docs.map((share) => share.data());
}

// Watch for new shares or removals while the Calendar page is open.
export function watchCalendarsSharedWith(email, onChange, onError) {
    return onSnapshot(
        query(shares, where("viewerEmail", "==", email)),
        { includeMetadataChanges: true },
        (results) => {
            // Don't keep showing an old share if the server can't confirm it.
            onChange(results.metadata.fromCache ? [] : results.docs.map((share) => share.data()));
        },
        onError
    );
}

export async function getSharedCalendar(share) {
    const result = await getDocFromServer(doc(db, "calendars", share.calendarId));
    if (!result.exists()) return null;
    const calendar = result.data();
    return calendar.ownerId === share.ownerId ? { ...calendar, id: result.id } : null;
}

export async function getSharedCalendarEvents(calendar) {
    // Query one calendar's events, not all the calendar owner's events.
    const results = await getDocsFromServer(query(
        collection(db, "events"),
        where("calendarId", "==", calendar.id),
        where("createdBy", "==", calendar.ownerId)
    ));
    return Promise.all(results.docs.map(async (result) => {
        const event = { ...result.data(), id: result.id };
        // The repeat settings live in a separate document.
        if (event.repetitionId) {
            const repeat = await getDocFromServer(doc(db, "repetitions", event.repetitionId));
            if (repeat.exists()) {
                event.repeat = repeat.data().frequency;
                event.repeatCount = repeat.data().occurrenceCount;
            }
        }
        return event;
    }));
}
