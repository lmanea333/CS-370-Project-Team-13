import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../../firebase/config.js";
import {
    createCalendar,
    getUserCalendars
} from "../../firebase/calendars.js";

import Calendar from "../../models/Calendar.js";


// ---------- Page elements ----------

const openButton =
    document.getElementById("open-calendar-form");

const calendarDialog =
    document.getElementById("calendar-dialog");

const calendarForm =
    document.getElementById("calendar-form");

const closeButton =
    document.getElementById("close-calendar-form");

const cancelButton =
    document.getElementById("cancel-calendar");

const statusMessage =
    document.getElementById("calendar-form-status");

const calendarFilter =
    document.getElementById("calendar-filter");

const eventCalendarSelect =
    document.getElementById("event-calendar");

const calendarColorInput =
    document.getElementById("calendar-color");

let userCalendars = [];


// ---------- Open and close the popup ----------

function openCalendarForm() {
    statusMessage.textContent = "";
    calendarDialog.showModal();
}

function closeCalendarForm() {
    calendarDialog.close();
}

function cancelCalendarForm() {
    calendarForm.reset();
    calendarColorInput.value = "#2a5db0";
    statusMessage.textContent = "";
    closeCalendarForm();
}


// ---------- Add calendars to both dropdowns ----------

function populateCalendarDropdowns() {
    const selectedFilter = calendarFilter.value;
    const selectedEventCalendar = eventCalendarSelect.value;

    // Remove previously loaded Firestore calendar options.
    calendarFilter
        .querySelectorAll("[data-user-calendar]")
        .forEach((option) => option.remove());

    eventCalendarSelect
        .querySelectorAll("[data-user-calendar]")
        .forEach((option) => option.remove());

    // Display calendars alphabetically.
    userCalendars.sort((first, second) =>
        first.name.localeCompare(second.name)
    );

    for (const calendar of userCalendars) {
        // Add the calendar to the main calendar filter.
        const filterOption =
            document.createElement("option");

        filterOption.value = calendar.id;
        filterOption.textContent = calendar.name;
        filterOption.dataset.userCalendar = "true";

        calendarFilter.appendChild(filterOption);

        // Add the same calendar to the event form.
        const eventOption =
            document.createElement("option");

        eventOption.value = calendar.id;
        eventOption.textContent = calendar.name;
        eventOption.dataset.userCalendar = "true";

        eventCalendarSelect.appendChild(eventOption);
    }

    // Keep the previous selections when they still exist.
    const filterStillExists =
        Array.from(calendarFilter.options).some(
            (option) => option.value === selectedFilter
        );

    if (filterStillExists) {
        calendarFilter.value = selectedFilter;
    }

    const eventCalendarStillExists =
        Array.from(eventCalendarSelect.options).some(
            (option) =>
                option.value === selectedEventCalendar
        );

    if (eventCalendarStillExists) {
        eventCalendarSelect.value =
            selectedEventCalendar;
    }
}


// ---------- Load calendars from Firestore ----------

async function loadCalendars(userId) {
    try {
        userCalendars =
            await getUserCalendars(userId);

        populateCalendarDropdowns();

        // Other page files can respond when calendars reload.
        window.dispatchEvent(
            new CustomEvent("timeshift:calendars-loaded", {
                detail: {
                    calendars: userCalendars
                }
            })
        );
    } catch (error) {
        console.error(
            "Unable to load calendars:",
            error
        );
    }
}


// ---------- Create a calendar ----------

async function submitCalendarForm(event) {
    event.preventDefault();
    statusMessage.textContent = "";

    if (!calendarForm.reportValidity()) {
        return;
    }

    if (!auth.currentUser) {
        statusMessage.textContent =
            "Please sign in before creating a calendar.";
        return;
    }

    const formData =
        new FormData(calendarForm);

    const name =
        formData.get("name").trim();

    // Prevent duplicate calendar names.
    const nameAlreadyExists =
        userCalendars.some(
            (calendar) =>
                calendar.name.toLowerCase() ===
                name.toLowerCase()
        );

    if (nameAlreadyExists) {
        statusMessage.textContent =
            "You already have a calendar with that name.";
        return;
    }

    try {
        statusMessage.textContent =
            "Creating calendar...";

        const calendarModel = new Calendar({
            ownerId: auth.currentUser.uid,
            name: name,
            type: "personal",
            description:
                formData.get("description").trim(),
            color: formData.get("color"),
            isDefault: false
        });

        const calendarId =
            await createCalendar(
                calendarModel.toFirestore()
            );

        await loadCalendars(
            auth.currentUser.uid
        );

        // Select the newly created calendar in the event form.
        eventCalendarSelect.value = calendarId;

        statusMessage.textContent =
            "Calendar created!";

        setTimeout(() => {
            calendarForm.reset();
            calendarColorInput.value = "#2a5db0";
            closeCalendarForm();
            statusMessage.textContent = "";
        }, 700);
    } catch (error) {
        console.error(
            "Unable to create calendar:",
            error
        );

        statusMessage.textContent =
            "The calendar could not be created.";
    }
}


// ---------- Event listeners ----------

openButton.addEventListener(
    "click",
    openCalendarForm
);

closeButton.addEventListener(
    "click",
    closeCalendarForm
);

cancelButton.addEventListener(
    "click",
    cancelCalendarForm
);

calendarForm.addEventListener(
    "submit",
    submitCalendarForm
);

// Close when the dark area behind the form is clicked.
calendarDialog.addEventListener("click", (event) => {
    if (event.target === calendarDialog) {
        closeCalendarForm();
    }
});


// ---------- Start calendar manager ----------

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadCalendars(user.uid);
    }
});