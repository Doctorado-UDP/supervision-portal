const PORTAL_TIME_ZONE = "America/Santiago"; 

export function formatPortalDateTime(
  value: string | Date
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  const formatter =
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: PORTAL_TIME_ZONE,
      timeZoneName: "shortOffset",
    });

  const parts =
    formatter.formatToParts(date);

  const timeZone =
    parts.find(
      (part) =>
        part.type === "timeZoneName"
    )?.value ?? "GMT";

  const dateTime = parts
    .filter(
      (part) =>
        part.type !== "timeZoneName"
    )
    .map((part) => part.value)
    .join("")
    .trim();

  return `${dateTime} (${timeZone})`;
}