import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "firebase/firestore";

import { db } from "./config.js";

export async function saveUserProfile(user) {  //saves a user's profile information
    const userRef = doc(db, "users", user.uid);     //finds the user document using their id
    const profile = await getDoc(userRef);  //checks if the profile already exists

    const userData = {
        displayName: user.displayName ?? "",    //uses an empty name if one is not available
        email: user.email ?? "",  //saves the user's email
        photoURL: user.photoURL ?? "",     //uses an empty value if there is no profile picture
        lastLoginAt: serverTimestamp()  //records the user's most recent login
    };

    if (!profile.exists()) {   //only adds these fields for a new user
        userData.timeZone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;  //gets the user's current time zone

        userData.theme = "system";     //uses the device theme by default
        userData.defaultCalendarId = "personal";  //sets personal as the default calendar
        userData.accountStatus = "active";    //starts the account as active
        userData.createdAt = serverTimestamp();  //records when the account was created
    }

    return setDoc(
        userRef,
        userData,
        {
            merge: true   //keeps fields that are already stored
        }
    );
}

export async function getUserProfile(userId) {    //loads a user's saved profile
    const profile = await getDoc(
        doc(db, "users", userId)
    );  //gets the profile using the user's id

    if (!profile.exists()) {   //checks if a profile was found
        return null;  //returns nothing if the profile does not exist
    }

    return {
        uid: profile.id,     //includes the user's document id
        ...profile.data()  //includes the rest of the profile information
    };
}

export function updateUserSettings(userId, settings) {  //updates the user's settings
    const userRef = doc(db, "users", userId);    //finds the user document

    return setDoc(
        userRef,
        {
            timeZone: settings.timeZone,   //saves the selected time zone
            theme: settings.theme,  //saves the selected theme
            defaultCalendarId: settings.defaultCalendarId,     //saves the default calendar
            updatedAt: serverTimestamp()  //records when the settings were changed
        },
        { merge: true }    //updates these fields without replacing the whole profile
    );
}
