import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../../firebase/config.js";
import { getUserEvents } from "../../firebase/events.js";
import { openEventDetails } from "../event-details.js";
import { addRepeatInfo, getOccurrencesBetween } from "../repeats.js";


// ---------- Calendar elements ----------

const calendarDates =
    document.querySelector(".calendar-dates");

const monthYear =
    document.getElementById("month-year");

const previousButton =
    document.getElementById("prev-month");

const nextButton =
    document.getElementById("next-month");

const newEventButton =
    document.getElementById("open-event-form");

const eventDateInput =
    document.getElementById("event-date");
// Dropdown used to show all events or one calendar.
const calendarFilter =
    document.getElementById("calendar-filter");


// ---------- Calendar information ----------

const months = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
];

const today = new Date();

let currentMonth = today.getMonth();
let currentYear = today.getFullYear();
let savedEvents = [];

// events for the month on screen (includes repeats)
let monthEvents = [];


// ---------- Timezone helpers ----------

function getUserTimeZone() {
    return (
        localStorage.getItem("timeshift-timezone") ||
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );
}

// Convert a Firestore Timestamp or saved date value
// into a regular JavaScript Date.
function convertStoredDate(value) {
    if (!value) {
        return null;
    }

    if (value.toDate) {
        return value.toDate();
    }

    return new Date(value);
}


// Get the date and time when an event begins.
function getEventDate(event) {
    return convertStoredDate(event.startAt);
}


// Get the date and time when an event ends.
function getEventEndDate(event) {
    return convertStoredDate(event.endAt);
}


// Get a date's year, month, and day in the
// timezone selected by the current user.
function getDateParts(date) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: getUserTimeZone(),
        year: "numeric",
        month: "numeric",
        day: "numeric"
    });

    const parts = formatter.formatToParts(date);

    const value = (name) =>
        Number(
            parts.find((part) => part.type === name).value
        );

    return {
        year: value("year"),
        month: value("month") - 1,
        day: value("day")
    };
}


// Get the calendar date on which an event begins.
function getEventDateParts(event) {
    return getDateParts(getEventDate(event));
}


// Get the final calendar date occupied by an event.
function getEventLastDateParts(event) {
    const start = getEventDate(event);
    const end = getEventEndDate(event);

    // Events without an ending time only appear
    // on their starting date.
    if (!end || end <= start) {
        return getDateParts(start);
    }

    /*
        Treat the ending time as exclusive by checking
        one millisecond before it.

        For example, an event ending exactly at midnight
        does not incorrectly occupy the following day.
    */
    const finalOccupiedMoment =
        new Date(end.getTime() - 1);

    return getDateParts(finalOccupiedMoment);
}


// Turn date parts into a number that can be compared.
// For example, November 25, 2026 becomes 20261125.
function datePartsToNumber(parts) {
    return (
        parts.year * 10000 +
        (parts.month + 1) * 100 +
        parts.day
    );
}


function formatEventTime(event) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: getUserTimeZone(),
        hour: "numeric",
        minute: "2-digit"
    }).format(getEventDate(event));
}


// ---------- Find events for one date ----------

function getEventsForDate(year, month, day) {
    const selectedDateNumber =
        datePartsToNumber({ year, month, day });

    return monthEvents.filter((event) => {
        // Skip events that do not belong to the selected calendar.
if (
    calendarFilter.value !== "all" &&
    event.calendarId !== calendarFilter.value
) {
    return false;
}
        const startingDateNumber =
            datePartsToNumber(
                getEventDateParts(event)
            );

        const endingDateNumber =
            datePartsToNumber(
                getEventLastDateParts(event)
            );

        // Include the event on every calendar date
        // from its starting date through its ending date.
        return (
            selectedDateNumber >= startingDateNumber &&
            selectedDateNumber <= endingDateNumber
        );
    });
}
// ---------- Create one event label ----------

function createEventLabel(event) {
    const eventLabel = document.createElement("button");

    eventLabel.className = "calendar-event";
    eventLabel.type = "button";
    eventLabel.textContent =
        `${formatEventTime(event)} ${event.title}`;

    eventLabel.style.backgroundColor =
        event.color || "var(--accent)";

    eventLabel.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();

        // show the event details popup
        openEventDetails(event);
    });

    return eventLabel;
}


