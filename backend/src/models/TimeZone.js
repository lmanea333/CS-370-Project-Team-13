class TimeZone {
    constructor({
        timeZoneId = "UTC",
        displayName = "",
        city = "",
        country = ""
    } = {}) {
        this.timeZoneId = timeZoneId;
        this.displayName = displayName;
        this.city = city;
        this.country = country;
    }

    isValid() {
        return TimeZone.isValidTimeZone(this.timeZoneId);
    }

    formatDateTime(date, locale = "en-US") {
        if (!this.isValid()) {
            throw new Error(
                `Invalid time-zone identifier: ${this.timeZoneId}`
            );
        }

        return new Intl.DateTimeFormat(locale, {
            timeZone: this.timeZoneId,
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    }

    static isValidTimeZone(timeZoneId) {
        try {
            new Intl.DateTimeFormat("en-US", {
                timeZone: timeZoneId
            });

            return true;
        } catch {
            return false;
        }
    }
}

export { TimeZone };
export default TimeZone;