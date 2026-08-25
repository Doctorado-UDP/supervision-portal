"use client";

import { deleteFeedback } from "@/app/admin/supervisions/[caseId]/feedback-delete-actions";

type FeedbackDeleteFormProps = {
  caseId: string;
  feedbackId: string;
};

export default function FeedbackDeleteForm({
  caseId,
  feedbackId,
}: FeedbackDeleteFormProps) {
  return (
    <form
      action={deleteFeedback}
      className="mt-3"
      onSubmit={(event) => {
        if (!window.confirm("Delete this feedback? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="case_id" value={caseId} />
      <input type="hidden" name="feedback_id" value={feedbackId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Delete feedback
      </button>
    </form>
  );
}
