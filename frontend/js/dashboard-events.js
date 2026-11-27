import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { getOccurrencesBetween } from "./repeats.js";

const day = 24 * 60 * 60 * 1000;

export function getDashboardEvents(events, filter, now, timeZone) {
    const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
    const start = filter === "today" ? fromZonedTime(today + "T00:00:00", timeZone) : now;
    const end = new Date(now.getTime() + (filter === "week" ? 7 : 90) * day);

    return events.flatMap((event) => {
        if (!Number.isFinite(event.startAt?.getTime())) return [];
        // Keep later one-time events and series that haven't started yet on the list.
        const dates = event.repeat && event.startAt <= end
            ? getOccurrencesBetween(event, start, end)
            : [event];

        return dates.filter(({ startAt }) => {
            if (filter === "today") return formatInTimeZone(startAt, timeZone, "yyyy-MM-dd") === today;
            if (filter === "week") return startAt >= start && startAt <= end;
            return startAt >= start;
        });
    }).sort((a, b) => a.startAt - b.startAt);
}
