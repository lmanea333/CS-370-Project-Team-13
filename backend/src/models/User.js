class User {
    constructor({
        uid = null,
        displayName = "",
        email = "",
        photoURL = "",
        timeZone = "UTC",
        accountStatus= "active",
        lastLoginAt = null,
        createdAt = null

    } = {}) {
        this.uid = uid;
        this.displayName = displayName;
        this.email = email;
        this.photoURL = photoURL;
        this.timeZone = timeZone;
        this.accountStatus = accountStatus;
        this.createdAt = createdAt;
        this.lastLoginAt = lastLoginAt;
    }

    toFirestore() {
        return {
            displayName: this.displayName,
            email: this.email,
            photoURL: this.photoURL,
            timeZone: this.timeZone,
            accountStatus: this.accountStatus,
            createdAt: this.createdAt,
            lastLoginAt: this.lastLoginAt
        };
    }

    static fromFirestore(document) {
        const data = document.data();

        return new User({
            uid: document.id,
            displayName: data.displayName,
            email: data.email,
            photoURL: data.photoURL,
            timeZone: data.timeZone ?? "UTC",
            accountStatus: data.accountStatus ?? "active",
            createdAt: data.createdAt ?? null,
            lastLoginAt: data.lastLoginAt ?? null
          
        });
    }
}

export { User };
export default User;
