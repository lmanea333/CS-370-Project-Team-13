import assert from "node:assert/strict";
import test from "node:test";
import { initializeApp, deleteApp } from "firebase/app";
import {
    collection, connectFirestoreEmulator, deleteDoc, doc, getDocFromServer,
    getDocsFromServer, getFirestore, query, setDoc, updateDoc, where
} from "firebase/firestore";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;

test("Calendar owners can grant and revoke read-only access", {
    skip: !emulator && "Run with the Firestore emulator to test permissions."
}, async (t) => {
    const [host, port] = emulator.split(":");
    const projectId = "demo-timeshift";
    const run = Date.now().toString();
    function client(name, emailVerified = true) {
        const app = initializeApp({ projectId }, `${name}-${emailVerified}-${run}`);
        t.after(() => deleteApp(app));
        const db = getFirestore(app);
        const mockUserToken = name === "signed-out" ? undefined : {
            sub: name, email: `${name}@example.com`, email_verified: emailVerified
        };
        connectFirestoreEmulator(db, host, Number(port), { mockUserToken });
        return db;
    }

    const owner = client("owner");
    const viewer = client("viewer");
    const outsider = client("outsider");
    const unverified = client("viewer", false);
    const signedOut = client("signed-out");
    const calendarId = `school-${run}`;
    const eventId = `class-${run}`;
    const privateCalendarId = `private-${run}`;
    const privateEventId = `private-event-${run}`;
    const repeatId = `weekly-${run}`;
    const email = "viewer@example.com";
    const shareId = `${calendarId}:${email}`;

    const calendar = (db) => doc(db, "calendars", calendarId);
    const event = (db) => doc(db, "events", eventId);
    const repeat = (db) => doc(db, "repetitions", repeatId);
    const share = (db) => doc(db, "calendarShares", shareId);
    const shareData = { calendarId, ownerId: "owner", viewerEmail: email };
    const eventQuery = (db) => query(collection(db, "events"),
        where("calendarId", "==", calendarId),
        where("createdBy", "==", "owner")
    );
    const denied = (promise) => assert.rejects(promise, { code: "permission-denied" });

    await setDoc(calendar(owner), { ownerId: "owner", name: "School" });
    await setDoc(doc(owner, "calendars", privateCalendarId), { ownerId: "owner", name: "Private" });
    await setDoc(doc(owner, "events", privateEventId), {
        createdBy: "owner", calendarId: privateCalendarId, title: "Private event"
    });
    await setDoc(event(owner), {
        createdBy: "owner", calendarId, title: "Class", repetitionId: repeatId
    });
    await setDoc(repeat(owner), { eventId, frequency: "weekly" });
    await denied(getDocFromServer(calendar(viewer)));
    await denied(getDocFromServer(event(viewer)));
    await denied(setDoc(share(viewer), shareData));

    await setDoc(share(owner), shareData);
    await setDoc(share(owner), shareData);
    assert.equal((await getDocFromServer(calendar(viewer))).data().name, "School");
    assert.equal((await getDocsFromServer(eventQuery(viewer))).size, 1);
    assert.equal((await getDocFromServer(repeat(viewer))).data().frequency, "weekly");
    assert.equal((await getDocsFromServer(query(collection(viewer, "calendarShares"),
        where("viewerEmail", "==", email)))).size, 1);
    assert.equal((await getDocsFromServer(query(collection(owner, "calendarShares"),
        where("ownerId", "==", "owner"), where("calendarId", "==", calendarId)))).size, 1);
    await denied(getDocFromServer(doc(viewer, "events", privateEventId)));
    await denied(getDocFromServer(calendar(outsider)));
    await denied(getDocFromServer(event(unverified)));
    await denied(getDocFromServer(event(signedOut)));
    await denied(getDocsFromServer(query(collection(viewer, "events"), where("createdBy", "==", "owner"))));
    await denied(updateDoc(event(viewer), { title: "Changed" }));
    await denied(deleteDoc(event(viewer)));
    await denied(updateDoc(calendar(viewer), { name: "Renamed" }));
    await denied(deleteDoc(share(viewer)));
    await denied(setDoc(doc(viewer, "events", `viewer-event-${run}`), {
        createdBy: "viewer", calendarId, title: "Viewer cannot add to shared calendar"
    }));
    await setDoc(doc(viewer, "events", `personal-event-${run}`), {
        createdBy: "viewer", calendarId: "personal", title: "Personal event still works"
    });

    await deleteDoc(share(owner));
    await denied(getDocFromServer(event(viewer)));
    await denied(getDocsFromServer(eventQuery(viewer)));
    await denied(getDocFromServer(calendar(viewer)));
    assert.equal((await getDocFromServer(event(owner))).data().title, "Class");
});
