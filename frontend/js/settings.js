import { getTimeZones } from "@vvo/tzdb";

import { logOut, watchAuthState } from "../../firebase/auth.js";
import {
    getUserProfile,
    updateUserSettings
} from "../../firebase/users.js";

import {
    getSavedTheme,
    applyTheme,
    saveTheme
} from "../theme.js";

const settingsForm = document.getElementById("settings-form");   //form that holds the settings

const timeZoneSelect = document.getElementById("timezone-select");  //time zone dropdown
const themeSelect = document.getElementById("theme-select");    //theme dropdown
const defaultCalendarSelect = document.getElementById("default-calendar");  //default calendar dropdown

const currentTime = document.getElementById("current-time");   //shows the current time
const saveStatus = document.getElementById("save-status");  //shows save messages

const profilePhoto = document.getElementById("profile-photo");    //user's Google profile picture
const profileName = document.getElementById("profile-name");  //user's display name
const profileEmail = document.getElementById("profile-email");   //user's email address

const signOutButton = document.getElementById("sign-out-button");  //button used to sign out

let signedInUser = null;    //stores the user after they sign in

function addTimeZonesToDropdown() {  //adds all time zones to the dropdown
    const timeZones = getTimeZones({ includeUtc: true });    //also includes UTC in the list

    for (const zone of timeZones) {
        const option = document.createElement("option");  //makes a new dropdown option

        option.value = zone.name;    //value that gets saved

        let location = zone.name;  //uses the time zone name by default

        if (zone.mainCities && zone.mainCities.length > 0) {
            location = zone.mainCities.join(", ");   //uses city names when they are available
        }

        option.textContent =
            location + " — " + zone.currentTimeFormat;  //text shown inside the dropdown

        timeZoneSelect.appendChild(option);    //adds the option to the list
    }
}

function updateCurrentTime() {   //updates the clock for the selected time zone
    const selectedTimeZone = timeZoneSelect.value;

    if (selectedTimeZone === "") {
        currentTime.textContent = "";  //shows nothing if no time zone is selected
        return;
    }

    try {
        const timeOptions = {
            timeZone: selectedTimeZone,
            dateStyle: "medium",
            timeStyle: "long"
        };

        const dateFormatter =
            new Intl.DateTimeFormat("en-US", timeOptions);   //creates the date formatter

        const formattedTime = dateFormatter.format(new Date());  //formats the current time

        currentTime.textContent =
            "Current time: " + formattedTime;
    } catch (error) {
        currentTime.textContent =
            "Unable to display this timezone.";    //shown if the time zone cannot be used
    }
}

function loadSavedSettings(profile = null) {  //loads settings from the profile or browser
    let savedTheme =
        profile?.theme || getSavedTheme();   //uses the cloud theme first

    let savedTimeZone =
        profile?.timeZone ||
        localStorage.getItem("timeshift-timezone");  //checks for a saved browser time zone

    let savedCalendar =
        profile?.defaultCalendarId ||
        localStorage.getItem("timeshift-default-calendar");    //checks for a saved calendar

    if (!savedTimeZone) {
        savedTimeZone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;  //uses the device time zone by default
    }

    if (!savedCalendar) {
        savedCalendar = "personal";    //uses the personal calendar by default
    }

    themeSelect.value = savedTheme;
    timeZoneSelect.value = savedTimeZone;   //puts the saved choices into the dropdowns
    defaultCalendarSelect.value = savedCalendar;

    applyTheme(savedTheme);  //changes the page to the saved theme
    saveTheme(savedTheme);

    localStorage.setItem("timeshift-timezone", savedTimeZone);

    localStorage.setItem(
        "timeshift-default-calendar",
        savedCalendar
    );    //keeps a copy of the calendar choice in the browser

    updateCurrentTime();  //updates the clock using the saved time zone
}

async function saveSettings(event) {    //saves the user's selected settings
    event.preventDefault();  //stops the form from refreshing the page

    const selectedTheme = themeSelect.value;
    const selectedTimeZone = timeZoneSelect.value;
    const selectedCalendar = defaultCalendarSelect.value;

    localStorage.setItem(
        "timeshift-timezone",
        selectedTimeZone
    );   //saves the time zone in the browser

    localStorage.setItem(
        "timeshift-default-calendar",
        selectedCalendar
    );  //saves the default calendar in the browser

    saveTheme(selectedTheme);    //saves and applies the selected theme

    if (!signedInUser) {
        saveStatus.textContent =
            "Please sign in before saving settings.";  //cloud settings need a signed-in user
        return;
    }

    try {
        saveStatus.textContent = "Saving settings...";

        await updateUserSettings(signedInUser.uid, {
            timeZone: selectedTimeZone,
            theme: selectedTheme,
            defaultCalendarId: selectedCalendar
        });   //saves the settings to the user's Firestore profile

        saveStatus.textContent = "Settings saved!";
    } catch (error) {
        console.error("Unable to save settings:", error);

        saveStatus.textContent =
            "Settings could not be saved. Please try again.";    //shown if the save fails
    }
}

async function displayGoogleUser(user) {  //displays the signed-in user's information
    if (!user) {
        window.location.replace("../index.html");   //returns to login if no user is signed in
        return;
    }

    signedInUser = user;  //keeps the user available when settings are saved

    if (user.displayName) {
        profileName.value = user.displayName;
    } else {
        profileName.value = "TimeShift User";    //uses a default name if none is available
    }

    if (user.email) {
        profileEmail.value = user.email;
    } else {
        profileEmail.value = "";  //keeps the field empty if there is no email
    }

    if (user.photoURL) {
        profilePhoto.src = user.photoURL;
        profilePhoto.alt =
            profileName.value + " profile photo";

        profilePhoto.style.display = "block";   //shows the Google profile picture
    } else {
        profilePhoto.style.display = "none";  //hides the image if there is no picture
    }

    try {
        const profile = await getUserProfile(user.uid);    //loads the user's Firestore profile

        if (profile) {
            loadSavedSettings(profile);  //uses the settings stored in Firestore
        }
    } catch (error) {
        console.error("Unable to load saved settings:", error);

        saveStatus.textContent =
            "Cloud settings could not be loaded.";   //browser settings can still be used
    }
}

async function signOutUser() {  //signs out the current user
    await logOut();

    window.location.replace("../index.html");    //returns to the login page
}

addTimeZonesToDropdown();  //loads all time zone options
loadSavedSettings();    //loads the browser settings while the profile loads

themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);  //previews the theme as soon as it is selected
});

timeZoneSelect.addEventListener("change", updateCurrentTime);   //updates the clock after a change
settingsForm.addEventListener("submit", saveSettings);  //saves the selected settings
signOutButton.addEventListener("click", signOutUser);    //signs the user out

setInterval(updateCurrentTime, 1000);  //updates the displayed time every second

watchAuthState(displayGoogleUser);    //loads the signed-in user
