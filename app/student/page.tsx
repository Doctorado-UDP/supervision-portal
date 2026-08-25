import Link from "next/link";
import { redirect } from "next/navigation";

import SiteFooter from "@/components/shared/site-footer";
import StudentHeader from "@/components/student/student-header";
import RichFeedback from "@/components/feedback/rich-feedback";
import PaginatedList from "@/components/shared/paginated-list";
import SubmissionUploadForm from "@/components/submissions/submission-upload-form";

import { SITE_CONFIG } from "@/lib/config/site";
import { formatPortalDateTime } from "@/lib/datetime/format";
import { createClient } from "@/lib/supabase/server";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatStatus(status: string) {
  switch (status) {
    case "on_track": return "On track";
    case "attention": return "Needs attention";
    case "completed": return "Completed";
    case "inactive": return "Inactive";
    default: return "Active";
  }
}

function formatMilestoneStatus(status: string) {
  switch (status) {
    case "in_progress": return "In progress";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return "Planned";
  }
}

function formatCaseType(caseType: string) {
  return caseType === "group" ? "Group supervision" : "Individual supervision";
}

function formatStaffRole(staffRole: string | null) {
  return staffRole === "supervisor" ? "Supervisor" : "Staff";
}

type CasePerson = {
  profile_id: string;
  full_name: string;
  participant_type: string;
  staff_role: string | null;
};

