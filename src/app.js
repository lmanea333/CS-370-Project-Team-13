const signInButton = document.querySelector("#google-sign-in");
const statusMessage = document.querySelector("#status");

signInButton.addEventListener("click", () => {
    statusMessage.textContent =
        "The button works! Google Sign-In will be connected next.";
});