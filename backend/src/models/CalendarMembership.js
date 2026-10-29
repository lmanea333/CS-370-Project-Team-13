class CalendarMembership {
    constructor({
        id = null,
        calendarId = null,
        userId = null,
        role = "viewer",
        status = "active",
        invitationId = null,
        joinedAt = null,
        updatedAt = null
    } = {}) {
        this.id = id;
        this.calendarId = calendarId;
        this.userId = userId;
        this.role = role;
        this.status = status;
        this.invitationId = invitationId;
        this.joinedAt = joinedAt;
        this.updatedAt = updatedAt;
    }

    toFirestore() {
        return {
            calendarId: this.calendarId,
            userId: this.userId,
            role: this.role,
            status: this.status,
            invitationId: this.invitationId,
            joinedAt: this.joinedAt,
            updatedAt: this.updatedAt
        };
    }

    static fromFirestore(document) {
        const data = document.data();

        return new CalendarMembership({
            id: document.id,
            calendarId: data.calendarId,
            userId: data.userId,
            role: data.role ?? "viewer",
            status: data.status ?? "active",
            invitationId: data.invitationId ?? null,
            joinedAt: data.joinedAt ?? null,
            updatedAt: data.updatedAt ?? null
        });
    }
}

export { CalendarMembership };
export default CalendarMembership;