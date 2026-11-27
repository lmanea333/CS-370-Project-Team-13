// Repeating events
// The database only saves the first date of a repeating event,
// so this figures out all the other dates for the calendar.

import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { getEventRepetitions } from "../firebase/repetitions.js";


// Convert Firestore timestamps to Date objects before comparing or formatting them.
function toDate(value) {
    if (!value) {
        return null;
    }
    if (value.toDate) {
        return value.toDate();
    }
    return new Date(value);
}


// Looks up how often each repeating event repeats
// (daily, weekly, etc) and saves it as event.repeat
export async function addRepeatInfo(events) {
    for (const event of events) {
        if (!event.repetitionId) {
            continue;
        }

        try {
            const repetitions = await getEventRepetitions(event.id);

            if (repetitions[0]) {
                event.repeat = repetitions[0].frequency;
                event.repeatCount = repetitions[0].occurrenceCount;
            }
        } catch (error) {
            console.error("couldn't load repeat for " + event.title, error);
        }
    }
}


// Gives back every time the event happens between rangeStart and rangeEnd.
// Each copy has the new start/end time and a link back to the
// real event (seriesEvent) so Edit and Delete change the whole series.
export function getOccurrencesBetween(event, rangeStart, rangeEnd) {
    const start = toDate(event.startAt);
    const end = toDate(event.endAt);

    // One-time events appear only when their start date is in the requested range.
    if (!event.repeat) {
        if (start >= rangeStart && start <= rangeEnd) {
            return [event];
        }
        return [];
    }

    // How long the event is (so every copy has the same length)
    const length = end ? end - start : 0;

    // The repeat follows the ORIGINAL time zone, so "every Monday 9am Tokyo"
    // stays 9am in Tokyo even when daylight saving time changes somewhere else
    const zone = event.timeZone || "UTC";
    const year = Number(formatInTimeZone(start, zone, "yyyy"));
    const month = Number(formatInTimeZone(start, zone, "MM")) - 1;
    const day = Number(formatInTimeZone(start, zone, "dd"));
    const time = formatInTimeZone(start, zone, "HH:mm:ss");

    const occurrences = [];

    // How many real dates we've counted so far
    let made = 0;

    // Cap the loop so an open-ended series can't run forever.
    for (let count = 0; count < 3000; count++) {
        let date;

        if (event.repeat === "daily") {
            date = new Date(Date.UTC(year, month, day + count));
        } else if (event.repeat === "weekly") {
            date = new Date(Date.UTC(year, month, day + count * 7));
        } else if (event.repeat === "monthly") {
            date = new Date(Date.UTC(year, month + count, day));
        } else if (event.repeat === "yearly") {
            date = new Date(Date.UTC(year + count, month, day));
        } else {
            break;
        }

        // Ex: "2026-11-23T09:00:00" in the original time zone
        const dateText = date.toISOString().slice(0, 10);
        const occurrenceStart = fromZonedTime(dateText + "T" + time, zone);

        // Stop once we're past the dates we need
        if (occurrenceStart > rangeEnd) {
            break;
        }

        // Monthly/yearly: skip months that don't have that day
        // (ex: the 31st in April, or Feb 29 when it's not a leap year)
        const isMonthOrYear =
            event.repeat === "monthly" || event.repeat === "yearly";

        if (isMonthOrYear && date.getUTCDate() !== day) {
            continue;
        }

        // Stop after the number of times the user picked
        made++;
        if (event.repeatCount && made > event.repeatCount) {
            break;
        }

        if (occurrenceStart >= rangeStart) {
            occurrences.push({
                ...event,
                startAt: occurrenceStart,
                endAt: end ? new Date(occurrenceStart.getTime() + length) : null,
                seriesEvent: event
            });
        }
    }

    return occurrences;
}
