# CHANGELOG

## v0.1.0-beta.2 "Lunar Maple"

### Summary

- Added full editing for supervision milestones, including title, description, target date, and status, with the latest target dates shown first.
- Added full editing for supervision meetings, including date/time and notes.
- Added an `original_date` field for submissions alongside the editable submission timestamp.
- Changed submission ordering to use `original_date` descending, with the submission timestamp as a secondary sort key.
- Added original-date display to supervisor and student submission views.
- Restricted submission date editing to the primary/global supervisor while preserving existing student and assigned-staff upload/read permissions.
- Added database migrations to backfill existing submission original dates, index the new ordering fields, and align future defaults with the portal's Santiago calendar date.
- Hardened production configuration by pinning Node.js 24 and aligning local Supabase Auth settings with the invitation-only production setup.

### Code changes

`planning and meetings`

- Added inline milestone editing without removing the existing status shortcuts or delete workflow.
- Added inline meeting editing for scheduled date/time and notes.
- Revalidated supervisor, timetable, supervision, and student views after planning-record updates.

`submissions`

- Added the non-null `original_date` column to `public.submissions`.
- Backfilled existing records from their submission timestamp using the portal's Santiago time zone.
- Added global-supervisor-only update permission for submission metadata.
- Added editing controls for original date and submission timestamp in the supervisor view.
- Ordered submissions by newest original date first in both supervisor and student views.
- Retained the submission timestamp as a secondary ordering key when original dates are equal.

`database and infrastructure`

- Added migration `20260824170000_add_submission_original_date.sql`.
- Added migration `20260824171128_fix_submission_original_date_default.sql` to align new submission defaults with the Santiago calendar date.
- Added an index on `case_id`, `original_date`, and `submitted_at` for submission ordering.
- Pinned the application runtime to Node.js 24 through `.nvmrc` and `package.json`.
- Updated local Supabase Auth configuration to mirror the invitation-only production configuration and minimum password requirements.

### Notes

- Existing submissions receive an `original_date` derived from their previous submission timestamp during migration.
- New submissions default `original_date` to the current Santiago date and can subsequently be corrected by the primary/global supervisor.
- Submission files, feedback, versioning, private downloads, and case-scoped access controls are otherwise unchanged.
- The portal remains invitation-only.

---

## v0.1.0-beta.1 "Winter Fjord"

### Summary

- Added the first production-ready beta of the graduate supervision portal.
- Added invitation-only authentication and onboarding through Supabase Auth.
- Added role-specific workflows for the primary supervisor, assigned staff, and students.
- Added individual and group supervision cases with case membership and staff assignment.
- Added student management, supervision milestones, meetings, submissions, and feedback.
- Added case-scoped permissions so assigned staff can access only their assigned supervision cases and students.
- Added private file storage for submissions with case-aware access controls.
- Added Supabase Row Level Security policies and supporting private permission helpers.
- Added reproducible Supabase schema migrations and local project configuration.
- Added production deployment through Netlify with the custom domain [supervision.bgonzalezbustamante.com](https://supervision.bgonzalezbustamante.com).
- Added production Supabase Auth configuration and verified the invitation, onboarding, login, and redirect flows.
- Added personalised site metadata, favicon, footer, and portal branding.
- Completed production smoke testing for supervisor, staff, student, and private-storage workflows.
- Adopted release codenames generated with the [OCPSG Benchmarking LLMs Release Name Generator](https://ocpsg-benchmarking-llms.github.io/release-name-generator/).

### Code changes

`authentication and access control`

- Added email/password authentication using Supabase Auth.
- Added invitation-based onboarding and password creation.
- Added protected supervisor/staff and student routes.
- Added global-supervisor and case-scoped staff permission logic.
- Added server-side and Row Level Security enforcement for case access.

`supervision cases`

- Added individual and group supervision cases.
- Added case membership and assigned staff management.
- Added case-level supervision workspaces.
- Added restricted case configuration for the primary supervisor.
- Retained compatibility with the earlier student-supervisor relationship model.

`students and planning`

- Added student administration.
- Added milestones and supervision meetings.
- Added shared case planning for group supervision.
- Added SavvyCal integration for scheduling supervision meetings.

`submissions and feedback`

- Added private document uploads through the `submissions` Supabase Storage bucket.
- Added submission version and metadata handling.
- Added case-aware file access.
- Added feedback linked to submissions.
- Added signed/private download workflows.

`database and infrastructure`

- Added case-aware Row Level Security policies.
- Added private database helper functions for supervisor, staff, student, case, submission, and Storage permissions.
- Added Supabase schema baseline migrations.
- Added local Supabase CLI configuration.
- Added `.env.example` for required public Supabase environment variables.
- Added production deployment through Netlify.

`branding and production`

- Added custom production domain:
  - [supervision.bgonzalezbustamante.com](https://supervision.bgonzalezbustamante.com)
- Added production Supabase Auth redirects and Site URL configuration.
- Added personalised browser metadata and favicon.
- Updated the site footer with links to Dr. Bastián González-Bustamante and Empiria Lab.
- Completed production smoke testing across all three user roles and private Storage access.

### Notes

- The portal is currently invitation-only.
- The primary supervisor has global access to supervision cases and administrative configuration.
- Assigned staff have operational access only to cases to which they are explicitly assigned.
- Students have access only to their authorised supervision case.
- The `submissions` Storage bucket is private and currently configured with a 25 MiB per-file limit.
- Application data and uploaded submissions are stored in Supabase and are not committed to this repository.
- Institutional branding assets are not covered by the repository's MIT License.

---
