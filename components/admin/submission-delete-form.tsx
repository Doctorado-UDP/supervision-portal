"use client";

import { deleteSubmission } from "@/app/admin/supervisions/[caseId]/submission-delete-actions";

type SubmissionDeleteFormProps = {
  caseId: string;
  submissionId: string;
};

export default function SubmissionDeleteForm({
  caseId,
  submissionId,
}: SubmissionDeleteFormProps) {
  return (
    <form
      action={deleteSubmission}
      className="mt-3"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Delete this submission, its uploaded file, and all associated feedback? This cannot be undone."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="case_id" value={caseId} />
      <input type="hidden" name="submission_id" value={submissionId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Delete submission
      </button>
    </form>
  );
}
