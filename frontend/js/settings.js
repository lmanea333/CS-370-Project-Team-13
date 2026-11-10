// Import the worldwide timezone list
import { getTimeZones } from "@vvo/tzdb";

// Import our Google authentication functions
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

// --------------------------------------------------
// 1. Get the elements from settings.html
// --------------------------------------------------

const settingsForm = document.getElementById("settings-form");

const timeZoneSelect = document.getElementById("timezone-select");
const themeSelect = document.getElementById("theme-select");
const defaultCalendarSelect = document.getElementById("default-calendar");

const currentTime = document.getElementById("current-time");
const saveStatus = document.getElementById("save-status");

const profilePhoto = document.getElementById("profile-photo");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");

const signOutButton = document.getElementById("sign-out-button");
let signedInUser = null;


// --------------------------------------------------
// 2. Add worldwide timezones to the dropdown
// --------------------------------------------------

function addTimeZonesToDropdown() {
    const timeZones = getTimeZones({ includeUtc: true });

    for (const zone of timeZones) {
        const option = document.createElement("option");

        // This is the timezone value that will be saved
        option.value = zone.name;

        // Use the timezone name if no city is available
        let location = zone.name;

        // Use city names when the timezone has them
        if (zone.mainCities && zone.mainCities.length > 0) {
            location = zone.mainCities.join(", ");
        }

        // This is what the user sees in the dropdown
        option.textContent =
            location + " — " + zone.currentTimeFormat;

        timeZoneSelect.appendChild(option);
    }
}


// --------------------------------------------------
// 3. Change the page color theme
// --------------------------------------------------



// --------------------------------------------------
// 4. Display the current time
// --------------------------------------------------

function updateCurrentTime() {
    const selectedTimeZone = timeZoneSelect.value;

    // Do not show a time if no timezone is selected
    if (selectedTimeZone === "") {
        currentTime.textContent = "";
        return;
    }

    try {
        const timeOptions = {
            timeZone: selectedTimeZone,
            dateStyle: "medium",
            timeStyle: "long"
        };

        const dateFormatter =
            new Intl.DateTimeFormat("en-US", timeOptions);

        const formattedTime = dateFormatter.format(new Date());

        currentTime.textContent =
            "Current time: " + formattedTime;
    } catch (error) {
        currentTime.textContent =
            "Unable to display this timezone.";
    }
}


// --------------------------------------------------
// 5. Load previously saved settings
// --------------------------------------------------

function loadSavedSettings(profile = null) {
    let savedTheme =
       profile?.theme || getSavedTheme();

    let savedTimeZone =
        profile?.timeZone ||
        localStorage.getItem("timeshift-timezone");

    let savedCalendar =
        profile?.defaultCalendarId ||
        localStorage.getItem("timeshift-default-calendar");

    // Use these default values when nothing was saved
    if (!savedTimeZone) {
        savedTimeZone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    if (!savedCalendar) {
        savedCalendar = "personal";
    }

    // Put the saved choices into the dropdowns
    themeSelect.value = savedTheme;
    timeZoneSelect.value = savedTimeZone;
    defaultCalendarSelect.value = savedCalendar;

    applyTheme(savedTheme);
    saveTheme(savedTheme);
    localStorage.setItem("timeshift-timezone", savedTimeZone);
    localStorage.setItem(
        "timeshift-default-calendar",
        savedCalendar
    );
    updateCurrentTime();
}


// --------------------------------------------------
// 6. Save settings in the browser
// --------------------------------------------------

async function saveSettings(event) {
    // Stop the form from refreshing the page
    event.preventDefault();

    const selectedTheme = themeSelect.value;
    const selectedTimeZone = timeZoneSelect.value;
    const selectedCalendar = defaultCalendarSelect.value;


    localStorage.setItem(
        "timeshift-timezone",
        selectedTimeZone
    );

    localStorage.setItem(
        "timeshift-default-calendar",
        selectedCalendar
    );

    saveTheme(selectedTheme);

    if (!signedInUser) {
        saveStatus.textContent =
            "Please sign in before saving settings.";
        return;
    }

    try {
        saveStatus.textContent = "Saving settings...";

        await updateUserSettings(signedInUser.uid, {
            timeZone: selectedTimeZone,
            theme: selectedTheme,
            defaultCalendarId: selectedCalendar
        });

        saveStatus.textContent = "Settings saved!";
    } catch (error) {
        console.error("Unable to save settings:", error);
        saveStatus.textContent =
            "Settings could not be saved. Please try again.";
    }
}


// --------------------------------------------------
// 7. Display the signed-in Google user
// --------------------------------------------------

async function displayGoogleUser(user) {
    // Send the user to login if they are not signed in
    if (!user) {
        window.location.replace("../index.html");
        return;
    }

    signedInUser = user;

    // Display the user's name
    if (user.displayName) {
        profileName.value = user.displayName;
    } else {
        profileName.value = "TimeShift User";
    }

    // Display the user's email
    if (user.email) {
        profileEmail.value = user.email;
    } else {
        profileEmail.value = "";
    }

    // Display the user's Google profile photo
    if (user.photoURL) {
        profilePhoto.src = user.photoURL;
        profilePhoto.alt =
            profileName.value + " profile photo";

        profilePhoto.style.display = "block";
    } else {
        profilePhoto.style.display = "none";
    }

    try {
        const profile = await getUserProfile(user.uid);

        if (profile) {
            loadSavedSettings(profile);
        }
    } catch (error) {
        console.error("Unable to load saved settings:", error);
        saveStatus.textContent =
            "Cloud settings could not be loaded.";
    }
}


// --------------------------------------------------
// 8. Sign the user out
// --------------------------------------------------

async function signOutUser() {
    await logOut();
    window.location.replace("../index.html");
}


// --------------------------------------------------
// 9. Start the Settings page
// --------------------------------------------------

// Add the timezone options first
addTimeZonesToDropdown();

// Load the user's saved choices
loadSavedSettings();

// Watch for changes made by the user
themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);
});
timeZoneSelect.addEventListener("change", updateCurrentTime);
settingsForm.addEventListener("submit", saveSettings);
signOutButton.addEventListener("click", signOutUser);

// Update the displayed clock every second
setInterval(updateCurrentTime, 1000);

// Get the currently signed-in Google user
watchAuthState(displayGoogleUser);
