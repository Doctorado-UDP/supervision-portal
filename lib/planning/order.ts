const PORTAL_TIME_ZONE = "America/Santiago";

type MilestoneForOrdering = {
  target_date: string;
  status: string;
};

type MeetingForOrdering = {
  scheduled_at: string;
};

function getPortalDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: PORTAL_TIME_ZONE,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to determine the portal date.");
  }

  return `${year}-${month}-${day}`;
}

export function sortMilestonesForWorkspace<T extends MilestoneForOrdering>(
  milestones: T[],
  now = new Date()
) {
  const today = getPortalDateKey(now);

  return [...milestones].sort((a, b) => {
    const aCompleted = a.status === "completed";
    const bCompleted = b.status === "completed";

    if (aCompleted !== bCompleted) {
      return aCompleted ? 1 : -1;
    }

    if (aCompleted && bCompleted) {
      return b.target_date.localeCompare(a.target_date);
    }

    const aUpcoming = a.target_date >= today;
    const bUpcoming = b.target_date >= today;

    if (aUpcoming !== bUpcoming) {
      return aUpcoming ? -1 : 1;
    }

    return aUpcoming
      ? a.target_date.localeCompare(b.target_date)
      : b.target_date.localeCompare(a.target_date);
  });
}

export function sortMeetingsForWorkspace<T extends MeetingForOrdering>(
  meetings: T[],
  now = new Date()
) {
  const nowTime = now.getTime();

  return [...meetings].sort((a, b) => {
    const aTime = new Date(a.scheduled_at).getTime();
    const bTime = new Date(b.scheduled_at).getTime();
    const aUpcoming = aTime >= nowTime;
    const bUpcoming = bTime >= nowTime;

    if (aUpcoming !== bUpcoming) {
      return aUpcoming ? -1 : 1;
    }

    return aUpcoming ? aTime - bTime : bTime - aTime;
  });
}
