"use client";

import { useActionState } from "react";

import {
  updateStudentMilestone,
  type StudentMilestoneActionState,
} from "@/app/student/actions";

type StudentMilestoneEditFormProps = {
  caseId: string;
  milestone: {
    id: string;
    title: string;
    description: string | null;
    target_date: string;
    status: string;
  };
};

const initialState: StudentMilestoneActionState = {
  error: null,
  success: null,
};

export default function StudentMilestoneEditForm({
  caseId,
  milestone,
}: StudentMilestoneEditFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateStudentMilestone,
    initialState
  );

  return (
    <details className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
      <summary className="cursor-pointer text-xs font-medium text-gray-700">
        Edit milestone
      </summary>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="case_id" value={caseId} />
        <input type="hidden" name="milestone_id" value={milestone.id} />

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Milestone
          </label>
          <input
            name="title"
            type="text"
            required
            defaultValue={milestone.title}
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
            defaultValue={milestone.description ?? ""}
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
              defaultValue={milestone.target_date}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              defaultValue={milestone.status}
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
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </form>
    </details>
  );
}
