class Repetition {
    constructor({
        id = null,
        eventId = null,
        frequency = "none",
        interval = 1,
        daysOfWeek = [],
        endType = "never",
        endDate = null,
        occurrenceCount = null,
        createdAt = null,
        updatedAt = null
    } = {}) {
        this.id = id;
        this.eventId = eventId;
        this.frequency = frequency;
        this.interval = interval;
        this.daysOfWeek = [...daysOfWeek];
        this.endType = endType;
        this.endDate = endDate;
        this.occurrenceCount = occurrenceCount;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    toFirestore() {
        return {
            eventId: this.eventId,
            frequency: this.frequency,
            interval: this.interval,
            daysOfWeek: [...this.daysOfWeek],
            endType: this.endType,
            endDate: this.endDate,
            occurrenceCount: this.occurrenceCount,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromFirestore(document) {
        const data = document.data();

        return new Repetition({
            id: document.id,
            eventId: data.eventId,
            frequency: data.frequency ?? "none",
            interval: data.interval ?? 1,
            daysOfWeek: data.daysOfWeek ?? [],
            endType: data.endType ?? "never",
            endDate: data.endDate ?? null,
            occurrenceCount: data.occurrenceCount ?? null,
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null
        });
    }
}

export { Repetition };
export default Repetition;