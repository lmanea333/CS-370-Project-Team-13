// Import getTimeZones from the installed timezone library.
// This library gives us a list of worldwide timezones.
import { getTimeZones } from "@vvo/tzdb";


// --------------------------------------------------
// 1. Connect JavaScript to the HTML elements
// --------------------------------------------------

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

// Input where the user selects the starting time
const startTimeInput =
    document.getElementById("event-start-time");

// Input where the user selects the ending time
const endTimeInput =
    document.getElementById("event-end-time");

// Dropdown where the user selects a timezone
const timeZoneSelect =
    document.getElementById("event-timezone");


// --------------------------------------------------
// 2. Create today's date in the format HTML needs
// --------------------------------------------------

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


// --------------------------------------------------
// 3. Add worldwide timezones to the dropdown
// --------------------------------------------------

function addTimeZonesToDropdown() {
    // Ask the timezone library for every timezone.
    // includeUtc also adds UTC to the list.
    const timeZones = getTimeZones({
        includeUtc: true
    });

    // Go through every timezone returned by the library
    for (const timeZone of timeZones) {
        // Create a new HTML <option>
        const option = document.createElement("option");

        // This is the value saved when the option is selected.
        // An example is America/Los_Angeles.
        option.value = timeZone.name;

        // Start the visible label with the current
        // timezone format and offset.
        let optionText = timeZone.currentTimeFormat;

        // Add the country name when one is available.
        if (timeZone.countryName) {
            optionText =
                optionText + " — " + timeZone.countryName;
        }

        // Set the text the user sees in the dropdown.
        option.textContent = optionText;

        // Add this option to the timezone dropdown.
        timeZoneSelect.appendChild(option);
    }

    // After adding all the options, automatically select
    // the user's saved or computer timezone.
    selectUserTimeZone();
}


// --------------------------------------------------
// 4. Select the user's timezone
// --------------------------------------------------

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


// --------------------------------------------------
// 5. Clear the form message
// --------------------------------------------------

function clearStatusMessage() {
    // Replace the existing error or success message
    // with an empty string.
    statusMessage.textContent = "";
}


// --------------------------------------------------
// 6. Open the event popup
// --------------------------------------------------

function openEventForm() {
    // Remove an old error or success message.
    clearStatusMessage();

    // If the event date is blank, automatically
    // start it with today's date.
    if (!dateInput.value) {
        dateInput.value = getToday();
    }

    // showModal displays the dialog as a popup and
    // darkens the page behind it.
    eventDialog.showModal();
}


// --------------------------------------------------
// 7. Close the event popup
// --------------------------------------------------

function closeEventForm() {
    // Close the dialog without changing its fields.
    eventDialog.close();
}


// --------------------------------------------------
// 8. Cancel and reset the form
// --------------------------------------------------

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

    // Close the popup.
    closeEventForm();
}


// --------------------------------------------------
// 9. Validate the start and end times
// --------------------------------------------------

function eventTimesAreValid() {
    // Read the selected starting time.
    const startTime = startTimeInput.value;

    // Read the selected ending time.
    const endTime = endTimeInput.value;

    // The ending time is optional.
    // If the user did not enter one, the times are valid.
    if (!endTime) {
        return true;
    }

    // HTML time values use a 24-hour format such as 09:30.
    // Because of that format, they can be compared directly.
    if (endTime <= startTime) {
        // Explain the problem to the user.
        statusMessage.textContent =
            "End time must be later than start time.";

        // Move the typing focus to the incorrect field.
        endTimeInput.focus();

        // False means the form should not continue.
        return false;
    }

    // True means the selected times are acceptable.
    return true;
}


// --------------------------------------------------
// 10. Collect the information entered in the form
// --------------------------------------------------

function createEventDraft() {
    // FormData collects values using each HTML field's
    // name attribute.
    const formData = new FormData(eventForm);

    // Read the selected reminder value.
    let reminderMinutes =
        formData.get("reminderMinutes");

    // Convert "none" into null because null means
    // the event does not have a reminder.
    if (reminderMinutes === "none") {
        reminderMinutes = null;
    } else {
        // Form values start as text.
        // Number converts the reminder into a number.
        reminderMinutes = Number(reminderMinutes);
    }

    // Put all the form values into one event object.
    // This object can later be sent to the backend.
    const eventDraft = {
        calendarId: formData.get("calendarId"),

        // trim() removes unnecessary spaces from
        // the beginning and end of text.
        title: formData.get("title").trim(),

        description:
            formData.get("description").trim(),

        date: formData.get("date"),

        startTime: formData.get("startTime"),

        endTime: formData.get("endTime"),

        timeZone: formData.get("timeZone"),

        location:
            formData.get("location").trim(),

        meetingLink:
            formData.get("meetingLink").trim(),

        category: formData.get("category"),

        color: formData.get("color"),

        repetition: formData.get("repetition"),

        reminderMinutes: reminderMinutes
    };

    // Give the completed event object back to
    // the function that submitted the form.
    return eventDraft;
}


// --------------------------------------------------
// 11. Handle the Save Event button
// --------------------------------------------------

function submitEventForm(event) {
    // Forms normally refresh the webpage when submitted.
    // preventDefault stops that refresh.
    event.preventDefault();

    // Remove any old error or success message.
    clearStatusMessage();

    // reportValidity checks the HTML rules such as
    // required fields and valid URL formats.
    if (!eventForm.reportValidity()) {
        return;
    }

    // Run our additional start/end-time check.
    if (!eventTimesAreValid()) {
        return;
    }

    // Collect all valid information from the form.
    const eventDraft = createEventDraft();

    // Display the event object in the browser Console.
    // This is temporary and helps us test the form.
    console.log("Event form information:", eventDraft);

    // Tell the user that the form passed validation.
    // The event is not in Firestore yet.
    statusMessage.textContent =
        "Event information is valid. " +
        "The database connection comes next.";

    // Send the event draft to any other frontend code
    // that is listening for timeshift:event-draft.
    //
    // Later, this can be replaced or connected to
    // the backend function that saves the event.
    window.dispatchEvent(
        new CustomEvent("timeshift:event-draft", {
            detail: eventDraft
        })
    );
}


// --------------------------------------------------
// 12. Close when the dark background is clicked
// --------------------------------------------------

function closeWhenBackgroundIsClicked(event) {
    // event.target tells us exactly what was clicked.
    //
    // If the dialog itself was clicked, rather than
    // something inside the form, the dark background
    // area was clicked.
    if (event.target === eventDialog) {
        closeEventForm();
    }
}


// --------------------------------------------------
// 13. Start the event form
// --------------------------------------------------

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