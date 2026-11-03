"use client";

import { useActionState, useId } from "react";

import {
  updateSubmissionMetadata,
  type SubmissionActionState,
} from "@/app/admin/supervisions/[caseId]/actions";
import ZonedDateTimeField from "@/components/shared/zoned-date-time-field";

type SubmissionEditFormProps = {
  caseId: string;
  submission: {
    id: string;
    submitted_at: string;
    original_date: string;
  };
};

const initialState: SubmissionActionState = {
  error: null,
  success: null,
};

export default function SubmissionEditForm({
  caseId,
  submission,
}: SubmissionEditFormProps) {
  const originalDateId = useId();
  const [state, formAction, isPending] = useActionState(
    updateSubmissionMetadata,
    initialState
  );

  return (
    <details className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
      <summary className="cursor-pointer text-xs font-medium text-gray-700">
        Edit dates
      </summary>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="case_id" value={caseId} />
        <input type="hidden" name="submission_id" value={submission.id} />

        <div>
          <label
            htmlFor={originalDateId}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Original date
          </label>
          <input
            id={originalDateId}
            name="original_date"
            type="date"
            required
            defaultValue={submission.original_date}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <ZonedDateTimeField
          name="submitted_local"
          label="Submission date and time"
          initialValue={submission.submitted_at}
          compact
        />

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
          {isPending ? "Saving..." : "Save dates"}
        </button>
      </form>
    </details>
  );
}
