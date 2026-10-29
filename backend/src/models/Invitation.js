class Invitation {
    constructor({
        id = null,
        calendarId = null,
        invitedBy = null,
        invitedUserId = null,
        invitedEmail = "",
        role = "viewer",
        status = "pending",
        sentAt = null,
        respondedAt = null,
        expiresAt = null
    } = {}) {
        this.id = id;
        this.calendarId = calendarId;
        this.invitedBy = invitedBy;
        this.invitedUserId = invitedUserId;
        this.invitedEmail = invitedEmail;
        this.role = role;
        this.status = status;
        this.sentAt = sentAt;
        this.respondedAt = respondedAt;
        this.expiresAt = expiresAt;
    }

    toFirestore() {
        return {
            calendarId: this.calendarId,
            invitedBy: this.invitedBy,
            invitedUserId: this.invitedUserId,
            invitedEmail: this.invitedEmail,
            role: this.role,
            status: this.status,
            sentAt: this.sentAt,
            respondedAt: this.respondedAt,
            expiresAt: this.expiresAt
        };
    }

    static fromFirestore(document) {
        const data = document.data();

        return new Invitation({
            id: document.id,
            calendarId: data.calendarId,
            invitedBy: data.invitedBy,
            invitedUserId: data.invitedUserId ?? null,
            invitedEmail: data.invitedEmail ?? "",
            role: data.role ?? "viewer",
            status: data.status ?? "pending",
            sentAt: data.sentAt ?? null,
            respondedAt: data.respondedAt ?? null,
            expiresAt: data.expiresAt ?? null
        });
    }
}

export { Invitation };
export default Invitation;