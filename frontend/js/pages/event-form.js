import { getTimeZoneOptions } from "../time-zone-options.js";

// Converts a selected timezone time into UTC
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
// Gives us the currently signed-in Google user
import { auth } from "../../firebase/config.js";

// Saves the completed event into Firestore
import { createEvent, editEvent } from "../../firebase/events.js";

// For filling in the form when editing
import { getEventRepetitions } from "../../firebase/repetitions.js";
import { getUserReminders } from "../../firebase/reminders.js";

// Delete button (same one the details popup uses)
import { deleteEventWithConfirm } from "../event-details.js";
// Defines the fields that belong to an Event
import Event from "../../models/Event.js";


// Connect JavaScript to the HTML elements

// Button that opens the New Event popup
const openButton =
    document.getElementById("open-event-form");

// The <dialog> element containing the event form
const eventDialog =
    document.getElementById("event-dialog");

// The form inside the popup
const eventForm =
    document.getElementById("event-form");

// X button at the top of the popup
const closeButton =
    document.getElementById("close-event-form");

// Cancel button at the bottom of the popup
const cancelButton =
    document.getElementById("cancel-event");

// Area used to display an error or success message
const statusMessage =
    document.getElementById("event-form-status");

// Input where the user selects the event date
const dateInput =
    document.getElementById("event-date");
// Input where the user selects the date when the event ends.
// This allows events to continue past midnight or span multiple days.
const endDateInput =
    document.getElementById("event-end-date");

// Input where the user selects the starting time
const startTimeInput =
    document.getElementById("event-start-time");

// Input where the user selects the ending time
const endTimeInput =
    document.getElementById("event-end-time");

// Dropdown where the user selects a timezone
const timeZoneSelect =
    document.getElementById("event-timezone");

// Popup heading ("New Event" or "Edit Event")
const formHeading =
    document.querySelector("#event-dialog .dialog-title h2");

// Save button at the bottom
const saveButton =
    document.querySelector("#event-form button[type='submit']");

// Delete button (only shows when editing)
const deleteButton =
    document.getElementById("delete-event");

// Null = making a new event, otherwise the event being edited
let editingEvent = null;

// Repeat dropdown + the "How many times?" box under it
const repeatSelect =
    document.getElementById("event-repeat");

const repeatCountField =
    document.getElementById("repeat-count-field");

const repeatCountInput =
    document.getElementById("event-repeat-count");


// Date inputs use YYYY-MM-DD. Use the local calendar date, not a UTC date that might be a day off.

function getToday() {
    // Create a JavaScript Date containing the current date
    const today = new Date();

    // Get the four-digit year
    const year = today.getFullYear();

    // JavaScript months start at zero.
    // January is 0, so we add 1.
    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");

    // Add a zero when the day has only one digit.
    // For example, 5 becomes 05.
    const day = String(
        today.getDate()
    ).padStart(2, "0");

    // HTML date inputs require the format YYYY-MM-DD.
    // An example is 2026-11-05.
    return year + "-" + month + "-" + day;
}

// Keep the ending date on or after the starting date.
function syncEndDateWithStart() {
    const startDate = dateInput.value;

    if (!startDate) {
        return;
    }

    // Prevent the user from selecting an end date
    // that occurs before the starting date.
    endDateInput.min = startDate;

    // Automatically use the starting date when the
    // ending date is empty or is now too early.
    if (
        !endDateInput.value ||
        endDateInput.value < startDate
    ) {
        endDateInput.value = startDate;
    }
}


// Add worldwide timezones to the dropdown

function addTimeZonesToDropdown() {
    for (const { value, label } of getTimeZoneOptions()) {
        timeZoneSelect.add(new Option(label, value));
    }

    selectUserTimeZone();
}


// Select the user's timezone

