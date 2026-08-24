"use client";

import { useActionState, useState } from "react";

import {
  updateMeeting,
  type PlanningActionState,
} from "@/app/admin/supervisions/[caseId]/actions";

type MeetingEditFormProps = {
  caseId: string;
  meeting: {
    id: string;
    scheduled_at: string;
    notes: string | null;
  };
};

const initialState: PlanningActionState = {
  error: null,
  success: null,
};

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function MeetingEditForm({
  caseId,
  meeting,
}: MeetingEditFormProps) {
  const [localDateTime, setLocalDateTime] = useState(
    toLocalDateTimeInput(meeting.scheduled_at)
  );

  const [state, formAction, isPending] = useActionState(
    updateMeeting,
    initialState
  );

  const isoDateTime = localDateTime
    ? new Date(localDateTime).toISOString()
    : "";

  return (
    <details className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
      <summary className="cursor-pointer text-xs font-medium text-gray-700">
        Edit meeting
      </summary>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="case_id" value={caseId} />
        <input type="hidden" name="meeting_id" value={meeting.id} />
        <input type="hidden" name="scheduled_at" value={isoDateTime} />

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Date and time
          </label>
          <input
            type="datetime-local"
            required
            value={localDateTime}
            onChange={(event) => setLocalDateTime(event.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={meeting.notes ?? ""}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {state.error}
          </p>
        )}

        {state.success && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
            {state.success}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !localDateTime}
          className="rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </form>
    </details>
  );
}
