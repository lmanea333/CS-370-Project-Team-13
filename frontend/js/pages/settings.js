import { getTimeZones } from "@vvo/tzdb";
import { logOut, watchAuthState } from "../../firebase/auth.js";

const settingsForm = document.getElementById("settings-form");
const timeZoneSelect = document.getElementById("timezone-select");
const themeSelect = document.getElementById("theme-select");
const defaultCalendarSelect = document.getElementById("default-calendar");
const currentTime = document.getElementById("current-time");
const saveStatus = document.getElementById("save-status");
const signOutButton = document.getElementById("sign-out-button");

const profilePhoto = document.getElementById("profile-photo");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
}

function populateTimeZones() {
    const timeZones = getTimeZones({ includeUtc: true });

    timeZones.forEach((zone) => {
        const option = document.createElement("option");
        option.value = zone.name;

        const location =
            zone.mainCities?.length > 0
                ? zone.mainCities.join(", ")
                : zone.name;

        option.textContent =
            `${location} — ${zone.currentTimeFormat}`;

        timeZoneSelect.appendChild(option);
    });
}

function updateCurrentTime() {
    const selectedZone = timeZoneSelect.value;

    if (!selectedZone) {
        currentTime.textContent = "";
        return;
    }

    try {
        const formattedTime = new Intl.DateTimeFormat("en-US", {
            timeZone: selectedZone,
            dateStyle: "medium",
            timeStyle: "long"
        }).format(new Date());

        currentTime.textContent = `Current time: ${formattedTime}`;
    } catch (error) {
        currentTime.textContent = "Unable to display this time zone.";
    }
}

const savedTheme =
    localStorage.getItem("timeshift-theme") || "neutral";

const savedTimeZone =
    localStorage.getItem("timeshift-timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

const savedCalendar =
    localStorage.getItem("timeshift-default-calendar") || "personal";

populateTimeZones();

themeSelect.value = savedTheme;
timeZoneSelect.value = savedTimeZone;
defaultCalendarSelect.value = savedCalendar;

applyTheme(savedTheme);
updateCurrentTime();

themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);
});

timeZoneSelect.addEventListener("change", updateCurrentTime);

setInterval(updateCurrentTime, 1000);

settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();

    localStorage.setItem("timeshift-theme", themeSelect.value);
    localStorage.setItem("timeshift-timezone", timeZoneSelect.value);
    localStorage.setItem(
        "timeshift-default-calendar",
        defaultCalendarSelect.value
    );

    applyTheme(themeSelect.value);

    saveStatus.textContent = "Settings saved!";
});

watchAuthState((user) => {
    if (!user) {
        window.location.replace("../index.html");
        return;
    }

    profileName.value = user.displayName || "TimeShift User";
    profileEmail.value = user.email || "";

    if (user.photoURL) {
        profilePhoto.src = user.photoURL;
        profilePhoto.alt = `${user.displayName || "User"} profile photo`;
    } else {
        profilePhoto.style.display = "none";
    }
});

signOutButton.addEventListener("click", async () => {
    await logOut();
    window.location.replace("../index.html");
});