function selectUserTimeZone() {
    // First, look for a timezone previously saved
    // from the Settings page.
    let userTimeZone =
        localStorage.getItem("timeshift-timezone");

    // If nothing was saved, use the timezone reported
    // by the user's computer or browser.
    if (!userTimeZone) {
        userTimeZone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    // Go through the dropdown options until we find
    // the option that matches the user's timezone.
    for (const option of timeZoneSelect.options) {
        if (option.value === userTimeZone) {
            // Display the matching option as selected.
            timeZoneSelect.value = userTimeZone;

            // Stop searching because we found the match.
            break;
        }
    }
}


// Clear the form message

function clearStatusMessage() {
    // Replace the existing error or success message
    // with an empty string.
    statusMessage.textContent = "";
}


// Open the event popup

function openEventForm() {
    // Remove an old error or success message.
    clearStatusMessage();

    // If the form was last used for editing, clear it out
    // but keep the date in case a calendar day was clicked
    if (editingEvent) {
        const pickedDate = dateInput.value;
        eventForm.reset();
        setNewMode();
        selectUserTimeZone();
        dateInput.value = pickedDate;
    }

    // If the event date is blank, automatically
    // start it with today's date.
    if (!dateInput.value) {
        dateInput.value = getToday();
    }
    // A new event starts with the same end date unless the user picks a later date.
syncEndDateWithStart();

    // ShowModal displays the dialog as a popup and
    // darkens the page behind it.
    eventDialog.showModal();
}


// Close the event popup

function closeEventForm() {
    // Close the dialog without changing its fields.
    eventDialog.close();
}


// Cancel and reset the form

function cancelEventForm() {
    // Clear every input in the form.
    eventForm.reset();

    // Remove any displayed message.
    clearStatusMessage();

    // Put today's date back into the date field.
    dateInput.value = getToday();

    // Select the user's timezone again because reset()
    // may change the dropdown back to its first option.
    selectUserTimeZone();

    // Go back to "New Event" mode
    setNewMode();

    // Close the popup.
    closeEventForm();
}


// Check the start and end as real instants in the event's time zone, not as text in the form.


// Check that the complete ending date and time
// occur after the complete starting date and time.
function eventTimesAreValid() {
    const startDate = dateInput.value;
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const timeZone = timeZoneSelect.value;

    // End time is optional. An event without one
    // is allowed to have no ending date and time.
    if (!endTime) {
        return true;
    }

    // If no separate end date was selected,
    // treat the event as ending on its start date.
    const endDate =
        endDateInput.value || startDate;

    // Convert both selected date-times into actual UTC times.
    // This allows the comparison to work across midnight,
    // multiple days, and different daylight-saving offsets.
    const startAt = fromZonedTime(
        `${startDate}T${startTime}:00`,
        timeZone
    );

    const endAt = fromZonedTime(
        `${endDate}T${endTime}:00`,
        timeZone
    );

    // The event must finish after it begins.
    if (endAt <= startAt) {
        statusMessage.textContent =
            "The ending date and time must be after the starting date and time.";

        endTimeInput.focus();
        return false;
    }

    return true;
}


// Put the form values into an Event before sending them to Firestore.
function createEventDraft() {
    const formData = new FormData(eventForm);

    const startDate = formData.get("date");
    const startTime = formData.get("startTime");

    const endTime = formData.get("endTime");

    // If no separate end date was selected,
    // use the starting date as the ending date.
    const endDate =
        formData.get("endDate") || startDate;

    const timeZone = formData.get("timeZone");

    // Convert the selected starting date and time
    // from the event's timezone into UTC.
    const startAt = fromZonedTime(
        `${startDate}T${startTime}:00`,
        timeZone
    );

    // The ending time is optional.
    // When one is entered, use the separate ending date.
    const endAt = endTime
        ? fromZonedTime(
            `${endDate}T${endTime}:00`,
            timeZone
        )
        : null;

    const userId =
        auth.currentUser?.uid ?? null;

    return new Event({
        calendarId: formData.get("calendarId"),
        createdBy: userId,
        title: formData.get("title").trim(),
        description: formData.get("description").trim(),
        startAt: startAt,
        endAt: endAt,
        timeZone: timeZone,
        location: formData.get("location").trim(),
        meetingLink: formData.get("meetingLink").trim(),
        category: formData.get("category"),
        color: formData.get("color"),
        status: "scheduled",
        repetitionId: null,
        attendeeIds: userId ? [userId] : []
    });
}

// Handle the Save Event button

// Validate and save the event to Firestore
async function submitEventForm(event) {
    event.preventDefault();
    clearStatusMessage();

    // Let the browser report missing fields before checking the event’s actual start and end times.
    if (!eventForm.reportValidity()) {
        return;
    }

    if (!eventTimesAreValid()) {
        return;
    }

    // An event must belong to a signed-in user
    if (!auth.currentUser) {
        statusMessage.textContent =
            "Please sign in before creating an event.";
        return;
    }

    try {
        statusMessage.textContent = "Saving event...";

        // Create the Event model
        const eventModel = createEventDraft();
        const formData = new FormData(eventForm);
        const repetition = formData.get("repetition");
        // No reminder is stored as null. Other choices give the number of minutes before the start.
        const reminderValue = formData.get("reminderMinutes");
        const reminderMinutes = reminderValue === "none"
            ? null
            : Number(reminderValue);

        // How many times it repeats (null if it doesn't repeat)
        const repeatCount = repetition === "none"
            ? null
            : Number(formData.get("repeatCount"));
        
        // Editing an event that already exists
        if (editingEvent) {
            await saveEditedEvent(eventModel, repetition, reminderMinutes, repeatCount);            
            return;
        }

        // Convert the model into Firestore data and save it
        const eventId = await createEvent(
            eventModel.toFirestore(),
            {
                repetition,
                reminderMinutes,
                repeatCount
            }
        );

        statusMessage.textContent = "Event saved!";

        // Notify the Calendar page that a new event exists
        window.dispatchEvent(
            new CustomEvent("timeshift:event-saved", {
                detail: {
                    id: eventId,
                    event: eventModel
                }
            })
        );

        // Clear the form after saving
        eventForm.reset();
        dateInput.value = getToday();
        selectUserTimeZone();
        showOrHideRepeatCount();

        // Briefly show the success message, then close
        setTimeout(() => {
            closeEventForm();
            clearStatusMessage();
        }, 700);
    } catch (error) {
        console.error("Unable to save event:", error);

        statusMessage.textContent =
            "The event could not be saved. Please try again.";
    }
}

// Edit mode

// Puts the popup back to "New Event"
function setNewMode() {
    editingEvent = null;
    formHeading.textContent = "New Event";
    saveButton.textContent = "Save Event";
    deleteButton.hidden = true;
    showOrHideRepeatCount();
}

// Only show "How many times?" when the event repeats
function showOrHideRepeatCount() {
    const repeats = repeatSelect.value !== "none";

    repeatCountField.hidden = !repeats;
    repeatCountInput.required = repeats;
}

// Firebase gives back a Timestamp, so turn it into a Date
function toDate(value) {
    if (!value) {
        return null;
    }
    if (value.toDate) {
        return value.toDate();
    }
    return new Date(value);
}

// Opens the popup with an event's info already filled in
// Fill the form from the original saved event, not from a date generated for a repeat.
async function openEditForm(event) {
    clearStatusMessage();
    eventForm.reset();

    editingEvent = event;
    formHeading.textContent = "Edit Event";
    saveButton.textContent = "Save Changes";
    deleteButton.hidden = false;
    showOrHideRepeatCount();

    // Convert the saved timestamps back to dates before restoring the form’s local date and time fields.
    const start = toDate(event.startAt);
    const end = toDate(event.endAt);

    // Show the date and time as entered in the event’s own time zone, not the viewer’s.
    const zone = event.timeZone || "UTC";

    document.getElementById("event-title").value = event.title || "";
    document.getElementById("event-calendar").value = event.calendarId || "personal";
    // Restore the event's starting date and time.
dateInput.value =
    formatInTimeZone(start, zone, "yyyy-MM-dd");
startTimeInput.value =
    formatInTimeZone(start, zone, "HH:mm");
// Restore the end date separately so an overnight event still ends on the correct day.
// If the event has no ending time, leave that field blank and default the date to the start date.
endDateInput.value = end
    ? formatInTimeZone(end, zone, "yyyy-MM-dd")
    : dateInput.value;
endTimeInput.value = end
    ? formatInTimeZone(end, zone, "HH:mm")
    : "";
// Restore the timezone used when the event was created.
timeZoneSelect.value = zone;
// Prevent selecting an ending date before the starting date.
endDateInput.min = dateInput.value;
    document.getElementById("event-location").value = event.location || "";
    document.getElementById("event-meeting-link").value = event.meetingLink || "";
    document.getElementById("event-description").value = event.description || "";
    document.getElementById("event-category").value = event.category || "";
    document.getElementById("event-color").value = event.color || "#5f8a3a";

    eventDialog.showModal();

    // The form is already open. Use the original event ID to load its repeat settings and reminder.
    try {
        if (event.repetitionId) {
            const repetitions = await getEventRepetitions(event.id);

            if (repetitions[0]) {
                document.getElementById("event-repeat").value =
                    repetitions[0].frequency;

                // Old events might not have a count saved
                if (repetitions[0].occurrenceCount) {
                    repeatCountInput.value = repetitions[0].occurrenceCount;
                }
            }
        }

        showOrHideRepeatCount();

        const reminders = await getUserReminders(auth.currentUser.uid);
        const reminder = reminders.find((item) => item.eventId === event.id);
        if (reminder) {
            document.getElementById("event-reminder").value =
                String(reminder.minutesBefore);
        }
    } catch (error) {
        console.error("couldn't load repeat/reminder", error);
    }
}

// Saves the changes to Firestore
async function saveEditedEvent(eventModel, repetition, reminderMinutes, repeatCount) {    // only the fields from the form (not createdBy, createdAt, etc)
    const changes = {
        calendarId: eventModel.calendarId,
        title: eventModel.title,
        description: eventModel.description,
        startAt: eventModel.startAt,
        endAt: eventModel.endAt,
        timeZone: eventModel.timeZone,
        location: eventModel.location,
        meetingLink: eventModel.meetingLink,
        category: eventModel.category,
        color: eventModel.color
    };

    // One saved event drives every date in a series, so saving here updates the whole series.
    await editEvent(editingEvent.id, changes, {
        repetition: repetition,
        reminderMinutes: reminderMinutes,
        repeatCount: repeatCount,
        oldRepetitionId: editingEvent.repetitionId,
        userId: auth.currentUser.uid
    });

    statusMessage.textContent = "Changes saved!";

    // Tells the calendar to reload
    window.dispatchEvent(new CustomEvent("timeshift:event-saved"));

    setTimeout(() => {
        eventForm.reset();
        setNewMode();
        dateInput.value = getToday();
        selectUserTimeZone();
        closeEventForm();
        clearStatusMessage();
    }, 700);
}

// Delete button inside the edit form
async function deleteFromForm() {
    const deleted = await deleteEventWithConfirm(editingEvent);

    if (deleted) {
        eventForm.reset();
        setNewMode();
        dateInput.value = getToday();
        selectUserTimeZone();
        closeEventForm();
    }
}

// Close when the dark background is clicked

function closeWhenBackgroundIsClicked(event) {
    // Event.target tells us exactly what was clicked.
    // If the dialog itself was clicked, rather than
    // something inside the form, the dark background
    // area was clicked.
    if (event.target === eventDialog) {
        closeEventForm();
    }
}


// Start the event form

// Add the worldwide timezones when the page loads.
addTimeZonesToDropdown();

// Open the popup when New Event is clicked.
openButton.addEventListener(
    "click",
    openEventForm
);

// Close the popup when the X is clicked.
closeButton.addEventListener(
    "click",
    closeEventForm
);

// Reset and close the popup when Cancel is clicked.
cancelButton.addEventListener(
    "click",
    cancelEventForm
);

// Validate and collect information when Save Event is clicked.
eventForm.addEventListener(
    "submit",
    submitEventForm
);

// Close the popup when its dark background is clicked.
eventDialog.addEventListener(
    "click",
    closeWhenBackgroundIsClicked
);


// Open the form in edit mode (sent from the details popup)
window.addEventListener("timeshift:edit-event", (event) => {
    openEditForm(event.detail);
});

// Delete button in the edit form
deleteButton.addEventListener(
    "click",
    deleteFromForm
);

// Show "How many times?" when Repeat changes
repeatSelect.addEventListener(
    "change",
    showOrHideRepeatCount
);

// Keep the ending date valid when the starting date changes.
dateInput.addEventListener(
    "change",
    syncEndDateWithStart
);
