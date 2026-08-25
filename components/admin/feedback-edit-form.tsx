"use client";

import { useActionState } from "react";

import {
  updateFeedback,
  type FeedbackActionState,
} from "@/app/admin/supervisions/[caseId]/actions";

type FeedbackEditFormProps = {
  caseId: string;
  feedback: {
    id: string;
    feedback_text: string;
  };
};

const initialState: FeedbackActionState = {
  error: null,
  success: null,
};

export default function FeedbackEditForm({
  caseId,
  feedback,
}: FeedbackEditFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateFeedback,
    initialState
  );

  return (
    <details className="mt-3 rounded-md border border-gray-200 bg-white p-3">
      <summary className="cursor-pointer text-xs font-medium text-gray-700">
        Edit feedback
      </summary>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="case_id" value={caseId} />
        <input type="hidden" name="feedback_id" value={feedback.id} />

        <textarea
          name="feedback_text"
          required
          rows={6}
          defaultValue={feedback.feedback_text}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        />

        <p className="text-xs leading-5 text-gray-500">
          Markdown is supported. Use <code>$...$</code> for inline LaTeX maths
          and <code>$$...$$</code> for display equations.
        </p>

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
          {isPending ? "Saving..." : "Save feedback"}
        </button>
      </form>
    </details>
  );
}
