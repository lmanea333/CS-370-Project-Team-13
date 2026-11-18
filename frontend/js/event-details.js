// Event details popup
// Shows everything from the event form + the time in the
// original time zone. Used on the calendar page and the dashboard.

import { auth } from "../firebase/config.js";
import { getEventRepetitions } from "../firebase/repetitions.js";
import { getUserReminders } from "../firebase/reminders.js";
import { getUserCalendars } from "../firebase/calendars.js";
import { deleteEventAndExtras } from "../firebase/events.js";


// ---------- make the popup (only once per page) ----------

const detailsDialog = document.createElement("dialog");
detailsDialog.id = "details-dialog";

// the parts that change get filled in with textContent below
detailsDialog.innerHTML = `
    <div class="dialog-title">
        <h2 id="details-title"></h2>
        <button id="close-details" type="button" aria-label="Close">&times;</button>
    </div>

    <div class="details-inside">

        <div class="time-box">
            <h3>Your time</h3>
            <p id="details-your-date" class="big-date"></p>
            <p id="details-your-time" class="big-time"></p>
            <p id="details-your-zone" class="gray"></p>
        </div>

        <div class="time-box original">
            <h3>Original time</h3>
            <p id="details-original-date" class="big-date"></p>
            <p id="details-original-time" class="big-time"></p>
            <p id="details-original-zone" class="gray"></p>
        </div>

        <table class="details-table">
            <tr><th>Calendar</th><td id="details-calendar"></td></tr>
            <tr id="row-location"><th>Location</th><td id="details-location"></td></tr>
            <tr id="row-link"><th>Meeting link</th><td id="details-link"></td></tr>
            <tr id="row-category"><th>Category</th><td id="details-category"></td></tr>
            <tr><th>Repeats</th><td id="details-repeat"></td></tr>
            <tr><th>Reminder</th><td id="details-reminder"></td></tr>
            <tr id="row-description"><th>Description</th><td id="details-description"></td></tr>
        </table>

        <div class="form-buttons">
            <button id="details-delete" class="btn-red left-button" type="button">Delete</button>
            <button id="details-ok" class="btn-gray" type="button">Close</button>
            <button id="details-edit" class="btn" type="button">Edit</button>
        </div>
    </div>
`;

document.body.appendChild(detailsDialog);

// shortcut so we don't have to type document.getElementById a million times
function $(id) {
    return document.getElementById(id);
}


// ---------- time zone + formatting helpers ----------

function getUserTimeZone() {
    return (
        localStorage.getItem("timeshift-timezone") ||
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );
}

// firebase gives back a Timestamp, so turn it into a normal Date
function toDate(value) {
    if (!value) {
        return null;
    }
    if (value.toDate) {
        return value.toDate();
    }
    return new Date(value);
}

