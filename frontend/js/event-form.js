import { getTimeZones } from "@vvo/tzdb";
import { fromZonedTime } from "date-fns-tz";
import { auth } from "../../firebase/config.js";
import { createEvent } from "../../firebase/events.js";
import Event from "../../models/Event.js";

const openButton =
    document.getElementById("open-event-form");   //button that opens the event form

const eventDialog =
    document.getElementById("event-dialog");  //popup that holds the form

const eventForm =
    document.getElementById("event-form");     //the form used to create an event

const closeButton =
    document.getElementById("close-event-form");  //x button at the top of the popup

const cancelButton =
    document.getElementById("cancel-event");    //cancel button at the bottom

const statusMessage =
    document.getElementById("event-form-status");  //shows errors and success messages

const dateInput =
    document.getElementById("event-date");     //input for the event date

const startTimeInput =
    document.getElementById("event-start-time");  //input for the starting time

const endTimeInput =
    document.getElementById("event-end-time");   //input for the optional ending time

const timeZoneSelect =
    document.getElementById("event-timezone");  //dropdown for choosing a time zone

function getToday() {    //gets today's date in the format the input needs
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");  //adds one because JavaScript starts months at zero

    const day = String(
        today.getDate()
    ).padStart(2, "0");    //adds a zero to single digit days

    return year + "-" + month + "-" + day;  //returns the date as year-month-day
}

function addTimeZonesToDropdown() {   //adds the time zones to the dropdown
    const timeZones = getTimeZones({
        includeUtc: true
    });  //gets all available time zones including UTC

    for (const timeZone of timeZones) {
        const option = document.createElement("option");    //makes a new dropdown option

        option.value = timeZone.name;  //value saved when the option is selected

        let optionText = timeZone.currentTimeFormat;    //starts with the time zone and offset

        if (timeZone.countryName) {
            optionText =
                optionText + " — " + timeZone.countryName;  //adds the country when available
        }

        option.textContent = optionText;    //sets the text shown to the user

        timeZoneSelect.appendChild(option);  //adds the option to the dropdown
    }

    selectUserTimeZone();    //selects the user's time zone after loading the list
}

function selectUserTimeZone() {  //finds and selects the user's time zone
    let userTimeZone =
        localStorage.getItem("timeshift-timezone");   //checks for a previously saved time zone

    if (!userTimeZone) {
        userTimeZone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;  //uses the device time zone instead
    }

    for (const option of timeZoneSelect.options) {
        if (option.value === userTimeZone) {
            timeZoneSelect.value = userTimeZone;    //selects the matching option
            break;  //stops looking after finding it
        }
    }
}

function clearStatusMessage() {   //removes the current form message
    statusMessage.textContent = "";
}

function openEventForm() {  //opens the event popup
    clearStatusMessage();    //removes any message left from before

    if (!dateInput.value) {
        dateInput.value = getToday();  //uses today's date if the field is empty
    }

    eventDialog.showModal();    //shows the form as a popup
}

function closeEventForm() {   //closes the event popup
    eventDialog.close();
}

function cancelEventForm() {  //clears the form and closes it
    eventForm.reset();    //clears all the entered information
    clearStatusMessage();

    dateInput.value = getToday();  //puts today's date back in the form

    selectUserTimeZone();    //selects the user's time zone again

    closeEventForm();
}

function eventTimesAreValid() {   //checks that the ending time is after the start
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;

    if (!endTime) {
        return true;  //the ending time is optional
    }

    if (endTime <= startTime) {
        statusMessage.textContent =
            "End time must be later than start time.";    //tells the user what needs to change

        endTimeInput.focus();  //moves the cursor to the ending time

        return false;
    }

    return true;    //both times are valid
}

function createEventDraft() {  //turns the form information into an event
    const formData = new FormData(eventForm);    //collects all the form fields

    const date = formData.get("date");
    const startTime = formData.get("startTime");
    const endTime = formData.get("endTime");
    const timeZone = formData.get("timeZone");

    const startAt = fromZonedTime(
        `${date}T${startTime}:00`,
        timeZone
    );  //converts the selected starting time to UTC

    const endAt = endTime
        ? fromZonedTime(`${date}T${endTime}:00`, timeZone)
        : null;    //keeps the ending time empty if one was not entered

    const userId = auth.currentUser?.uid ?? null;  //gets the signed-in user's id

    return new Event({
        calendarId: formData.get("calendarId"),
        createdBy: userId,    //sets the current user as the event creator
        title: formData.get("title").trim(),
        description: formData.get("description").trim(),
        startAt: startAt,
        endAt: endAt,
        timeZone: timeZone,
        location: formData.get("location").trim(),
        meetingLink: formData.get("meetingLink").trim(),
        category: formData.get("category"),
        color: formData.get("color"),
        status: "scheduled",  //new events start as scheduled
        repetitionId: null,    //added later if the event repeats
        attendeeIds: userId ? [userId] : []  //adds the creator as the first attendee
    });
}

async function submitEventForm(event) {   //checks the form and saves the event
    event.preventDefault();  //stops the page from refreshing
    clearStatusMessage();

    if (!eventForm.reportValidity()) {
        return;    //stops if a required field is missing
    }

    if (!eventTimesAreValid()) {
        return;  //stops if the selected times do not work
    }

    if (!auth.currentUser) {
        statusMessage.textContent =
            "Please sign in before creating an event.";   //an event needs an owner
        return;
    }

    try {
        statusMessage.textContent = "Saving event...";

        const eventModel = createEventDraft();  //creates the event from the form
        const formData = new FormData(eventForm);

        const repetition = formData.get("repetition");   //gets the repetition choice
        const reminderValue = formData.get("reminderMinutes");

        const reminderMinutes = reminderValue === "none"
            ? null
            : Number(reminderValue);    //changes the reminder into a number

        const eventId = await createEvent(
            eventModel.toFirestore(),
            {
                repetition,
                reminderMinutes
            }
        );  //saves the event and gets its new id

        statusMessage.textContent = "Event saved!";

        window.dispatchEvent(
            new CustomEvent("timeshift:event-saved", {
                detail: {
                    id: eventId,
                    event: eventModel
                }
            })
        );    //lets the calendar page know a new event was saved

        eventForm.reset();  //clears the form after saving
        dateInput.value = getToday();
        selectUserTimeZone();

        setTimeout(() => {
            closeEventForm();
            clearStatusMessage();
        }, 700);  //briefly shows the success message before closing
    } catch (error) {
        console.error("Unable to save event:", error);

        statusMessage.textContent =
            "The event could not be saved. Please try again.";  //shows a message if saving fails
    }
}

function closeWhenBackgroundIsClicked(event) {    //closes the form when the background is clicked
    if (event.target === eventDialog) {
        closeEventForm();  //only closes when the dialog itself was clicked
    }
}

addTimeZonesToDropdown();   //loads the time zones when the page starts

openButton.addEventListener(
    "click",
    openEventForm
);  //opens the popup when the new event button is clicked

closeButton.addEventListener(
    "click",
    closeEventForm
);    //closes the popup when the x is clicked

cancelButton.addEventListener(
    "click",
    cancelEventForm
);  //clears and closes the form when cancel is clicked

eventForm.addEventListener(
    "submit",
    submitEventForm
);   //checks and saves the form when it is submitted

eventDialog.addEventListener(
    "click",
    closeWhenBackgroundIsClicked
);  //closes the popup when its background is clicked
