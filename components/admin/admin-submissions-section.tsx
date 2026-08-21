import Link from "next/link";

import FeedbackForm from "@/components/admin/feedback-form";
import SubmissionUploadForm from "@/components/submissions/submission-upload-form";

import { formatPortalDateTime } from "@/lib/datetime/format";
import { createClient } from "@/lib/supabase/server";

type AdminSubmissionsSectionProps = {
  studentId: string;
};

const SUPERVISOR_EMAIL =
  "bastian.gonzalez.b@mail.udp.cl";

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

export default async function AdminSubmissionsSection({
  studentId,
}: AdminSubmissionsSectionProps) {
  const supabase =
    await createClient();

  // ============================================================
  // RESOLVE STUDENT -> SUPERVISION CASE
  // ============================================================

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("case_members")
    .select("case_id")
    .eq(
      "student_id",
      studentId
    )
    .single();

  if (
    membershipError ||
    !membership
  ) {
    console.error(
      membershipError
    );

    throw new Error(
      "Unable to resolve the student's supervision case."
    );
  }

  const caseId =
    membership.case_id;

  // ============================================================
  // CASE SUBMISSIONS
  // ============================================================

  const {
    data: submissions,
    error: submissionsError,
  } = await supabase
    .from("submissions")
    .select(
      "id, title, version, file_name, file_size_bytes, submitted_at, uploaded_by"
    )
    .eq(
      "case_id",
      caseId
    )
    .order(
      "submitted_at",
      {
        ascending: false,
      }
    );

  if (
    submissionsError
  ) {
    console.error(
      submissionsError
    );

    throw new Error(
      "Unable to load submissions."
    );
  }

  // ============================================================
  // UPLOADERS
  // ============================================================

  const uploaderIds = [
    ...new Set(
      (submissions ?? []).map(
        (submission) =>
          submission.uploaded_by
      )
    ),
  ];

  let uploaderProfiles: {
    id: string;
    full_name: string;
    email: string | null;
    role: string;
  }[] = [];

  if (
    uploaderIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role"
      )
      .in(
        "id",
        uploaderIds
      );

    if (error) {
      console.error(
        error
      );

      throw new Error(
        "Unable to load submission uploader information."
      );
    }

    uploaderProfiles =
      data ?? [];
  }

  const uploaderMap =
    new Map(
      uploaderProfiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  // ============================================================
  // FEEDBACK
  // ============================================================

  const submissionIds =
    (submissions ?? []).map(
      (submission) =>
        submission.id
    );

  let feedback: {
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
      console.error(
        error
      );

      throw new Error(
        "Unable to load submission feedback."
      );
    }

    feedback =
      data ?? [];
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

    existing.push(
      item
    );

    feedbackMap.set(
      item.submission_id,
      existing
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <section className="grid gap-6 lg:grid-cols-5">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-3">
        <h2 className="text-lg font-semibold text-gray-950">
          Submissions and feedback
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Versioned documents shared
          within this supervision
          case.
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

                  const uploader =
                    uploaderMap.get(
                      submission.uploaded_by
                    );

                  const uploaderLabel =
                    uploader?.email?.toLowerCase() ===
                    SUPERVISOR_EMAIL.toLowerCase()
                      ? "supervisor"
                      : uploader?.role ===
                          "admin"
                        ? "staff"
                        : uploader?.role ===
                            "student"
                          ? "student"
                          : null;

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
                            {formatPortalDateTime(
                              submission.submitted_at
                            )}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Uploaded by{" "}
                            {uploader?.full_name ??
                              "Unknown user"}

                            {uploaderLabel
                              ? ` (${uploaderLabel})`
                              : ""}
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
                                    {formatPortalDateTime(
                                      item.created_at
                                    )}
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
          Upload on behalf of student
        </h2>

        <p className="mt-1 text-sm leading-6 text-gray-500">
          Upload a PDF or Word
          document directly to this
          supervision&apos;s shared
          submission record.
        </p>

        <div className="mt-6">
          <SubmissionUploadForm
            caseId={
              caseId
            }
          />
        </div>
      </div>
    </section>
  );
}