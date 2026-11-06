import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../../firebase/config.js";
import { getUserEvents } from "../../firebase/events.js";


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


// ---------- Timezone helpers ----------

function getUserTimeZone() {
    return (
        localStorage.getItem("timeshift-timezone") ||
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );
}

function getEventDate(event) {
    if (event.startAt?.toDate) {
        return event.startAt.toDate();
    }

    return new Date(event.startAt);
}

function getEventDateParts(event) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: getUserTimeZone(),
        year: "numeric",
        month: "numeric",
        day: "numeric"
    });

    const parts = formatter.formatToParts(
        getEventDate(event)
    );

    const value = (name) =>
        Number(parts.find((part) => part.type === name).value);

    return {
        year: value("year"),
        month: value("month") - 1,
        day: value("day")
    };
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
    return savedEvents.filter((event) => {
        const eventDate = getEventDateParts(event);

        return (
            eventDate.year === year &&
            eventDate.month === month &&
            eventDate.day === day
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

        // This will later become the Edit Event popup
        window.alert(
            `${event.title}\n${formatEventTime(event)}`
        );
    });

    return eventLabel;
}


// ---------- Draw the calendar ----------

function renderCalendar(month, year) {
    calendarDates.replaceChildren();
    monthYear.textContent = `${months[month]} ${year}`;

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

        savedEvents.sort((firstEvent, secondEvent) => {
            return (
                getEventDate(firstEvent) -
                getEventDate(secondEvent)
            );
        });

        renderCalendar(currentMonth, currentYear);
    } catch (error) {
        console.error("Unable to load events:", error);
    }
}


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


// ---------- Refresh after saving ----------

window.addEventListener("timeshift:event-saved", () => {
    if (auth.currentUser) {
        loadEvents(auth.currentUser.uid);
    }
});


// ---------- Start calendar ----------

renderCalendar(currentMonth, currentYear);

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadEvents(user.uid);
    }
});