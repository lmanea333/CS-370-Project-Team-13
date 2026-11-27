import { watchAuthState } from "../../firebase/auth.js";
import { getUserCalendars } from "../../firebase/calendars.js";
import {
    getCalendarViewers,
    getSharedCalendar,
    getSharedCalendarEvents,
    grantCalendarAccess,
    revokeCalendarAccess,
    watchCalendarsSharedWith
} from "../../firebase/calendar-sharing.js";
import { getOccurrencesBetween } from "../repeats.js";

const shareForm = document.getElementById("share-calendar-form");
const ownedSelect = document.getElementById("share-owned-calendar");
const viewerInput = document.getElementById("share-viewer-email");
const viewerList = document.getElementById("share-viewer-list");
const ownerStatus = document.getElementById("share-owner-status");
const sharedSelect = document.getElementById("shared-with-me");
const sharedStatus = document.getElementById("shared-calendar-status");
const eventList = document.getElementById("shared-calendar-events");
const shareButton = shareForm.querySelector("button");

let currentUser;
let sharedCalendars = [];
let stopWatchingShares;
// Use these counters to ignore old responses when a selection changes.
let shareVersion = 0;
let eventVersion = 0;
let viewerVersion = 0;

function fillOptions(select, calendars, placeholder) {
    const previous = select.value;
    select.replaceChildren(new Option(placeholder, ""));
    for (const calendar of calendars) {
        select.add(new Option(calendar.name, calendar.id));
    }
    select.value = calendars.some((calendar) => calendar.id === previous) ? previous : "";
    select.disabled = calendars.length === 0;
}

// Only calendars you own go in the sharing form.
function setOwnedCalendars(calendars) {
    fillOptions(ownedSelect, calendars, calendars.length ? "Choose a calendar" : "Create a calendar first");
    shareButton.disabled = ownedSelect.disabled;
    loadViewers();
}

// Reload the viewer list when you pick a different calendar.
async function loadViewers(message = "") {
    const version = ++viewerVersion;
    const calendarId = ownedSelect.value;
    const user = currentUser;
    viewerList.replaceChildren();
    ownerStatus.textContent = message;
    if (!calendarId || !user) return;

    try {
        const viewers = await getCalendarViewers(calendarId, user.uid);
        if (version !== viewerVersion) return;
        for (const viewer of viewers) {
            const item = document.createElement("li");
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "btn-gray";
            remove.textContent = "Remove access";
            remove.setAttribute("aria-label", `Remove access for ${viewer.viewerEmail}`);
            item.append(viewer.viewerEmail, remove);
            viewerList.append(item);

            remove.addEventListener("click", async () => {
                remove.disabled = true;
                try {
                    await revokeCalendarAccess(calendarId, viewer.viewerEmail);
                    if (currentUser === user && ownedSelect.value === calendarId) {
                        await loadViewers("Access removed.");
                    }
                } catch (error) {
                    console.error("Could not remove calendar access:", error);
                    if (version === viewerVersion) {
                        ownerStatus.textContent = "Could not remove access. Try again.";
                        remove.disabled = false;
                    }
                }
            });
        }
        if (!viewers.length && !message) ownerStatus.textContent = "No viewers yet.";
    } catch (error) {
        console.error("Could not load calendar viewers:", error);
        if (version === viewerVersion) ownerStatus.textContent = "Could not load viewers.";
    }
}

function asDate(value) {
    return value?.toDate?.() ?? (value ? new Date(value) : null);
}

