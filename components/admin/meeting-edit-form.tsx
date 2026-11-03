"use client";

import { useActionState, useId } from "react";

import {
  updateMeeting,
  type PlanningActionState,
} from "@/app/admin/supervisions/[caseId]/actions";
import ZonedDateTimeField from "@/components/shared/zoned-date-time-field";

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

export default function MeetingEditForm({
  caseId,
  meeting,
}: MeetingEditFormProps) {
  const notesId = useId();
  const [state, formAction, isPending] = useActionState(
    updateMeeting,
    initialState
  );

  return (
    <details className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
      <summary className="cursor-pointer text-xs font-medium text-gray-700">
        Edit meeting
      </summary>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="case_id" value={caseId} />
        <input type="hidden" name="meeting_id" value={meeting.id} />

        <ZonedDateTimeField
          name="scheduled_local"
          label="Date and time"
          initialValue={meeting.scheduled_at}
          compact
        />

        <div>
          <label
            htmlFor={notesId}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Notes
          </label>
          <textarea
            id={notesId}
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
          disabled={isPending}
          className="rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </form>
    </details>
  );
}
