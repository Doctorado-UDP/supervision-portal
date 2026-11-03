"use client";

import { useActionState } from "react";

import {
  createMeeting,
  type PlanningActionState,
} from "@/app/admin/supervisions/[caseId]/actions";
import ZonedDateTimeField from "@/components/shared/zoned-date-time-field";

type MeetingFormProps = {
  caseId: string;
};

const initialState: PlanningActionState = {
  error: null,
  success: null,
};

export default function MeetingForm({
  caseId,
}: MeetingFormProps) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createMeeting,
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-4"
    >
      <input
        type="hidden"
        name="case_id"
        value={caseId}
      />

      <ZonedDateTimeField
        name="scheduled_local"
        label="Date and time"
      />

      <div>
        <label
          htmlFor="meeting-notes"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Notes
        </label>

        <textarea
          id="meeting-notes"
          name="notes"
          rows={4}
          placeholder="Optional supervision notes"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {isPending
          ? "Adding..."
          : "Add meeting"}
      </button>
    </form>
  );
}