export default async function StudentPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, programme, start_date, target_completion_date, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (studentError) {
    throw new Error("Unable to load student record.");
  }

  if (!student) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <StudentHeader fullName={profile.full_name} />
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-gray-950">
              Account setup in progress
            </h1>
            <p className="mt-3 text-gray-600">
              Your account is active, but your supervision record has not yet
              been configured.
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { data: caseMembership, error: caseMembershipError } = await supabase
    .from("case_members")
    .select("case_id")
    .eq("student_id", student.id)
    .single();

  if (caseMembershipError || !caseMembership) {
    console.error(caseMembershipError);
    throw new Error("Unable to load supervision case.");
  }

  const caseId = caseMembership.case_id;

  const [
    supervisionCaseResult,
    casePeopleResult,
    submissionsResult,
    milestonesResult,
    meetingsResult,
  ] = await Promise.all([
    supabase
      .from("supervision_cases")
      .select("id, title, case_type, programme, start_date, target_completion_date, status")
      .eq("id", caseId)
      .single(),
    supabase.rpc("get_case_people", { p_case_id: caseId }),
    supabase
      .from("submissions")
      .select("id, title, version, file_name, file_size_bytes, submitted_at, original_date, uploaded_by")
      .eq("case_id", caseId)
      .order("original_date", { ascending: false })
      .order("submitted_at", { ascending: false }),
    supabase
      .from("milestones")
      .select("id, title, description, target_date, status")
      .eq("case_id", caseId)
      .order("target_date", { ascending: false }),
    supabase
      .from("meetings")
      .select("id, scheduled_at, notes")
      .eq("case_id", caseId)
      .order("scheduled_at", { ascending: false }),
  ]);

  if (
    supervisionCaseResult.error ||
    !supervisionCaseResult.data ||
    casePeopleResult.error ||
    submissionsResult.error ||
    milestonesResult.error ||
    meetingsResult.error
  ) {
    console.error(
      supervisionCaseResult.error,
      casePeopleResult.error,
      submissionsResult.error,
      milestonesResult.error,
      meetingsResult.error
    );
    throw new Error("Unable to load supervision information.");
  }

  const supervisionCase = supervisionCaseResult.data;
  const casePeople = (casePeopleResult.data ?? []) as CasePerson[];
  const submissions = submissionsResult.data ?? [];
  const milestones = milestonesResult.data ?? [];
  const meetings = meetingsResult.data ?? [];

  const caseStudents = casePeople.filter(
    (person) => person.participant_type === "student"
  );
  const caseStaff = casePeople.filter(
    (person) => person.participant_type === "staff"
  );
  const personMap = new Map(
    casePeople.map((person) => [person.profile_id, person])
  );

  const submissionIds = submissions.map((submission) => submission.id);
  let feedback: {
    id: string;
    submission_id: string;
    author_id: string;
    feedback_text: string;
    created_at: string;
    updated_at: string;
  }[] = [];

  if (submissionIds.length > 0) {
    const { data, error } = await supabase
      .from("feedback")
      .select("id, submission_id, author_id, feedback_text, created_at, updated_at")
      .in("submission_id", submissionIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      throw new Error("Unable to load feedback.");
    }

    feedback = data ?? [];
  }

  const feedbackMap = new Map<string, typeof feedback>();
  for (const item of feedback) {
    const existing = feedbackMap.get(item.submission_id) ?? [];
    existing.push(item);
    feedbackMap.set(item.submission_id, existing);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <StudentHeader fullName={profile.full_name} />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-6 py-8">
        <section>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-gray-500">Your supervision</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">
                {supervisionCase.title}
              </h1>
              <p className="mt-2 text-gray-600">
                {supervisionCase.programme ?? student.programme}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-gray-900 px-3 py-1 text-sm font-medium text-white">
                  {formatCaseType(supervisionCase.case_type)}
                </span>
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                  {formatStatus(supervisionCase.status)}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500 sm:text-right">
              <p>
                Signed in as <span className="font-medium text-gray-700">{profile.full_name}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">
              {supervisionCase.case_type === "group" ? "Students" : "Student"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {supervisionCase.case_type === "group"
                ? "Students participating in this supervision."
                : "Student participating in this supervision."}
            </p>
            <div className="mt-5 space-y-3">
              {caseStudents.length === 0 ? (
                <p className="text-sm text-gray-500">No students are currently assigned.</p>
              ) : (
                caseStudents.map((person) => (
                  <div
                    key={person.profile_id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                  >
                    <p className="font-medium text-gray-900">{person.full_name}</p>
                    {person.profile_id === userId && (
                      <span className="text-xs font-medium text-gray-500">You</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">Supervision team</h2>
            <p className="mt-1 text-sm text-gray-500">
              Supervisor and staff assigned to this supervision.
            </p>
            <div className="mt-5 space-y-3">
              {caseStaff.length === 0 ? (
                <p className="text-sm text-gray-500">No supervision staff are currently assigned.</p>
              ) : (
                caseStaff.map((person) => (
                  <div
                    key={person.profile_id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                  >
                    <p className="font-medium text-gray-900">{person.full_name}</p>
                    <span className="text-xs font-medium text-gray-500">
                      {formatStaffRole(person.staff_role)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-950">Submissions</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Documents and feedback shared within your supervision, ordered by
              original date with the most recent first.
            </p>

            <PaginatedList className="mt-6 space-y-5" ariaLabel="Submissions pagination">
              {submissions.length === 0 ? (
                <p className="rounded-lg bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  No submissions uploaded yet.
                </p>
              ) : (
                submissions.map((submission) => {
                  const items = feedbackMap.get(submission.id) ?? [];
                  const uploader = personMap.get(submission.uploaded_by);
                  const uploadedByCurrentUser = submission.uploaded_by === userId;

                  return (
                    <article
                      key={submission.id}
                      className="rounded-lg border border-gray-200 p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {submission.title}{" "}
                            <span className="font-normal text-gray-500">
                              — Version {submission.version}
                            </span>
                          </h3>
                          <p className="mt-2 text-sm text-gray-600">
                            {submission.file_name} · {formatBytes(Number(submission.file_size_bytes))}
                          </p>
                          <p className="mt-1 text-xs font-medium text-gray-600">
                            Original date: {submission.original_date}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Submitted {formatPortalDateTime(submission.submitted_at)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Uploaded by{" "}
                            <span className="font-medium text-gray-700">
                              {uploader?.full_name ?? "Unknown participant"}
                            </span>
                            {uploadedByCurrentUser ? " (you)" : ""}
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
                        <h4 className="text-sm font-semibold text-gray-900">Feedback</h4>
                        {items.length === 0 ? (
                          <p className="mt-2 text-sm text-gray-500">No feedback posted yet.</p>
                        ) : (
                          <PaginatedList className="mt-3 space-y-3" ariaLabel="Feedback pagination">
                            {items.map((item) => {
                              const author = personMap.get(item.author_id);
                              return (
                                <div key={item.id} className="rounded-md bg-gray-50 p-4">
                                  <RichFeedback>{item.feedback_text}</RichFeedback>
                                  <div className="mt-3 border-t border-gray-200 pt-2">
                                    <p className="text-xs font-medium text-gray-700">
                                      {author?.full_name ?? "Unknown author"}
                                      {author?.participant_type === "staff"
                                        ? ` (${formatStaffRole(author.staff_role).toLowerCase()})`
                                        : ""}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {formatPortalDateTime(item.created_at)}
                                      {new Date(item.updated_at).getTime() >
                                      new Date(item.created_at).getTime() + 1000
                                        ? " · Edited"
                                        : ""}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </PaginatedList>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </PaginatedList>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">Upload submission</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Upload a PDF or Word document to your shared supervision record.
            </p>
            <div className="mt-6">
              <SubmissionUploadForm caseId={caseId} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">Milestones</h2>
            <p className="mt-1 text-sm text-gray-500">
              Shared deadlines and planned outputs for this supervision.
            </p>
            <PaginatedList className="mt-5 space-y-4" ariaLabel="Milestones pagination">
              {milestones.length === 0 ? (
                <p className="text-sm text-gray-500">No milestones.</p>
              ) : (
                milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="border-b border-gray-100 pb-4 last:border-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-gray-900">{milestone.title}</p>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {formatMilestoneStatus(milestone.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Target: {milestone.target_date}
                    </p>
                    {milestone.description && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                        {milestone.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </PaginatedList>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-950">Supervision meetings</h2>
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm leading-6 text-gray-700">
                Use SavvyCal to book a supervision meeting. Confirmed meetings
                will be added to the portal by your supervisor or a member of staff.
              </p>
              <a
                href={SITE_CONFIG.savvyCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Book a supervision meeting
              </a>
            </div>
            <PaginatedList className="mt-5 space-y-4" ariaLabel="Meetings pagination">
              {meetings.length === 0 ? (
                <p className="text-sm text-gray-500">No meetings recorded.</p>
              ) : (
                meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="border-b border-gray-100 pb-4 last:border-0"
                  >
                    <p className="font-medium text-gray-900">
                      {formatPortalDateTime(meeting.scheduled_at)}
                    </p>
                    {meeting.notes && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                        {meeting.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </PaginatedList>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
