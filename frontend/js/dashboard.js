import { logOut, watchAuthState } from "../../firebase/auth.js";
import { getUserEvents } from "../../firebase/events.js";
import { getUserProfile } from "../../firebase/users.js";

const greeting = document.getElementById("user-greeting");   //shows the user's name
const timeZoneDisplay = document.getElementById("current-timezone");  //shows the current time zone

const eventsList = document.getElementById("events-list");    //holds the event cards
const emptyEvents = document.getElementById("empty-events");  //message shown when there are no events
const eventCount = document.getElementById("event-count");       //shows the number of events
const eventFilter = document.getElementById("event-filter");  //dropdown used to filter events

const newEventButton =
    document.getElementById("dashboard-new-event");    //button for adding an event

const signOutButton =
    document.getElementById("sign-out-button");  //button used to sign out

let userTimeZone =
    localStorage.getItem("timeshift-timezone");   //gets the last saved time zone

if (!userTimeZone) {  //uses the device time zone if one was not saved
    userTimeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone;
}

timeZoneDisplay.textContent = userTimeZone;    //displays the time zone

let events = [];  //stays empty until the events are loaded

function getDateKey(date) {   //turns a date into a simple year-month-day value
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: userTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const value = (name) =>
        parts.find((part) => part.type === name).value;  //finds one part of the date

    return `${value("year")}-${value("month")}-${value("day")}`;    //combines the date parts
}

function getDateLabel(date) {  //creates the heading shown above an event group
    const today = new Date();

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);   //moves the date forward one day

    if (getDateKey(date) === getDateKey(today)) {
        return "Today";  //uses a shorter label for today's events
    }

    if (getDateKey(date) === getDateKey(tomorrow)) {
        return "Tomorrow";    //uses a shorter label for tomorrow's events
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
    ).format(date);  //formats any other date normally
}

function formatTime(date) {    //formats the time shown on an event card
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

function getFilteredEvents() {  //filters the events using the selected option
    const selectedFilter = eventFilter.value;    //gets the dropdown value
    const now = new Date();

    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + 7);  //sets the end of the week filter

    const filteredEvents = [];

    for (const event of events) {
        let includeEvent = false;   //changes to true if the event matches

        if (selectedFilter === "today") {
            includeEvent =
                getDateKey(event.startAt) === getDateKey(now);  //only includes today's events
        } else if (selectedFilter === "week") {
            includeEvent =
                event.startAt >= now &&
                event.startAt <= endOfWeek;    //includes events from the next seven days
        } else if (selectedFilter === "all") {
            includeEvent = true;  //includes past and future events
        } else {
            includeEvent = event.startAt >= now;     //shows upcoming events by default
        }

        if (includeEvent) {
            filteredEvents.push(event);  //adds matching events to the list
        }
    }

    filteredEvents.sort(function (firstEvent, secondEvent) {    //puts the earliest events first
        return firstEvent.startAt - secondEvent.startAt;
    });

    return filteredEvents;
}

function createEventCard(event) {   //creates the card for one event
    const eventCard = document.createElement("button");  //uses a button so the card can be clicked
    eventCard.className = "event-card";
    eventCard.type = "button";

    const colorBar = document.createElement("span");    //makes the colored line beside the event
    colorBar.className = "event-color";
    colorBar.style.backgroundColor = event.color;

    const time = document.createElement("span");  //shows when the event begins
    time.className = "event-time";
    time.textContent = formatTime(event.startAt);

    const details = document.createElement("span");     //holds the event title and other details

    const title = document.createElement("p");
    title.className = "event-title";
    title.textContent = event.title;

    const eventInformation = document.createElement("p");   //shows the category and location
    eventInformation.className = "event-meta";

    let informationText = event.category;

    if (event.location) {
        informationText =
            informationText + " · " + event.location;  //adds the location if one was entered
    }

    eventInformation.textContent = informationText;

    details.appendChild(title);
    details.appendChild(eventInformation);

    const arrow = document.createElement("span");  //adds the arrow on the right side
    arrow.className = "event-arrow";
    arrow.textContent = "›";

    eventCard.appendChild(colorBar);
    eventCard.appendChild(time);
    eventCard.appendChild(details);
    eventCard.appendChild(arrow);

    eventCard.addEventListener("click", function () {    //shows a temporary message when clicked
        window.alert(
            "Editing " + event.title + " will be connected later."
        );
    });

    return eventCard;
}

