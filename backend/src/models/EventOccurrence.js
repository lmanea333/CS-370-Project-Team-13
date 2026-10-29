class EventOccurrence {
    constructor({
        id = null,
        eventId = null,
        repetitionId = null,
        originalStartAt = null,
        startAt = null,
        endAt = null,
        status = "scheduled",
        isException = false,
        createdAt = null,
        updatedAt = null
    } = {}) {
        this.id = id;
        this.eventId = eventId;
        this.repetitionId = repetitionId;
        this.originalStartAt = originalStartAt;
        this.startAt = startAt;
        this.endAt = endAt;
        this.status = status;
        this.isException = isException;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    toFirestore() {
        return {
            eventId: this.eventId,
            repetitionId: this.repetitionId,
            originalStartAt: this.originalStartAt,
            startAt: this.startAt,
            endAt: this.endAt,
            status: this.status,
            isException: this.isException,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromFirestore(document) {
        const data = document.data();

        return new EventOccurrence({
            id: document.id,
            eventId: data.eventId,
            repetitionId: data.repetitionId ?? null,
            originalStartAt: data.originalStartAt ?? null,
            startAt: data.startAt ?? null,
            endAt: data.endAt ?? null,
            status: data.status ?? "scheduled",
            isException: data.isException ?? false,
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null
        });
    }
}

export { EventOccurrence };
export default EventOccurrence;