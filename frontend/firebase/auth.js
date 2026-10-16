import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

import { auth } from "./config.js";

const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
    return signInWithPopup(auth, googleProvider);
}

export function logOut() {
    return signOut(auth);
}

export function watchAuthState(callback) {
    return onAuthStateChanged(auth, callback);
}