import { collection, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { watchAuthState } from "../firebase/auth.js";
import { db } from "../firebase/config.js";
import { updateReminder } from "../firebase/reminders.js";
import { getDueReminders } from "./due-reminders.js";

const bell = document.createElement("details");
bell.className = "reminder-bell";
bell.hidden = true;
// Use a native dropdown so it works with a keyboard.
bell.innerHTML = `
    <summary><span aria-hidden="true">🔔</span> Reminders <span class="reminder-count" hidden></span></summary>
    <div class="reminder-panel">
        <p class="reminder-status" role="status"></p>
        <ul class="reminder-list"></ul>
    </div>
`;
const navbar = document.querySelector(".navbar");
navbar.insertBefore(bell, navbar.querySelector(".sign-out"));

const count = bell.querySelector(".reminder-count");
const status = bell.querySelector(".reminder-status");
const list = bell.querySelector(".reminder-list");

let reminders;
let events;
let stopWatching = [];
let timer;
let lastList = "";
let couldNotLoad = false;

function renderReminders() {
    clearTimeout(timer);
    if (bell.hidden) return;

    const now = Date.now();
    const ready = reminders && events;
    const due = ready && !couldNotLoad ? getDueReminders(reminders, events, now) : [];
    const message = couldNotLoad ? "Reminders couldn’t load. Try refreshing."
        : !ready ? "Loading reminders..." : due.length ? "" : "No reminders due.";

    // Keep the current buttons in place unless the list changes.
    const key = JSON.stringify([message, due]);
    if (lastList !== key) {
        lastList = key;
        count.textContent = due.length;
        count.hidden = due.length === 0;
        status.textContent = message;
        list.replaceChildren();
        for (const reminder of due) {
            const item = document.createElement("li");
            const title = document.createElement("span");
            title.textContent = reminder.title || "Untitled event";
            const dismiss = document.createElement("button");
            dismiss.type = "button";
            dismiss.className = "btn-gray";
            dismiss.textContent = "Dismiss";
            dismiss.setAttribute("aria-label", `Dismiss reminder for ${title.textContent}`);
            dismiss.addEventListener("click", async () => {
                dismiss.disabled = true;
                try {
                    // Keep the reminder in the account, but stop showing it as due.
                    await updateReminder(reminder.id, { status: "sent", sentAt: serverTimestamp() });
                } catch (error) {
                    console.error("Could not dismiss reminder:", error);
                    if (dismiss.isConnected) {
                        status.textContent = "Couldn’t dismiss this reminder. Try again.";
                        dismiss.disabled = false;
                    }
                }
            });
            item.append(title, dismiss);
            list.append(item);
        }
    }

    // Time can pass without Firestore sending an update.
    timer = setTimeout(renderReminders, 15_000);
}

function watchList(name, field, uid, onChange) {
    return onSnapshot(query(collection(db, name), where(field, "==", uid)), (snapshot) => {
        onChange(snapshot.docs.map((row) => ({ ...row.data(), id: row.id })));
        renderReminders();
    }, (error) => {
        console.error("Could not load reminders:", error);
        couldNotLoad = true;
        renderReminders();
    });
}

watchAuthState((user) => {
    stopWatching.forEach((stop) => stop());
    stopWatching = [];
    reminders = null;
    events = null;
    couldNotLoad = false;
    lastList = "";
    bell.open = false;
    bell.hidden = !user;
    list.replaceChildren();
    renderReminders();
    if (!user) return;

    // Both lists are scoped to the current user. Deleted events disappear from the bell.
    stopWatching = [
        watchList("reminders", "userId", user.uid, (rows) => { reminders = rows; }),
        watchList("events", "createdBy", user.uid, (rows) => { events = rows; })
    ];
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderReminders();
});
document.addEventListener("click", (event) => {
    if (!bell.contains(event.target)) bell.open = false;
});
bell.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && bell.open) {
        bell.open = false;
        bell.querySelector("summary").focus();
    }
});