// ---------- Draw the calendar ----------

function renderCalendar(month, year) {
    calendarDates.replaceChildren();
    monthYear.textContent = `${months[month]} ${year}`;

    // get every event (and repeat) that happens this month.
    // 2 extra days on each side because of time zones
    const rangeStart = new Date(year, month, 1 - 2);
    const rangeEnd = new Date(year, month + 1, 1 + 2);

    monthEvents = [];
    savedEvents.forEach((event) => {
        const copies = getOccurrencesBetween(event, rangeStart, rangeEnd);
        monthEvents.push(...copies);
    });

    // earliest first so each day is in order
    monthEvents.sort((first, second) => {
        return getEventDate(first) - getEventDate(second);
    });

    const firstDay =
        new Date(year, month, 1).getDay();

    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    // Blank boxes before the first day
    for (let index = 0; index < firstDay; index++) {
        const blankCell = document.createElement("div");
        blankCell.className = "empty-date";
        calendarDates.appendChild(blankCell);
    }

    // Create every date box
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement("div");
        dayCell.className = "calendar-date";
        dayCell.dataset.day = day;

        const dayNumber = document.createElement("span");
        dayNumber.className = "date-number";
        dayNumber.textContent = day;

        dayCell.appendChild(dayNumber);

        // Highlight today
        if (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            dayCell.classList.add("current-date");
        }

        // Add saved events to this date
        const eventsForDay =
            getEventsForDate(year, month, day);

        eventsForDay.forEach((event) => {
            dayCell.appendChild(
                createEventLabel(event)
            );
        });

        calendarDates.appendChild(dayCell);
    }
}


// ---------- Load Firebase events ----------

async function loadEvents(userId) {
    try {
        savedEvents = await getUserEvents(userId);
        
        // finds out which events repeat (daily, weekly, etc)
        await addRepeatInfo(savedEvents);

        savedEvents.sort((firstEvent, secondEvent) => {
            return (
                getEventDate(firstEvent) -
                getEventDate(secondEvent)
            );
        });

        renderCalendar(currentMonth, currentYear);
        openEditFromLink();
    } catch (error) {
        console.error("Unable to load events:", error);
    }
}
// Redraw the calendar when a different calendar is selected.
calendarFilter.addEventListener("change", () => {
    renderCalendar(currentMonth, currentYear);
});

// ---------- Month buttons ----------

previousButton.addEventListener("click", () => {
    currentMonth--;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }

    renderCalendar(currentMonth, currentYear);
});

nextButton.addEventListener("click", () => {
    currentMonth++;

    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    renderCalendar(currentMonth, currentYear);
});


// ---------- Open the form from a date ----------

calendarDates.addEventListener("click", (event) => {
    const dateCell = event.target.closest(".calendar-date");

    if (!dateCell) {
        return;
    }

    const month = String(currentMonth + 1).padStart(2, "0");
    const day = String(dateCell.dataset.day).padStart(2, "0");

    eventDateInput.value =
        `${currentYear}-${month}-${day}`;

    newEventButton.click();
});


// ---------- Refresh after saving or deleting ----------

function reloadEvents() {
    if (auth.currentUser) {
        loadEvents(auth.currentUser.uid);
    }
}

window.addEventListener("timeshift:event-saved", reloadEvents);
window.addEventListener("timeshift:event-deleted", reloadEvents);


// ---------- Edit link from the dashboard ----------

// the dashboard sends people to calendar.html?edit=EVENT_ID
function openEditFromLink() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("edit");

    if (!eventId) {
        return;
    }

    // take ?edit= off the address so refreshing doesn't reopen it
    window.history.replaceState(null, "", window.location.pathname);

    const event = savedEvents.find((item) => item.id === eventId);

    if (event) {
        // go to that event's month
        const date = getEventDateParts(event);
        currentMonth = date.month;
        currentYear = date.year;
        renderCalendar(currentMonth, currentYear);

        window.dispatchEvent(
            new CustomEvent("timeshift:edit-event", { detail: event })
        );
    }
}


// ---------- Start calendar ----------

renderCalendar(currentMonth, currentYear);

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadEvents(user.uid);
    }
});
