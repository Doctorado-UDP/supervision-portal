"use client";

import { useActionState } from "react";

import {
  updateStudentDetails,
  type PlanningActionState,
} from "@/app/admin/students/[studentId]/actions";

type StudentDetailsFormProps = {
  student: {
    id: string;
    programme: string | null;
    start_date: string | null;
    target_completion_date: string | null;
    status: string;
  };

  profile: {
    full_name: string;
  };
};

const initialState: PlanningActionState = {
  error: null,
  success: null,
};

export default function StudentDetailsForm({
  student,
  profile,
}: StudentDetailsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateStudentDetails,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="student_id"
        value={student.id}
      />

      <div>
        <label
          htmlFor="full_name"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Student name
        </label>

        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          defaultValue={profile.full_name}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label
          htmlFor="programme"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Programme
        </label>

        <input
          id="programme"
          name="programme"
          type="text"
          required
          defaultValue={student.programme ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="start_date"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Start date
          </label>

          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            defaultValue={student.start_date ?? ""}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="target_completion_date"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Target completion
          </label>

          <input
            id="target_completion_date"
            name="target_completion_date"
            type="date"
            required
            defaultValue={
              student.target_completion_date ?? ""
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="status"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Status
        </label>

        <select
          id="status"
          name="status"
          defaultValue={student.status}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
        >
          <option value="active">Active</option>
          <option value="on_track">On track</option>
          <option value="attention">
            Needs attention
          </option>
          <option value="completed">
            Completed
          </option>
          <option value="inactive">
            Inactive
          </option>
        </select>
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
        {isPending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}