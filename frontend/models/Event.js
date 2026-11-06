class Event {
    constructor({
        id = null,
        calendarId = null,
        createdBy = null,
        title = "",
        description = "",
        startAt = null,
        endAt = null,
        timeZone = "UTC",
        location = "",
        meetingLink = "",
        category = "",
        color = "#315efb",
        status = "scheduled",
        repetitionId = null,
        attendeeIds = [],
        createdAt = null,
        updatedAt = null
    } = {}) {
        this.id = id;
        this.calendarId = calendarId;
        this.createdBy = createdBy;
        this.title = title;
        this.description = description;
        this.startAt = startAt;
        this.endAt = endAt;
        this.timeZone = timeZone;
        this.location = location;
        this.meetingLink = meetingLink;
        this.category = category;
        this.color = color;
        this.status = status;
        this.repetitionId = repetitionId;
        this.attendeeIds = [...attendeeIds];
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    toFirestore() {
        return {
            calendarId: this.calendarId,
            createdBy: this.createdBy,
            title: this.title,
            description: this.description,
            startAt: this.startAt,
            endAt: this.endAt,
            timeZone: this.timeZone,
            location: this.location,
            meetingLink: this.meetingLink,
            category: this.category,
            color: this.color,
            status: this.status,
            repetitionId: this.repetitionId,
            attendeeIds: [...this.attendeeIds],
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromFirestore(document) {
        const data = document.data();

        return new Event({
            id: document.id,
            calendarId: data.calendarId,
            createdBy: data.createdBy,
            title: data.title,
            description: data.description,
            startAt: data.startAt,
            endAt: data.endAt,
            timeZone: data.timeZone,
            location: data.location,
            meetingLink: data.meetingLink ?? "",
            category: data.category ?? "",
            color: data.color ?? "#315efb",
            status: data.status ?? "scheduled",
            repetitionId: data.repetitionId ?? null,
            attendeeIds: data.attendeeIds ?? [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }
}

export{ Event };
export default Event;
