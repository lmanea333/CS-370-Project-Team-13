function toMillis(value) {
    if (value == null) return NaN;
    return typeof value.toMillis === "function"
        ? value.toMillis()
        : new Date(value).getTime();
}

export function getDueReminders(reminders, events, now = Date.now()) {
    const eventsById = new Map(events.map((event) => [event.id, event]));
    const due = new Map();

    for (const reminder of reminders) {
        if (reminder.status !== "pending" || reminder.deliveryMethod !== "in-app") continue;
        const event = eventsById.get(reminder.eventId);
        const scheduledFor = toMillis(reminder.scheduledFor);
        if (!event || !Number.isFinite(scheduledFor) || scheduledFor > now) continue;

        // Ignore an old reminder if the event has already moved.
        const minutes = reminder.minutesBefore;
        if (!Number.isFinite(minutes) || minutes < 0
            || scheduledFor !== toMillis(event.startAt) - minutes * 60_000) continue;

        due.set(reminder.id, { id: reminder.id, title: event.title, scheduledFor });
    }

    return [...due.values()].sort((a, b) => a.scheduledFor - b.scheduledFor);
}
