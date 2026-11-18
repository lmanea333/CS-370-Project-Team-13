import {
    doc,
    setDoc,
    serverTimestamp
} from "firebase/firestore";

import { db } from "./config.js";

export function saveUserProfile(user) {
    const userReference = doc(db, "users", user.uid);

    return setDoc(
        userReference,
        {
            displayName: user.displayName ?? "",
            email: user.email ?? "",
            photoURL: user.photoURL ?? "",
            lastLoginAt: serverTimestamp()
        },
        {
            merge: true
        }
    );
}