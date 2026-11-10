// Import the Google authentication functions
import { logOut, watchAuthState } from "../../firebase/auth.js";
import { getUserEvents } from "../../firebase/events.js";
import { getUserProfile } from "../../firebase/users.js";


// --------------------------------------------------
// 1. Get elements from dashboard.html
// --------------------------------------------------

const greeting = document.getElementById("user-greeting");
const timeZoneDisplay = document.getElementById("current-timezone");

const eventsList = document.getElementById("events-list");
const emptyEvents = document.getElementById("empty-events");
const eventCount = document.getElementById("event-count");
const eventFilter = document.getElementById("event-filter");

const newEventButton =
    document.getElementById("dashboard-new-event");

const signOutButton =
    document.getElementById("sign-out-button");


// --------------------------------------------------
// 2. Load the user's saved theme
// --------------------------------------------------




// --------------------------------------------------
// 3. Load the user's saved timezone
// --------------------------------------------------

let userTimeZone =
    localStorage.getItem("timeshift-timezone");

if (!userTimeZone) {
    userTimeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone;
}

timeZoneDisplay.textContent = userTimeZone;


// --------------------------------------------------
// 4. Event list
//
// This is empty until events are loaded from Firestore.
// --------------------------------------------------

let events = [];


// --------------------------------------------------
// 5. Format event dates and times
// --------------------------------------------------

function getDateKey(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: userTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const value = (name) =>
        parts.find((part) => part.type === name).value;

    return `${value("year")}-${value("month")}-${value("day")}`;
}

function getDateLabel(date) {
    const today = new Date();

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (getDateKey(date) === getDateKey(today)) {
        return "Today";
    }

    if (getDateKey(date) === getDateKey(tomorrow)) {
        return "Tomorrow";
    }

    const dateOptions = {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: userTimeZone
    };

    return new Intl.DateTimeFormat(
        "en-US",
        dateOptions
    ).format(date);
}

function formatTime(date) {
    const timeOptions = {
        hour: "numeric",
        minute: "2-digit",
        timeZone: userTimeZone
    };

    return new Intl.DateTimeFormat(
        "en-US",
        timeOptions
    ).format(date);
}


// --------------------------------------------------
// 6. Filter the events
// --------------------------------------------------

function getFilteredEvents() {
    const selectedFilter = eventFilter.value;
    const now = new Date();

    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + 7);

    const filteredEvents = [];

    for (const event of events) {
        let includeEvent = false;

        if (selectedFilter === "today") {
            includeEvent =
                getDateKey(event.startAt) === getDateKey(now);
        } else if (selectedFilter === "week") {
            includeEvent =
                event.startAt >= now &&
                event.startAt <= endOfWeek;
        } else if (selectedFilter === "all") {
            includeEvent = true;
        } else {
            // The default filter shows upcoming events
            includeEvent = event.startAt >= now;
        }

        if (includeEvent) {
            filteredEvents.push(event);
        }
    }

    // Put the earliest events first
    filteredEvents.sort(function (firstEvent, secondEvent) {
        return firstEvent.startAt - secondEvent.startAt;
    });

    return filteredEvents;
}


// --------------------------------------------------
// 7. Create one event card
// --------------------------------------------------

function createEventCard(event) {
    const eventCard = document.createElement("button");
    eventCard.className = "event-card";
    eventCard.type = "button";

    // Colored line beside the event
    const colorBar = document.createElement("span");
    colorBar.className = "event-color";
    colorBar.style.backgroundColor = event.color;

    // Event starting time
    const time = document.createElement("span");
    time.className = "event-time";
    time.textContent = formatTime(event.startAt);

    // Container for the title and details
    const details = document.createElement("span");

    const title = document.createElement("p");
    title.className = "event-title";
    title.textContent = event.title;

    const eventInformation = document.createElement("p");
    eventInformation.className = "event-meta";

    let informationText = event.category;

    if (event.location) {
        informationText =
            informationText + " · " + event.location;
    }

    eventInformation.textContent = informationText;

    details.appendChild(title);
    details.appendChild(eventInformation);

    // Arrow displayed on the right side
    const arrow = document.createElement("span");
    arrow.className = "event-arrow";
    arrow.textContent = "›";

    eventCard.appendChild(colorBar);
    eventCard.appendChild(time);
    eventCard.appendChild(details);
    eventCard.appendChild(arrow);

    // Editing will be connected later
    eventCard.addEventListener("click", function () {
        window.alert(
            "Editing " + event.title + " will be connected later."
        );
    });

    return eventCard;
}


