import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "firebase/firestore";

import { db } from "./config.js";

// Use the Firebase account ID so each sign-in updates the same profile document.
export async function saveUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const profile = await getDoc(userRef);

    const userData = {
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        photoURL: user.photoURL ?? "",
        lastLoginAt: serverTimestamp()
    };

    // Only set defaults on the first sign-in. Otherwise we would overwrite the person's saved settings.
    if (!profile.exists()) {
        userData.timeZone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;

        userData.theme = "system";
        userData.defaultCalendarId = "personal";
        userData.accountStatus = "active";
        userData.createdAt = serverTimestamp();
    }

    return setDoc(
        userRef,
        userData,
        // Keep existing preferences when we update the Google profile or last sign-in time.
        {
            merge: true
        }
    );
}

export async function getUserProfile(userId) {
    const profile = await getDoc(
        doc(db, "users", userId)
    );

    // The pages can use their defaults if no profile has been saved yet.
    if (!profile.exists()) {
        return null;
    }

    return {
        uid: profile.id,
        ...profile.data()
    };
}

export function updateUserSettings(userId, settings) {
    const userRef = doc(db, "users", userId);

    return setDoc(
        userRef,
        {
            timeZone: settings.timeZone,
            theme: settings.theme,
            defaultCalendarId: settings.defaultCalendarId,
            updatedAt: serverTimestamp()
        },
        // Merge the settings so the display name and other profile fields stay intact.
        { merge: true }
    );
}
