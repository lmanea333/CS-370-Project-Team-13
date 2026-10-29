class User {
    constructor({
        uid = null,
        displayName = "",
        email = "",
        photoURL = "",
        timeZone = "UTC",
        lastLoginAt = null
    } = {}) {
        this.uid = uid;
        this.displayName = displayName;
        this.email = email;
        this.photoURL = photoURL;
        this.timeZone = timeZone;
        this.lastLoginAt = lastLoginAt;
    }

    toFirestore() {
        return {
            displayName: this.displayName,
            email: this.email,
            photoURL: this.photoURL,
            timeZone: this.timeZone,
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
            timeZone: data.timeZone,
            lastLoginAt: data.lastLoginAt
        });
    }
}

export { User };
export default User;
