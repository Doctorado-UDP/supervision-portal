"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createStudent,
  type CreateStudentState,
} from "@/app/admin/students/actions";

type AvailableProfile = {
  id: string;
  full_name: string;
  email: string | null;
};

type StudentFormProps = {
  availableProfiles: AvailableProfile[];
  defaultUserId?: string;
};

const initialState: CreateStudentState = {
  error: null,
};

export default function StudentForm({
  availableProfiles,
  defaultUserId,
}: StudentFormProps) {
  const [state, formAction, isPending] = useActionState(
    createStudent,
    initialState
  );

  const initialUserId = availableProfiles.some(
    (profile) => profile.id === defaultUserId
  )
    ? defaultUserId
    : "";

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label
          htmlFor="user_id"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Invited Student account
        </label>

        <select
          id="user_id"
          name="user_id"
          required
          defaultValue={initialUserId}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
        >
          <option value="" disabled>
            Select an invited student
          </option>

          {availableProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name}
              {profile.email ? ` — ${profile.email}` : ""}
            </option>
          ))}
        </select>

        <p className="mt-2 text-xs text-gray-500">
          Invited Student accounts appear here until their supervision record is
          configured.
        </p>
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
          placeholder="e.g. PhD in Political Science"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
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
          defaultValue="active"
          required
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
        >
          <option value="active">Active</option>
          <option value="on_track">On track</option>
          <option value="attention">Needs attention</option>
          <option value="completed">Completed</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Link
          href="/admin/students"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isPending || availableProfiles.length === 0}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Configuring..." : "Configure student"}
        </button>
      </div>
    </form>
  );
}
