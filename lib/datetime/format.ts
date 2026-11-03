export const PORTAL_TIME_ZONE = "America/Santiago";

// Meetings are arranged between Santiago and Amsterdam (Leiden), so their
// times are entered in either zone and always shown in both.
export const MEETING_TIME_ZONES = [
  { id: "America/Santiago", label: "Santiago" },
  { id: "Europe/Amsterdam", label: "Amsterdam" },
] as const;

export type MeetingTimeZone =
  (typeof MEETING_TIME_ZONES)[number]["id"];

export const DEFAULT_MEETING_TIME_ZONE: MeetingTimeZone =
  "America/Santiago";

export function isMeetingTimeZone(
  value: string
): value is MeetingTimeZone {
  return MEETING_TIME_ZONES.some((zone) => zone.id === value);
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  let formatter = partsFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsFormatters.set(timeZone, formatter);
  }

  const values: Record<string, number> = {};

  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

// Offset of timeZone from UTC at the given instant, in milliseconds.
function getOffsetMs(instant: number, timeZone: string) {
  const parts = getZonedParts(new Date(instant), timeZone);
  const wallAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return wallAsUtc - Math.floor(instant / 1000) * 1000;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

// The calendar date in the portal's zone (Santiago), as YYYY-MM-DD.
export function getPortalDateKey(date: Date = new Date()) {
  const parts = getZonedParts(date, PORTAL_TIME_ZONE);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

// The value for an <input type="datetime-local"> showing the instant as wall
// time in timeZone (YYYY-MM-DDTHH:mm).
export function toZonedInputValue(
  value: string | Date,
  timeZone: string
) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = getZonedParts(date, timeZone);

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

// Converts wall time in timeZone (YYYY-MM-DDTHH:mm, as a datetime-local input
// sends it) to the UTC instant. Returns null for malformed input and for
// times that do not exist because the clocks go forward. A time that occurs
// twice because the clocks go back resolves to the earlier instant.
export function zonedWallTimeToUtc(
  local: string,
  timeZone: string
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);

  if (Number.isNaN(wallAsUtc)) {
    return null;
  }

  // The zone has at most two offsets around any wall time; take them from a
  // day either side and keep the candidates that map back to the same wall
  // time.
  const dayMs = 24 * 60 * 60 * 1000;
  const offsets = new Set([
    getOffsetMs(wallAsUtc - dayMs, timeZone),
    getOffsetMs(wallAsUtc, timeZone),
    getOffsetMs(wallAsUtc + dayMs, timeZone),
  ]);

  const candidates = [...offsets]
    .map((offset) => wallAsUtc - offset)
    .filter(
      (instant) => toZonedInputValue(new Date(instant), timeZone) === local
    )
    .sort((a, b) => a - b);

  return candidates.length > 0 ? new Date(candidates[0]) : null;
}

function formatInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${pick("day")} ${pick("month")} ${pick("year")}`,
    time: `${pick("hour")}:${pick("minute")}`,
    offset: pick("timeZoneName") || "GMT",
  };
}

export function formatPortalDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const zoned = formatInZone(date, PORTAL_TIME_ZONE);

  return `${zoned.date}, ${zoned.time} (${zoned.offset})`;
}

// A meeting time in both zones, e.g.
// "04 Nov 2026, 11:00 Santiago (GMT-3) · 15:00 Amsterdam (GMT+1)".
// The date is repeated when it differs between the zones.
export function formatMeetingDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const zoned = MEETING_TIME_ZONES.map((zone) => ({
    ...formatInZone(date, zone.id),
    label: zone.label,
  }));
  const sameDate = zoned.every((item) => item.date === zoned[0].date);

  return zoned
    .map((item, index) => {
      const time = `${item.time} ${item.label} (${item.offset})`;
      return index === 0 || !sameDate ? `${item.date}, ${time}` : time;
    })
    .join(" · ");
}