// --------------------------------------------------
// 8. Display all events on the dashboard
// --------------------------------------------------

function displayEvents() {
    // Remove anything currently displayed
    eventsList.replaceChildren();

    const filteredEvents = getFilteredEvents();

    // Display the number of events
    if (filteredEvents.length === 1) {
        eventCount.textContent = "1 event";
    } else {
        eventCount.textContent =
            filteredEvents.length + " events";
    }

    // Show the empty message when there are no events
    if (filteredEvents.length === 0) {
        emptyEvents.hidden = false;
        return;
    }

    emptyEvents.hidden = true;

    let currentDate = "";
    let currentDateGroup = null;

    for (const event of filteredEvents) {
        const eventDate = getDateKey(event.startAt);

        // Create a new date section when the date changes
        if (eventDate !== currentDate) {
            currentDate = eventDate;

            currentDateGroup =
                document.createElement("section");

            currentDateGroup.className = "date-group";

            const dateHeading =
                document.createElement("h3");

            dateHeading.className = "date-heading";
            dateHeading.textContent =
                getDateLabel(event.startAt);

            currentDateGroup.appendChild(dateHeading);
            eventsList.appendChild(currentDateGroup);
        }

        const eventCard = createEventCard(event);
        currentDateGroup.appendChild(eventCard);
    }
}

async function loadDashboardEvents(userId) {
    try {
        const savedEvents = await getUserEvents(userId);

        events = savedEvents.map((event) => ({
            ...event,
            startAt: event.startAt?.toDate
                ? event.startAt.toDate()
                : new Date(event.startAt),
            endAt: event.endAt?.toDate
                ? event.endAt.toDate()
                : event.endAt
                    ? new Date(event.endAt)
                    : null
        }));

        displayEvents();
    } catch (error) {
        console.error("Unable to load dashboard events:", error);
        events = [];
        displayEvents();

        const heading = emptyEvents.querySelector("h3");
        const message = emptyEvents.querySelector("p");

        heading.textContent = "Events could not be loaded";
        message.textContent = "Please refresh the page and try again.";
    }
}


// --------------------------------------------------
// 9. Display the signed-in user's name
// --------------------------------------------------

async function displayUser(user) {
    // Return to login if nobody is signed in
    if (!user) {
        window.location.href = "../index.html";
        return;
    }

    if (user.displayName) {
        const nameParts = user.displayName.split(" ");
        const firstName = nameParts[0];

        greeting.textContent =
            "Your schedule, " + firstName;
    } else {
        greeting.textContent = "Your schedule";
    }

    try {
        const profile = await getUserProfile(user.uid);

        if (profile?.timeZone) {
            userTimeZone = profile.timeZone;
            localStorage.setItem(
                "timeshift-timezone",
                userTimeZone
            );
            timeZoneDisplay.textContent = userTimeZone;
        }
    } catch (error) {
        console.error("Unable to load user settings:", error);
    }

    await loadDashboardEvents(user.uid);
}


// --------------------------------------------------
// 10. New Event button
// --------------------------------------------------

function openNewEventForm() {
    window.location.href = "./calendar.html";
}


// --------------------------------------------------
// 11. Sign the user out
// --------------------------------------------------

async function signOutUser() {
    await logOut();
    window.location.href = "../index.html";
}


// --------------------------------------------------
// 12. Start the dashboard
// --------------------------------------------------

watchAuthState(displayUser);

eventFilter.addEventListener("change", displayEvents);
newEventButton.addEventListener("click", openNewEventForm);
signOutButton.addEventListener("click", signOutUser);

displayEvents();
