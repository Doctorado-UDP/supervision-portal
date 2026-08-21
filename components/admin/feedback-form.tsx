"use client";

import {
  useActionState,
} from "react";

import {
  createFeedback,
  type FeedbackActionState,
} from "@/app/admin/supervisions/[caseId]/actions";

type FeedbackFormProps = {
  caseId: string;
  submissionId: string;
};

const initialState: FeedbackActionState =
  {
    error: null,
    success: null,
  };

export default function FeedbackForm({
  caseId,
  submissionId,
}: FeedbackFormProps) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createFeedback,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mt-4 space-y-3"
    >
      <input
        type="hidden"
        name="case_id"
        value={caseId}
      />

      <input
        type="hidden"
        name="submission_id"
        value={submissionId}
      />

      <div>
        <label
          htmlFor={`feedback-${submissionId}`}
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Add feedback
        </label>

        <textarea
          id={`feedback-${submissionId}`}
          name="feedback_text"
          required
          rows={4}
          placeholder="General feedback on this submission"
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
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {isPending
          ? "Saving..."
          : "Post feedback"}
      </button>
    </form>
  );
}