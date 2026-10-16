import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCwU4urnfQZnAUf0I8qBgKLlL-I9k1lhCo",
  authDomain: "timeshift-team13.firebaseapp.com",
  projectId: "timeshift-team13",
  storageBucket: "timeshift-team13.firebasestorage.app",
  messagingSenderId: "434103323473",
  appId: "1:434103323473:web:34f9d8a03d48324e236170"
}; // Paste the fields Firebase provided here.


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);