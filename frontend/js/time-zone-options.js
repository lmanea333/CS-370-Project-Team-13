import { getTimeZones } from "@vvo/tzdb";

export function getTimeZoneOptions() {
    return getTimeZones({ includeUtc: true }).map((zone) => {
        const codes = [...new Set([zone.abbreviation, zone.dstAbbreviation].filter(Boolean))];
        let label = zone.currentTimeFormat;

        // Show both abbreviations when the zone observes daylight saving time.
        if (codes.length) {
            const abbreviation = codes.join("/");
            label = zone.alternativeName && label.includes(zone.alternativeName)
                ? label.replace(zone.alternativeName, `${zone.alternativeName} (${abbreviation})`)
                : `${label} (${abbreviation})`;
        }
        if (zone.countryName) label += ` · ${zone.countryName}`;

        // Only the label changes. Events and settings still save the zone ID.
        return { value: zone.name, label };
    });
}