async function showSharedEvents() {
    const version = ++eventVersion;
    eventList.replaceChildren();
    sharedStatus.textContent = "";
    const calendar = sharedCalendars.find((item) => item.id === sharedSelect.value);
    if (!calendar) return;

    sharedStatus.textContent = "Loading events...";
    try {
        const events = await getSharedCalendarEvents(calendar);
        // A slow response must not redraw a calendar after access was removed.
        if (version !== eventVersion) return;
        const now = new Date();
        // Keep the list short for calendars with repeating events.
        const limit = new Date(now);
        limit.setDate(limit.getDate() + 90);
        const upcoming = events.flatMap((event) => {
            const startAt = asDate(event.startAt);
            const endAt = asDate(event.endAt);
            if (!startAt || !Number.isFinite(startAt.getTime())) return [];
            if (!event.repeat && startAt < now && endAt > now) return [{ ...event, startAt, endAt }];
            const searchStart = event.repeat && endAt ? new Date(now - (endAt - startAt)) : now;
            return getOccurrencesBetween({ ...event, startAt, endAt }, searchStart, limit);
        }).sort((a, b) => a.startAt - b.startAt);

        const timeZone = localStorage.getItem("timeshift-timezone") || undefined;
        const format = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone });
        for (const event of upcoming) {
            const item = document.createElement("li");
            const title = document.createElement("strong");
            title.textContent = event.title || "Untitled event";
            const starts = format.format(event.startAt);
            const ends = event.endAt && Number.isFinite(event.endAt.getTime())
                ? ` to ${format.format(event.endAt)}` : "";
            item.append(title, ` · ${starts}${ends}`);
            if (event.location) item.append(` · ${event.location}`);
            if (event.description) {
                const description = document.createElement("div");
                description.textContent = event.description;
                item.append(description);
            }
            eventList.append(item);
        }
        sharedStatus.textContent = upcoming.length
            ? "Read-only · Events in progress or starting in the next 90 days"
            : "No events in progress or starting in the next 90 days.";
    } catch (error) {
        console.error("Could not load shared events:", error);
        if (version === eventVersion) sharedStatus.textContent = "Could not load events. Your access may have changed.";
    }
}

async function showShares(shares) {
    const version = ++shareVersion;
    if (!shares.some((share) => share.calendarId === sharedSelect.value)) {
        ++eventVersion;
        eventList.replaceChildren();
        sharedStatus.textContent = "";
    }

    // A share can outlive a deleted calendar. Keep the other shares visible.
    const results = await Promise.allSettled(shares.map(getSharedCalendar));
    if (version !== shareVersion) return;
    sharedCalendars = results
        .filter((result) => result.status === "fulfilled" && result.value)
        .map((result) => result.value)
        .sort((a, b) => a.name.localeCompare(b.name));
    fillOptions(sharedSelect, sharedCalendars, sharedCalendars.length ? "Choose a shared calendar" : "No shared calendars");
    showSharedEvents();
    if (results.some((result) => result.status === "rejected") && !sharedSelect.value) {
        sharedStatus.textContent = "Some shared calendars couldn’t be loaded.";
    }
}

// Use the email the viewer signs into TimeShift with.
shareForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const calendarId = ownedSelect.value;
    const user = currentUser;
    const email = viewerInput.value.trim().toLowerCase();
    if (!calendarId || !user) return;
    if (!email.includes(".") || /[:/]/.test(email)) {
        ownerStatus.textContent = "Enter the viewer’s full Google email address.";
        return;
    }
    if (email === user.email?.toLowerCase()) {
        ownerStatus.textContent = "You already own this calendar.";
        return;
    }
    shareButton.disabled = true;
    try {
        await grantCalendarAccess(calendarId, user.uid, email);
        if (currentUser === user && ownedSelect.value === calendarId) {
            viewerInput.value = "";
            await loadViewers("Read-only access granted.");
        }
    } catch (error) {
        console.error("Could not share the calendar:", error);
        if (currentUser === user && ownedSelect.value === calendarId) {
            ownerStatus.textContent = "Could not share the calendar. Check the address and try again.";
        }
    } finally {
        shareButton.disabled = ownedSelect.disabled;
    }
});

ownedSelect.addEventListener("change", () => loadViewers());
sharedSelect.addEventListener("change", showSharedEvents);
// Pick up newly created calendars without a page refresh.
window.addEventListener("timeshift:calendars-loaded", (event) => {
    if (currentUser) setOwnedCalendars(event.detail.calendars);
});

watchAuthState(async (user) => {
    currentUser = user;
    stopWatchingShares?.();
    showShares([]);
    setOwnedCalendars([]);
    if (!user) return;

    if (user.emailVerified && user.email) {
        stopWatchingShares = watchCalendarsSharedWith(user.email.toLowerCase(), showShares, (error) => {
            console.error("Could not load shared calendars:", error);
            showShares([]).then(() => {
                if (currentUser === user) sharedStatus.textContent = "Could not load shared calendars.";
            });
        });
    }
    try {
        const calendars = await getUserCalendars(user.uid);
        if (currentUser === user) setOwnedCalendars(calendars);
    } catch (error) {
        console.error("Could not load calendars for sharing:", error);
        if (currentUser === user) ownerStatus.textContent = "Could not load your calendars.";
    }
});
