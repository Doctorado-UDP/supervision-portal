"use client";

import { useId, useState, useSyncExternalStore } from "react";

import {
  DEFAULT_MEETING_TIME_ZONE,
  formatMeetingDateTime,
  isMeetingTimeZone,
  MEETING_TIME_ZONES,
  toZonedInputValue,
  zonedWallTimeToUtc,
  type MeetingTimeZone,
} from "@/lib/datetime/format";

// The browser's zone never changes while the page is open.
function subscribe() {
  return () => {};
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// The server render uses the default zone, so hydration matches; the
// browser's zone is applied straight after.
function getServerTimeZone() {
  return null;
}

type ZonedDateTimeFieldProps = {
  // Name of the datetime-local value; the zone is sent as "time_zone".
  name: string;
  label: string;
  // Stored instant (ISO) shown when editing an existing record.
  initialValue?: string;
  compact?: boolean;
};

// A date and time typed in Santiago or Amsterdam time, as a wall-clock value
// plus its zone; the server converts it to UTC. The preview shows the
// result in both zones.
export default function ZonedDateTimeField({
  name,
  label,
  initialValue,
  compact = false,
}: ZonedDateTimeFieldProps) {
  const id = useId();
  const browserZone = useSyncExternalStore(
    subscribe,
    getBrowserTimeZone,
    getServerTimeZone
  );
  const [chosenZone, setChosenZone] = useState<MeetingTimeZone | null>(null);
  const [typedValue, setTypedValue] = useState<string | null>(null);

  const zone: MeetingTimeZone =
    chosenZone ??
    (browserZone && isMeetingTimeZone(browserZone)
      ? browserZone
      : DEFAULT_MEETING_TIME_ZONE);

  // Until the time is edited, an existing record is shown in the chosen zone.
  const value =
    typedValue ?? (initialValue ? toZonedInputValue(initialValue, zone) : "");
  const instant = value ? zonedWallTimeToUtc(value, zone) : null;
  const zoneLabel =
    MEETING_TIME_ZONES.find((item) => item.id === zone)?.label ?? zone;

  const labelClass = compact
    ? "mb-1 block text-xs font-medium text-gray-700"
    : "mb-2 block text-sm font-medium text-gray-700";
  const inputClass = compact
    ? "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
    : "w-full rounded-md border border-gray-300 px-3 py-2";

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor={`${id}-value`} className={labelClass}>
            {label}
          </label>
          <input
            id={`${id}-value`}
            name={name}
            type="datetime-local"
            required
            value={value}
            onChange={(event) => setTypedValue(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${id}-zone`} className={labelClass}>
            Time zone
          </label>
          <select
            id={`${id}-zone`}
            name="time_zone"
            value={zone}
            onChange={(event) => {
              const next = event.target.value;
              if (isMeetingTimeZone(next)) {
                setChosenZone(next);
              }
            }}
            className={inputClass}
          >
            {MEETING_TIME_ZONES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {value && (
        <p
          aria-live="polite"
          className={
            instant ? "text-xs text-gray-600" : "text-xs text-red-700"
          }
        >
          {instant
            ? formatMeetingDateTime(instant)
            : `This time does not exist in ${zoneLabel} because the clocks change. Choose another time.`}
        </p>
      )}
    </div>
  );
}
