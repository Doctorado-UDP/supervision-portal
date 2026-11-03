import { getPortalDateKey } from "@/lib/datetime/format";

type MilestoneForOrdering = {
  target_date: string;
  status: string;
};

type MeetingForOrdering = {
  scheduled_at: string;
};

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