function displayEvents() {   //displays the current filtered event list
    eventsList.replaceChildren();  //clears the old event cards

    const filteredEvents = getFilteredEvents();    //gets the events that should be shown

    if (filteredEvents.length === 1) {
        eventCount.textContent = "1 event";
    } else {
        eventCount.textContent =
            filteredEvents.length + " events";  //shows the event total
    }

    if (filteredEvents.length === 0) {   //shows the empty message if no events were found
        emptyEvents.hidden = false;
        return;
    }

    emptyEvents.hidden = true;

    let currentDate = "";  //keeps track of the current date section
    let currentDateGroup = null;

    for (const event of filteredEvents) {
        const eventDate = getDateKey(event.startAt);

        if (eventDate !== currentDate) {    //starts a new group when the date changes
            currentDate = eventDate;

            currentDateGroup =
                document.createElement("section");

            currentDateGroup.className = "date-group";

            const dateHeading =
                document.createElement("h3");

            dateHeading.className = "date-heading";
            dateHeading.textContent =
                getDateLabel(event.startAt);  //creates the heading for this date

            currentDateGroup.appendChild(dateHeading);
            eventsList.appendChild(currentDateGroup);
        }

        const eventCard = createEventCard(event);   //creates the event's card
        currentDateGroup.appendChild(eventCard);
    }
}

async function loadDashboardEvents(userId) {  //loads the signed-in user's events
    try {
        const savedEvents = await getUserEvents(userId);   //gets the events from Firestore

        events = savedEvents.map((event) => ({
            ...event,
            startAt: event.startAt?.toDate
                ? event.startAt.toDate()
                : new Date(event.startAt),  //changes the start time into a JavaScript date
            endAt: event.endAt?.toDate
                ? event.endAt.toDate()
                : event.endAt
                    ? new Date(event.endAt)
                    : null  //keeps the ending time null if one does not exist
        }));

        displayEvents();    //updates the dashboard after loading
    } catch (error) {
        console.error("Unable to load dashboard events:", error);

        events = [];  //clears the list if loading fails
        displayEvents();

        const heading = emptyEvents.querySelector("h3");
        const message = emptyEvents.querySelector("p");

        heading.textContent = "Events could not be loaded";
        message.textContent = "Please refresh the page and try again.";
    }
}

async function displayUser(user) {    //loads the dashboard for the signed-in user
    if (!user) {
        window.location.href = "../index.html";  //returns to login if no user is signed in
        return;
    }

    if (user.displayName) {
        const nameParts = user.displayName.split(" ");
        const firstName = nameParts[0];   //uses only the user's first name

        greeting.textContent =
            "Your schedule, " + firstName;
    } else {
        greeting.textContent = "Your schedule";  //uses a general greeting if no name is available
    }

    try {
        const profile = await getUserProfile(user.uid);    //loads the user's saved settings

        if (profile?.timeZone) {
            userTimeZone = profile.timeZone;  //uses the saved time zone

            localStorage.setItem(
                "timeshift-timezone",
                userTimeZone
            );

            timeZoneDisplay.textContent = userTimeZone;
        }
    } catch (error) {
        console.error("Unable to load user settings:", error);
    }

    await loadDashboardEvents(user.uid);   //loads the user's events after their settings
}

function openNewEventForm() {  //opens the page used to create an event
    window.location.href = "./calendar.html";
}

async function signOutUser() {    //signs the current user out
    await logOut();
    window.location.href = "../index.html";  //returns to the login page
}

watchAuthState(displayUser);   //runs displayUser when the login state changes

eventFilter.addEventListener("change", displayEvents);  //updates the list when the filter changes
newEventButton.addEventListener("click", openNewEventForm);    //opens the new event page
signOutButton.addEventListener("click", signOutUser);  //signs the user out

displayEvents();    //shows the empty dashboard while events load
