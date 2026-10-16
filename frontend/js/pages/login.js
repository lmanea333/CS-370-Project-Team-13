import {
    signInWithGoogle,
    watchAuthState
} from "../../firebase/auth.js";

import {
    saveUserProfile
} from "../../firebase/users.js";

const signInButton = document.querySelector("#google-sign-in");
const statusMessage = document.querySelector("#status");

signInButton.addEventListener("click", async () => {
    statusMessage.textContent = "Opening Google Sign-In...";

    try {
        const result = await signInWithGoogle();

        await saveUserProfile(result.user);
    } catch (error) {
        console.error(error);

        statusMessage.textContent =
            "Google Sign-In failed. Please try again.";
    }
});

watchAuthState((user) => {
    if (user) {
        statusMessage.textContent =
            `Signed in as ${user.displayName ?? user.email}`;

        signInButton.hidden = true;
    } else {
        statusMessage.textContent = "Please sign in to continue.";
        signInButton.hidden = false;
    }
});