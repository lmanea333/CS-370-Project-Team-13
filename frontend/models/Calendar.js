class Calendar {
    constructor({
        id = null,
        ownerId = null,
        name = "",
        type = "personal",
        description = "",
        color = "#315efb",
        isDefault = false,
        createdAt = null,
        updatedAt = null
    } = {}) {
        this.id = id;
        this.ownerId = ownerId;
        this.name = name;
        this.type = type;
        this.description = description;
        this.color = color;
        this.isDefault = isDefault;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    toFirestore() {
        return {
            ownerId: this.ownerId,
            name: this.name,
            type: this.type,
            description: this.description,
            color: this.color,
            isDefault: this.isDefault,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromFirestore(document) {
        const data = document.data();

        return new Calendar({
            id: document.id,
            ownerId: data.ownerId,
            name: data.name ?? "",
            type: data.type ?? "personal",
            description: data.description ?? "",
            color: data.color ?? "#315efb",
            isDefault: data.isDefault ?? false,
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null
        });
    }
}

export { Calendar };
export default Calendar;