// ex: "Tuesday, November 17, 2026"
function formatDate(date, timeZone) {
    return date.toLocaleDateString("en-US", {
        timeZone: timeZone,
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

// ex: "3:00 PM"
function formatTime(date, timeZone) {
    return date.toLocaleTimeString("en-US", {
        timeZone: timeZone,
        hour: "numeric",
        minute: "2-digit"
    });
}

// ex: "PST" or "GMT+9"
function getShortZoneName(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone,
        timeZoneName: "short"
    }).formatToParts(date);

    const zonePart = parts.find((part) => part.type === "timeZoneName");
    return zonePart ? zonePart.value : "";
}

// ex: "3:00 PM - 4:30 PM PST"
function formatTimeRange(start, end, timeZone) {
    let text = formatTime(start, timeZone);

    if (end) {
        text = text + " - " + formatTime(end, timeZone);
    }

    return text + " " + getShortZoneName(start, timeZone);
}

// ex: "Asia/Tokyo" -> "Asia / Tokyo"
function prettyZoneName(timeZone) {
    return timeZone.replaceAll("_", " ").replaceAll("/", " / ");
}

// if the end time is on a different day (ex: crosses midnight)
// show both dates
function formatDateRange(start, end, timeZone) {
    const startDate = formatDate(start, timeZone);

    if (!end) {
        return startDate;
    }

    const endDate = formatDate(end, timeZone);

    if (startDate === endDate) {
        return startDate;
    }
    return startDate + " to " + endDate;
}


// ---------- labels for the dropdown values ----------

const repeatLabels = {
    daily: "Every day",
    weekly: "Every week",
    monthly: "Every month",
    yearly: "Every year"
};

function reminderLabel(minutes) {
    if (minutes === 60) {
        return "1 hour before";
    }
    if (minutes === 1440) {
        return "1 day before";
    }
    if (minutes % 1440 === 0) {
        return (minutes / 1440) + " days before";
    }
    if (minutes % 60 === 0) {
        return (minutes / 60) + " hours before";
    }
    return minutes + " minutes before";
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}


// ---------- show or hide a row ----------

// only show optional rows if the user actually filled them in
function setRow(rowId, cellId, value) {
    if (value) {
        $(cellId).textContent = value;
        $(rowId).hidden = false;
    } else {
        $(rowId).hidden = true;
    }
}


// ---------- these need extra firebase lookups ----------

async function showCalendarName(calendarId) {
    if (!calendarId || calendarId === "personal") {
        $("details-calendar").textContent = "My Calendar";
        return;
    }

    $("details-calendar").textContent = "...";

    try {
        const calendars = await getUserCalendars(auth.currentUser.uid);
        const match = calendars.find((calendar) => calendar.id === calendarId);

        $("details-calendar").textContent =
            match ? (match.name || match.title || "Calendar") : "Calendar";
    } catch (error) {
        console.error("couldn't load calendar name", error);
        $("details-calendar").textContent = "Calendar";
    }
}

async function showRepeat(event) {
    if (!event.repetitionId) {
        $("details-repeat").textContent = "Does not repeat";
        return;
    }

    $("details-repeat").textContent = "...";

    try {
        const repetitions = await getEventRepetitions(event.id);
        const frequency = repetitions[0] ? repetitions[0].frequency : null;

        $("details-repeat").textContent =
            repeatLabels[frequency] || "Repeats";
    } catch (error) {
        console.error("couldn't load repeat info", error);
        $("details-repeat").textContent = "Repeats";
    }
}

async function showReminder(event) {
    $("details-reminder").textContent = "...";

    try {
        const reminders = await getUserReminders(auth.currentUser.uid);
        const reminder = reminders.find((item) => item.eventId === event.id);

        $("details-reminder").textContent =
            reminder ? reminderLabel(reminder.minutesBefore) : "No reminder";
    } catch (error) {
        console.error("couldn't load reminder", error);
        $("details-reminder").textContent = "No reminder";
    }
}


// ---------- open the popup for one event ----------

// the event that is open right now (Edit and Delete use it)
let currentEvent = null;

export function openEventDetails(event) {
    currentEvent = event;

    const start = toDate(event.startAt);
    const end = toDate(event.endAt);
    const yourZone = getUserTimeZone();
    const originalZone = event.timeZone || "UTC";

    // title + the event color on the side
    $("details-title").textContent = event.title || "(no title)";
    detailsDialog.style.borderLeft = "8px solid " + (event.color || "#5f8a3a");

    // your time
    $("details-your-date").textContent = formatDateRange(start, end, yourZone);
    $("details-your-time").textContent = formatTimeRange(start, end, yourZone);
    $("details-your-zone").textContent = prettyZoneName(yourZone);

    // original time (what the person picked in the form)
    $("details-original-date").textContent = formatDateRange(start, end, originalZone);
    $("details-original-time").textContent = formatTimeRange(start, end, originalZone);

    if (originalZone === yourZone) {
        $("details-original-zone").textContent =
            prettyZoneName(originalZone) + " (same as yours)";
    } else {
        $("details-original-zone").textContent = prettyZoneName(originalZone);
    }

    // the rest of the form
    setRow("row-location", "details-location", event.location);
    setRow("row-category", "details-category",
        event.category ? capitalize(event.category) : "");
    setRow("row-description", "details-description", event.description);

    // meeting link is a real link (only if it starts with http)
    const link = event.meetingLink || "";
    if (link.startsWith("http://") || link.startsWith("https://")) {
        const linkTag = document.createElement("a");
        linkTag.href = link;
        linkTag.target = "_blank";
        linkTag.rel = "noopener";
        linkTag.textContent = link;
        $("details-link").replaceChildren(linkTag);
        $("row-link").hidden = false;
    } else {
        setRow("row-link", "details-link", link);
    }

    detailsDialog.showModal();

    // these load from firebase after the popup is open
    showCalendarName(event.calendarId);
    showRepeat(event);
    showReminder(event);
}


// ---------- closing ----------

function closeEventDetails() {
    detailsDialog.close();
}

$("close-details").addEventListener("click", closeEventDetails);
$("details-ok").addEventListener("click", closeEventDetails);

// clicking the dark background closes it too
detailsDialog.addEventListener("click", (clickEvent) => {
    if (clickEvent.target === detailsDialog) {
        closeEventDetails();
    }
});


// ---------- delete ----------

// also used by the Delete button in the edit form
export async function deleteEventWithConfirm(event) {
    let message = 'Delete "' + event.title + '"? This can\'t be undone.';

    if (event.repetitionId) {
        message = 'Delete "' + event.title + '"? This deletes every repeat of it too.';
    }

    if (!window.confirm(message)) {
        return false;
    }

    try {
        await deleteEventAndExtras(event, auth.currentUser.uid);

        // tells the calendar/dashboard to reload
        window.dispatchEvent(new CustomEvent("timeshift:event-deleted"));
        return true;
    } catch (error) {
        console.error("couldn't delete event", error);
        window.alert("The event could not be deleted. Please try again.");
        return false;
    }
}

$("details-delete").addEventListener("click", async () => {
    const deleted = await deleteEventWithConfirm(currentEvent);

    if (deleted) {
        closeEventDetails();
    }
});


// ---------- edit ----------

$("details-edit").addEventListener("click", () => {
    closeEventDetails();

    // the calendar page has the event form, so open it there
    if (document.getElementById("event-form")) {
        window.dispatchEvent(
            new CustomEvent("timeshift:edit-event", { detail: currentEvent })
        );
    } else {
        // dashboard doesn't have the form, so go to the calendar page
        window.location.href = "./calendar.html?edit=" + currentEvent.id;
    }
});
