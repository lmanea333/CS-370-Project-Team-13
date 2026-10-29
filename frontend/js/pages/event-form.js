import { getTimeZones } from "@vvo/tzdb";

const openButton = document.querySelector("#open-event-form");
const eventDialog = document.querySelector("#event-dialog");
const eventForm = document.querySelector("#event-form");
const closeButton = document.querySelector("#close-event-form");
const cancelButton = document.querySelector("#cancel-event");
const statusMessage = document.querySelector("#event-form-status");
const dateInput = document.querySelector("#event-date");
const startTimeInput =
    document.querySelector("#event-start-time");
const endTimeInput =
    document.querySelector("#event-end-time");
const timeZoneSelect =
    document.querySelector("#event-timezone");

function getTodayAsInputValue() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
        today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function populateTimeZones() {
    const timeZones = getTimeZones({
        includeUtc: true
    });

    timeZones.forEach((timeZone) => {
        const option = document.createElement("option");

        option.value = timeZone.name;

        option.textContent =
            `${timeZone.currentTimeFormat}` +
            (
                timeZone.countryName
                    ? ` — ${timeZone.countryName}`
                    : ""
            );

        timeZoneSelect.appendChild(option);
    });

    const localTimeZone =
        Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone;

    const localOption = Array.from(
        timeZoneSelect.options
    ).find((option) => {
        return option.value === localTimeZone;
    });

    if (localOption) {
        timeZoneSelect.value = localTimeZone;
    }
}

function clearStatusMessage() {
    statusMessage.textContent = "";
}

function openEventForm() {
    clearStatusMessage();

    if (!dateInput.value) {
        dateInput.value = getTodayAsInputValue();
    }

    eventDialog.showModal();
}

function closeEventForm() {
    eventDialog.close();
}

function cancelEventForm() {
    eventForm.reset();
    clearStatusMessage();
    dateInput.value = getTodayAsInputValue();
    closeEventForm();
}

function validateEventTimes() {
    if (
        endTimeInput.value &&
        startTimeInput.value &&
        endTimeInput.value <= startTimeInput.value
    ) {
        statusMessage.textContent =
            "End time must be later than start time.";

        endTimeInput.focus();

        return false;
    }

    return true;
}

function createEventDraft() {
    const formData = new FormData(eventForm);

    return {
        calendarId: formData.get("calendarId"),
        title: formData.get("title").trim(),
        description:
            formData.get("description").trim(),
        date: formData.get("date"),
        startTime: formData.get("startTime"),
        endTime:
            formData.get("endTime") || null,
        timeZone: formData.get("timeZone"),
        location:
            formData.get("location").trim(),
        meetingLink:
            formData.get("meetingLink").trim(),
        category: formData.get("category"),
        color: formData.get("color"),
        repetition:
            formData.get("repetition"),
        reminderMinutes:
            formData.get("reminderMinutes") === "none"
                ? null
                : Number(
                    formData.get("reminderMinutes")
                )
    };
}

function handleEventSubmission(event) {
    event.preventDefault();
    clearStatusMessage();

    if (!eventForm.reportValidity()) {
        return;
    }

    if (!validateEventTimes()) {
        return;
    }

    const eventDraft = createEventDraft();

    console.log("Event form information:", eventDraft);

    statusMessage.textContent =
        "Event information is valid. " +
        "The database connection comes next.";

    window.dispatchEvent(
        new CustomEvent("timeshift:event-draft", {
            detail: eventDraft
        })
    );
}

populateTimeZones();

openButton.addEventListener(
    "click",
    openEventForm
);

closeButton.addEventListener(
    "click",
    closeEventForm
);

cancelButton.addEventListener(
    "click",
    cancelEventForm
);

eventForm.addEventListener(
    "submit",
    handleEventSubmission
);

eventDialog.addEventListener(
    "click",
    (event) => {
        if (event.target === eventDialog) {
            closeEventForm();
        }
    }
);