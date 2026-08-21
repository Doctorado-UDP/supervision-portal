import Link from "next/link";
import { notFound } from "next/navigation";

import AdminSubmissionsSection from "@/components/admin/admin-submissions-section";
import MeetingForm from "@/components/admin/meeting-form";
import MilestoneForm from "@/components/admin/milestone-form";
import StudentDetailsForm from "@/components/admin/student-details-form";

import { SITE_CONFIG } from "@/lib/config/site";
import { formatPortalDateTime } from "@/lib/datetime/format";
import { createClient } from "@/lib/supabase/server";

import {
  deleteMeeting,
  deleteMilestone,
  updateMilestoneStatus,
} from "./actions";

type StudentPageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

function formatStudentStatus(
  status: string
) {
  switch (status) {
    case "on_track":
      return "On track";

    case "attention":
      return "Needs attention";

    case "completed":
      return "Completed";

    case "inactive":
      return "Inactive";

    default:
      return "Active";
  }
}

function formatMilestoneStatus(
  status: string
) {
  switch (status) {
    case "in_progress":
      return "In progress";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return "Planned";
  }
}

export default async function StudentPage({
  params,
}: StudentPageProps) {
  const {
    studentId,
  } = await params;

  const supabase =
    await createClient();

  // ============================================================
  // STUDENT RECORD
  // ============================================================

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select(
      "id, user_id, programme, start_date, target_completion_date, status"
    )
    .eq(
      "id",
      studentId
    )
    .maybeSingle();

  if (
    studentError ||
    !student
  ) {
    notFound();
  }

  // ============================================================
  // SUPERVISION CASE
  // ============================================================
  //
  // The route remains student-based for now:
  //
  // /admin/students/[studentId]
  //
  // But supervision content is now loaded through the student's
  // current case:
  //
  // studentId -> case_members -> caseId
  // ============================================================

  const {
    data: caseMembership,
    error: caseMembershipError,
  } = await supabase
    .from("case_members")
    .select("case_id")
    .eq(
      "student_id",
      studentId
    )
    .single();

  if (
    caseMembershipError ||
    !caseMembership
  ) {
    console.error(
      caseMembershipError
    );

    throw new Error(
      "Unable to load supervision case."
    );
  }

  const caseId =
    caseMembership.case_id;

  // ============================================================
  // PROFILE + SHARED SUPERVISION DATA
  // ============================================================

  const [
    profileResult,
    milestonesResult,
    meetingsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, email"
      )
      .eq(
        "id",
        student.user_id
      )
      .single(),

    supabase
      .from("milestones")
      .select(
        "id, title, description, target_date, status, completed_at"
      )
      .eq(
        "case_id",
        caseId
      )
      .order(
        "target_date",
        {
          ascending: true,
        }
      ),

    supabase
      .from("meetings")
      .select(
        "id, scheduled_at, notes"
      )
      .eq(
        "case_id",
        caseId
      )
      .order(
        "scheduled_at",
        {
          ascending: false,
        }
      ),
  ]);

  if (
    profileResult.error ||
    !profileResult.data
  ) {
    console.error(
      profileResult.error
    );

    throw new Error(
      "Unable to load the student's profile."
    );
  }

  if (
    milestonesResult.error ||
    meetingsResult.error
  ) {
    console.error(
      milestonesResult.error,
      meetingsResult.error
    );

    throw new Error(
      "Unable to load supervision information."
    );
  }

  const profile =
    profileResult.data;

  const milestones =
    milestonesResult.data ?? [];

  const meetings =
    meetingsResult.data ?? [];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}

      <div>
        <Link
          href="/admin/students"
          className="text-sm font-medium text-gray-600 hover:text-gray-950"
        >
          ← Students
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
              {profile.full_name}
            </h1>

            <p className="mt-2 text-gray-600">
              {student.programme}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {profile.email}
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700">
            {formatStudentStatus(
              student.status
            )}
          </span>
        </div>
      </div>

      {/* STUDENT DETAILS */}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-950">
          Student details
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Programme, timetable and
          overall supervision status.
        </p>

        <div className="mt-6 max-w-3xl">
          <StudentDetailsForm
            student={
              student
            }
            profile={
              profile
            }
          />
        </div>
      </section>

      {/* MILESTONES */}

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-3">
          <h2 className="text-lg font-semibold text-gray-950">
            Milestones
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Shared planned outputs,
            deadlines and progress
            for this supervision.
          </p>

          <div className="mt-6">
            {milestones.length ===
            0 ? (
              <p className="rounded-lg bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No milestones have
                been added.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {milestones.map(
                  (
                    milestone
                  ) => (
                    <div
                      key={
                        milestone.id
                      }
                      className="py-5"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row">
                        <div>
                          <p className="font-medium text-gray-900">
                            {
                              milestone.title
                            }
                          </p>

                          {milestone.description && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                              {
                                milestone.description
                              }
                            </p>
                          )}

                          <p className="mt-2 text-sm text-gray-500">
                            Target:{" "}
                            {
                              milestone.target_date
                            }
                          </p>
                        </div>

                        <span className="h-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {formatMilestoneStatus(
                            milestone.status
                          )}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {milestone.status !==
                          "completed" && (
                          <form
                            action={
                              updateMilestoneStatus
                            }
                          >
                            <input
                              type="hidden"
                              name="milestone_id"
                              value={
                                milestone.id
                              }
                            />

                            <input
                              type="hidden"
                              name="student_id"
                              value={
                                student.id
                              }
                            />

                            <input
                              type="hidden"
                              name="status"
                              value="completed"
                            />

                            <button
                              type="submit"
                              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Mark completed
                            </button>
                          </form>
                        )}

                        {milestone.status ===
                          "planned" && (
                          <form
                            action={
                              updateMilestoneStatus
                            }
                          >
                            <input
                              type="hidden"
                              name="milestone_id"
                              value={
                                milestone.id
                              }
                            />

                            <input
                              type="hidden"
                              name="student_id"
                              value={
                                student.id
                              }
                            />

                            <input
                              type="hidden"
                              name="status"
                              value="in_progress"
                            />

                            <button
                              type="submit"
                              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Start
                            </button>
                          </form>
                        )}

                        <form
                          action={
                            deleteMilestone
                          }
                        >
                          <input
                            type="hidden"
                            name="milestone_id"
                            value={
                              milestone.id
                            }
                          />

                          <input
                            type="hidden"
                            name="student_id"
                            value={
                              student.id
                            }
                          />

                          <button
                            type="submit"
                            className="rounded-md px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* ADD MILESTONE */}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-950">
            Add milestone
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            The milestone will be
            shared by all students in
            this supervision case.
          </p>

          <div className="mt-6">
            <MilestoneForm
              studentId={
                student.id
              }
            />
          </div>
        </div>
      </section>

      {/* MEETINGS */}

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-3">
          <h2 className="text-lg font-semibold text-gray-950">
            Supervision meetings
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Shared meetings and
            supervision notes for
            this supervision case.
          </p>

          <div className="mt-6">
            {meetings.length ===
            0 ? (
              <p className="rounded-lg bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No meetings have been
                recorded.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {meetings.map(
                  (
                    meeting
                  ) => (
                    <div
                      key={
                        meeting.id
                      }
                      className="py-5"
                    >
                      <p className="font-medium text-gray-900">
                        {formatPortalDateTime(
                          meeting.scheduled_at
                        )}
                      </p>

                      {meeting.notes && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                          {
                            meeting.notes
                          }
                        </p>
                      )}

                      <form
                        action={
                          deleteMeeting
                        }
                        className="mt-3"
                      >
                        <input
                          type="hidden"
                          name="meeting_id"
                          value={
                            meeting.id
                          }
                        />

                        <input
                          type="hidden"
                          name="student_id"
                          value={
                            student.id
                          }
                        />

                        <button
                          type="submit"
                          className="text-xs font-medium text-red-700 hover:text-red-900"
                        >
                          Delete meeting
                        </button>
                      </form>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* ADD MEETING */}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-950">
            Add meeting
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Meetings are booked
            through SavvyCal. Add the
            confirmed meeting here
            to maintain the shared
            supervision record.
          </p>

          <a
            href={
              SITE_CONFIG.savvyCalUrl
            }
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-gray-700 hover:text-gray-950"
          >
            Open SavvyCal ↗
          </a>

          <div className="mt-6">
            <MeetingForm
              studentId={
                student.id
              }
            />
          </div>
        </div>
      </section>

      {/* SHARED SUBMISSIONS */}

      <AdminSubmissionsSection
        studentId={
          student.id
        }
      />
    </div>
  );
}