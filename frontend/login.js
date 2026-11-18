// Import Google Sign-In functions
import {
    signInWithGoogle,
    watchAuthState
} from "../../firebase/auth.js";

// Import the function that saves the user to Firestore
import {
    saveUserProfile
} from "../../firebase/users.js";


// --------------------------------------------------
// 1. Get elements from the login HTML
// --------------------------------------------------

const signInButton =
    document.getElementById("google-sign-in");

const statusMessage =
    document.getElementById("status");


// --------------------------------------------------
// 2. Open Google Sign-In
// --------------------------------------------------

async function handleGoogleSignIn() {
    statusMessage.textContent =
        "Opening Google Sign-In...";

    try {
        // Open Google's login popup
        await signInWithGoogle();

        // The authentication watcher below will handle
        // saving the profile and opening the Dashboard.
    } catch (error) {
        console.error(error);

        statusMessage.textContent =
            "Google Sign-In failed. Please try again.";
    }
}


// --------------------------------------------------
// 3. Respond when the login status changes
// --------------------------------------------------

async function handleAuthChange(user) {
    // No user means nobody is signed in
    if (!user) {
        statusMessage.textContent =
            "Please sign in to continue.";

        signInButton.hidden = false;
        return;
    }

    // Hide the login button after successful sign-in
    signInButton.hidden = true;

    // Decide whether to display the name or email
    let userName = user.email;

    if (user.displayName) {
        userName = user.displayName;
    }

    statusMessage.textContent =
        "Signed in as " + userName;

    try {
        // Save or update the user's Firestore profile
        await saveUserProfile(user);

        console.log(
            "Sign-in and profile save successful"
        );

        // Open the Dashboard after the profile is saved
        window.location.replace(
            "./pages/dashboard.html"
        );
    } catch (error) {
        console.error(error);

        statusMessage.textContent =
            "Signed in, but the profile could not be saved.";
    }
}


// --------------------------------------------------
// 4. Start the login page
// --------------------------------------------------

// Open Google Sign-In when the button is clicked
signInButton.addEventListener(
    "click",
    handleGoogleSignIn
);

// Watch for users signing in or signing out
watchAuthState(handleAuthChange);