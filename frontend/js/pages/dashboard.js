import {
    logOut,
    watchAuthState
} from "../../firebase/auth.js";

const greeting = document.querySelector("#user-greeting");
const timeZoneDisplay =
    document.querySelector("#current-timezone");
const eventsList = document.querySelector("#events-list");
const emptyEvents = document.querySelector("#empty-events");
const eventCount = document.querySelector("#event-count");
const eventFilter = document.querySelector("#event-filter");
const newEventButton =
    document.querySelector("#dashboard-new-event");
const signOutButton =
    document.querySelector("#sign-out-button");

const selectedTheme =
    localStorage.getItem("timeshift-theme") ??
    "neutral";

document.documentElement.dataset.theme = selectedTheme;

const userTimeZone =
    Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone;

timeZoneDisplay.textContent = userTimeZone;

function createDate(daysFromToday, hour, minute = 0) {
    const date = new Date();

    date.setDate(
        date.getDate() + daysFromToday
    );

    date.setHours(hour, minute, 0, 0);

    return date;
}

const sampleEvents = [
    {
        id: "sample-1",
        title: "CS 370 Team Meeting",
        startAt: createDate(0, 10),
        endAt: createDate(0, 11),
        location: "Online meeting",
        category: "School",
        color: "#536b5a"
    },
    {
        id: "sample-2",
        title: "Physics Lab",
        startAt: createDate(0, 13, 30),
        endAt: createDate(0, 15),
        location: "Science Hall",
        category: "School",
        color: "#456476"
    },
    {
        id: "sample-3",
        title: "Project Work Session",
        startAt: createDate(1, 9),
        endAt: createDate(1, 10, 30),
        location: "Library",
        category: "Work",
        color: "#675668"
    },
    {
        id: "sample-4",
        title: "Dentist Appointment",
        startAt: createDate(4, 14),
        endAt: createDate(4, 15),
        location: "Downtown Clinic",
        category: "Appointment",
        color: "#795f49"
    }
];

function getDateKey(date) {
    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDateLabel(date) {
    const today = new Date();
    const tomorrow = new Date();

    tomorrow.setDate(today.getDate() + 1);

    if (getDateKey(date) === getDateKey(today)) {
        return "Today";
    }

    if (
        getDateKey(date) ===
        getDateKey(tomorrow)
    ) {
        return "Tomorrow";
    }

    return new Intl.DateTimeFormat(
        "en-US",
        {
            weekday: "long",
            month: "long",
            day: "numeric"
        }
    ).format(date);
}

function formatTime(date) {
    return new Intl.DateTimeFormat(
        "en-US",
        {
            hour: "numeric",
            minute: "2-digit",
            timeZone: userTimeZone
        }
    ).format(date);
}

function getFilteredEvents(filterValue) {
    const now = new Date();

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + 7);

    return sampleEvents
        .filter((event) => {
            if (filterValue === "today") {
                return (
                    getDateKey(event.startAt) ===
                    getDateKey(now)
                );
            }

            if (filterValue === "week") {
                return (
                    event.startAt >= now &&
                    event.startAt <= endOfWeek
                );
            }

            if (filterValue === "all") {
                return true;
            }

            return event.startAt >= now;
        })
        .sort((firstEvent, secondEvent) => {
            return (
                firstEvent.startAt -
                secondEvent.startAt
            );
        });
}

function createEventCard(event) {
    const eventCard =
        document.createElement("button");

    eventCard.className = "event-card";
    eventCard.type = "button";

    const colorBar =
        document.createElement("span");

    colorBar.className = "event-color";
    colorBar.style.backgroundColor = event.color;

    const time =
        document.createElement("span");

    time.className = "event-time";
    time.textContent = formatTime(event.startAt);

    const details =
        document.createElement("span");

    const title =
        document.createElement("p");

    title.className = "event-title";
    title.textContent = event.title;

    const meta =
        document.createElement("p");

    meta.className = "event-meta";

    meta.textContent =
        `${event.category} · ${event.location}`;

    details.append(title, meta);

    const arrow =
        document.createElement("span");

    arrow.className = "event-arrow";
    arrow.textContent = "›";

    eventCard.append(
        colorBar,
        time,
        details,
        arrow
    );

    eventCard.addEventListener("click", () => {
        window.alert(
            `Edit ${event.title} will open here.`
        );
    });

    return eventCard;
}

function renderEvents() {
    eventsList.replaceChildren();

    const filteredEvents =
        getFilteredEvents(eventFilter.value);

    eventCount.textContent =
        `${filteredEvents.length} ` +
        (
            filteredEvents.length === 1
                ? "event"
                : "events"
        );

    emptyEvents.hidden =
        filteredEvents.length !== 0;

    const eventGroups = new Map();

    filteredEvents.forEach((event) => {
        const dateKey = getDateKey(event.startAt);

        if (!eventGroups.has(dateKey)) {
            eventGroups.set(dateKey, []);
        }

        eventGroups.get(dateKey).push(event);
    });

    eventGroups.forEach((events) => {
        const dateGroup =
            document.createElement("section");

        dateGroup.className = "date-group";

        const dateHeading =
            document.createElement("h3");

        dateHeading.className = "date-heading";
        dateHeading.textContent =
            getDateLabel(events[0].startAt);

        dateGroup.appendChild(dateHeading);

        events.forEach((event) => {
            dateGroup.appendChild(
                createEventCard(event)
            );
        });

        eventsList.appendChild(dateGroup);
    });
}

watchAuthState((user) => {
    if (!user) {
        window.location.href = "../index.html";
        return;
    }

    const firstName =
        user.displayName?.split(" ")[0];

    greeting.textContent = firstName
        ? `Your schedule, ${firstName}`
        : "Your schedule";
});

eventFilter.addEventListener(
    "change",
    renderEvents
);

newEventButton.addEventListener(
    "click",
    () => {
        window.alert(
            "The New Event popup will be connected next."
        );
    }
);

signOutButton.addEventListener(
    "click",
    async () => {
        await logOut();
        window.location.href = "../index.html";
    }
);

renderEvents();