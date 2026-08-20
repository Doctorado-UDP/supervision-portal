import Link from "next/link";

import FeedbackForm from "@/components/admin/feedback-form";

import SubmissionUploadForm from "@/components/submissions/submission-upload-form";

import {
  createClient,
} from "@/lib/supabase/server";

type AdminSubmissionsSectionProps = {
  studentId: string;
};

function formatBytes(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Europe/Amsterdam",
    }
  ).format(
    new Date(value)
  );
}

export default async function AdminSubmissionsSection({
  studentId,
}: AdminSubmissionsSectionProps) {
  const supabase =
    await createClient();

  const {
    data: submissions,
    error: submissionsError,
  } = await supabase
    .from("submissions")
    .select(
      "id, title, version, file_name, file_size_bytes, submitted_at"
    )
    .eq(
      "student_id",
      studentId
    )
    .order(
      "submitted_at",
      {
        ascending: false,
      }
    );

  if (submissionsError) {
    console.error(
      submissionsError
    );

    throw new Error(
      "Unable to load submissions."
    );
  }

  const submissionIds =
    (submissions ?? []).map(
      (submission) =>
        submission.id
    );

  let feedback:
    {
      id: string;
      submission_id: string;
      feedback_text: string;
      created_at: string;
    }[] = [];

  if (
    submissionIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("feedback")
      .select(
        "id, submission_id, feedback_text, created_at"
      )
      .in(
        "submission_id",
        submissionIds
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (error) {
      console.error(error);

      throw new Error(
        "Unable to load submission feedback."
      );
    }

    feedback = data ?? [];
  }

  const feedbackMap =
    new Map<
      string,
      typeof feedback
    >();

  for (
    const item of feedback
  ) {
    const existing =
      feedbackMap.get(
        item.submission_id
      ) ?? [];

    existing.push(item);

    feedbackMap.set(
      item.submission_id,
      existing
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-5">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-3">
        <h2 className="text-lg font-semibold text-gray-950">
          Submissions and feedback
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Versioned student documents and supervisor feedback.
        </p>

        <div className="mt-6">
          {!submissions ||
          submissions.length ===
            0 ? (
            <p className="rounded-lg bg-gray-50 px-4 py-6 text-sm text-gray-500">
              No submissions have
              been uploaded.
            </p>
          ) : (
            <div className="space-y-6">
              {submissions.map(
                (submission) => {
                  const items =
                    feedbackMap.get(
                      submission.id
                    ) ?? [];

                  return (
                    <article
                      key={
                        submission.id
                      }
                      className="rounded-lg border border-gray-200 p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {
                                submission.title
                              }
                            </h3>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                              Version{" "}
                              {
                                submission.version
                              }
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-gray-600">
                            {
                              submission.file_name
                            }{" "}
                            ·{" "}
                            {formatBytes(
                              Number(
                                submission.file_size_bytes
                              )
                            )}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Uploaded{" "}
                            {formatDate(
                              submission.submitted_at
                            )}
                          </p>
                        </div>

                        <Link
                          href={`/submissions/${submission.id}/download`}
                          className="h-fit rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Download
                        </Link>
                      </div>

                      <div className="mt-5 border-t border-gray-100 pt-5">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Feedback
                        </h4>

                        {items.length ===
                        0 ? (
                          <p className="mt-2 text-sm text-gray-500">
                            No feedback
                            posted yet.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {items.map(
                              (
                                item
                              ) => (
                                <div
                                  key={
                                    item.id
                                  }
                                  className="rounded-md bg-gray-50 p-4"
                                >
                                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                    {
                                      item.feedback_text
                                    }
                                  </p>

                                  <p className="mt-2 text-xs text-gray-500">
                                    {
                                      formatDate(
                                        item.created_at
                                      )
                                    }
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        )}

                        <FeedbackForm
                          studentId={
                            studentId
                          }
                          submissionId={
                            submission.id
                          }
                        />
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h2 className="text-lg font-semibold text-gray-950">
          Upload submission
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          You may also upload a
          document on behalf of the
          student.
        </p>

        <div className="mt-6">
          <SubmissionUploadForm
            studentId={
              studentId
            }
          />
        </div>
      </div>
    </section>
  );
}