class Reminder {
    constructor({
        id = null,
        eventId = null,
        occurrenceId = null,
        userId = null,
        minutesBefore = 10,
        deliveryMethod = "in-app",
        status = "pending",
        scheduledFor = null,
        sentAt = null,
        createdAt = null,
        updatedAt = null
    } = {}) {
        this.id = id;
        this.eventId = eventId;
        this.occurrenceId = occurrenceId;
        this.userId = userId;
        this.minutesBefore = minutesBefore;
        this.deliveryMethod = deliveryMethod;
        this.status = status;
        this.scheduledFor = scheduledFor;
        this.sentAt = sentAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    toFirestore() {
        return {
            eventId: this.eventId,
            occurrenceId: this.occurrenceId,
            userId: this.userId,
            minutesBefore: this.minutesBefore,
            deliveryMethod: this.deliveryMethod,
            status: this.status,
            scheduledFor: this.scheduledFor,
            sentAt: this.sentAt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromFirestore(document) {
        const data = document.data();

        return new Reminder({
            id: document.id,
            eventId: data.eventId,
            occurrenceId: data.occurrenceId ?? null,
            userId: data.userId,
            minutesBefore: data.minutesBefore ?? 10,
            deliveryMethod: data.deliveryMethod ?? "in-app",
            status: data.status ?? "pending",
            scheduledFor: data.scheduledFor ?? null,
            sentAt: data.sentAt ?? null,
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null
        });
    }
}

export { Reminder };
export default Reminder;