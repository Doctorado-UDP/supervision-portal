"use client";

import { useActionState } from "react";

import {
  createMilestone,
  type PlanningActionState,
} from "@/app/admin/students/[studentId]/actions";

type MilestoneFormProps = {
  studentId: string;
};

const initialState: PlanningActionState = {
  error: null,
  success: null,
};

export default function MilestoneForm({
  studentId,
}: MilestoneFormProps) {
  const [state, formAction, isPending] = useActionState(
    createMilestone,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="hidden"
        name="student_id"
        value={studentId}
      />

      <div>
        <label
          htmlFor="milestone-title"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Milestone
        </label>

        <input
          id="milestone-title"
          name="title"
          type="text"
          required
          placeholder="e.g. Submit methods chapter"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label
          htmlFor="milestone-description"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Description
        </label>

        <textarea
          id="milestone-description"
          name="description"
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="target_date"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Target date
          </label>

          <input
            id="target_date"
            name="target_date"
            type="date"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="milestone-status"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Status
          </label>

          <select
            id="milestone-status"
            name="status"
            defaultValue="planned"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
          >
            <option value="planned">Planned</option>
            <option value="in_progress">
              In progress
            </option>
            <option value="completed">
              Completed
            </option>
            <option value="cancelled">
              Cancelled
            </option>
          </select>
        </div>
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
        {isPending ? "Adding..." : "Add milestone"}
      </button>
    </form>
  );
}