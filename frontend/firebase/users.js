import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "firebase/firestore";

import { db } from "./config.js";

export async function saveUserProfile(user) {
    const userReference = doc(db, "users", user.uid);
    const existingProfile = await getDoc(userReference);

    const profileData = {
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        photoURL: user.photoURL ?? "",
        lastLoginAt: serverTimestamp()
    };

    if (!existingProfile.exists()) {
        profileData.timeZone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;
        profileData.theme = "system";
        profileData.defaultCalendarId = "personal";
        profileData.accountStatus = "active";
        profileData.createdAt = serverTimestamp();
    }

    return setDoc(
        userReference,
        profileData,
        {
            merge: true
        }
    );
}

export async function getUserProfile(userId) {
    const profileSnapshot = await getDoc(
        doc(db, "users", userId)
    );

    if (!profileSnapshot.exists()) {
        return null;
    }

    return {
        uid: profileSnapshot.id,
        ...profileSnapshot.data()
    };
}

export function updateUserSettings(userId, settings) {
    const userReference = doc(db, "users", userId);

    return setDoc(
        userReference,
        {
            timeZone: settings.timeZone,
            theme: settings.theme,
            defaultCalendarId: settings.defaultCalendarId,
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );
}
