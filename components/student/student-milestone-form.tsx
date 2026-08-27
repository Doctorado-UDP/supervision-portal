"use client";

import { useActionState } from "react";

import {
  createStudentMilestone,
  type StudentMilestoneActionState,
} from "@/app/student/actions";

type StudentMilestoneFormProps = {
  caseId: string;
};

const initialState: StudentMilestoneActionState = {
  error: null,
  success: null,
};

export default function StudentMilestoneForm({
  caseId,
}: StudentMilestoneFormProps) {
  const [state, formAction, isPending] = useActionState(
    createStudentMilestone,
    initialState
  );

  return (
    <details className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <summary className="cursor-pointer text-sm font-medium text-gray-800">
        Add milestone
      </summary>

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="case_id" value={caseId} />

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Milestone
          </label>
          <input
            name="title"
            type="text"
            required
            placeholder="e.g. Submit methods chapter"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Target date
            </label>
            <input
              name="target_date"
              type="date"
              required
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              defaultValue="planned"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
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
          {isPending ? "Adding..." : "Add milestone"}
        </button>
      </form>
    </details>
  );
}
