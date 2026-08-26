# CHANGELOG

## v0.1.0-beta.4 "Ivory Monolith"

### Summary

- Added a primary/global-supervisor-only Access area for viewing portal accounts and managing Student and Staff invitations.
- Added in-portal invitation delivery through a JWT-protected Supabase Edge Function, including retry and cancellation of unused onboarding accounts.
- Added an invitation record that securely determines whether a new account becomes a Student or Staff profile.
- Added a personal Account page for signed-in users to update their own name, request an email change, and change their password without changing portal permissions.
- Added password recovery from the sign-in page with a dedicated recovery flow and non-enumerating recovery messages.
- Added a public, plain-language Release notes page and linked the footer version/codename to it.
- Centralised release identity in `lib/releases.ts` so the footer and release-notes page use the same current release record.
- Updated production-oriented Supabase configuration for the deployed portal and Netlify previews.
- Removed unused Next.js starter SVG assets from `public/` while retaining the active UDP branding asset.

### Access and authentication

- Added `public.access_invitations` with primary-supervisor-only RLS policies and explicit Student/Staff intended roles.
- Updated the Auth new-user trigger so managed Staff invitations create `admin` profiles, while unmanaged/manual Auth users continue to default to `student`.
- Added `accept_own_access_invitation()` so onboarding marks managed invitations complete without granting users broader invitation-table access.
- Added `update_own_profile_name()` so self-service display-name changes cannot be used to alter the profile role.
- Staff invitations now use the same first-time password onboarding flow as Student invitations.
- Invitation cancellation/retry refuses to remove an onboarding account once it has supervision activity or assignments.
- The Edge Function uses Supabase's service role only inside the Supabase runtime; no service-role credential is added to Netlify or browser code.

### Production configuration

- Set the Auth Site URL in `supabase/config.toml` to `https://supervision.bgonzalezbustamante.com`.
- Added the production domain and Netlify deploy-preview pattern to Auth redirect URLs.
- Increased the configured email-send rate limit to 30 per hour and set a one-minute minimum interval between repeated Auth emails.
- Disabled seed loading by default for the production-first repository workflow.
- Aligned the configured Storage file-size limit with the portal's existing 25 MB submission limit.

### Notes

- The technical `CHANGELOG.md` remains separate from the user-facing `/release-notes` page.
- Account role and supervision assignments remain administrative data and are not editable from the personal Account page.
- Only the primary/global supervisor can manage invitations.
- The hosted Supabase Auth configuration must be synchronised separately from database migrations; `db push` does not apply `config.toml` Auth settings.

---

## v0.1.0-beta.3 "Brisk Forge"

### Summary

- Added editing for existing feedback while preserving case-scoped permissions.
- Added Markdown rendering for feedback, including GitHub-flavoured Markdown features.
- Added LaTeX mathematical notation using inline `$...$` and display `$$...$$` syntax rendered with KaTeX.
- Added explicit posted and edited date/time metadata using the existing feedback `created_at` and `updated_at` timestamps.
- Added global-supervisor-only feedback deletion with confirmation.
- Added global-supervisor-only submission deletion, including its private Storage file and associated feedback.
- Limited milestones, meetings, submissions, and feedback histories to five visible items at a time with pagination.
- Added the current release version and codename to the README and site footer.

### Notes

- Existing plain-text feedback remains valid and renders as normal Markdown text.
- Raw HTML in feedback remains disabled.
- Feedback editing remains case-scoped: the primary/global supervisor may edit all feedback, while assigned staff may edit only their own feedback. Only the primary/global supervisor may delete feedback.
- Migration `20260825084421_restrict_feedback_deletion.sql` removes assigned-staff feedback deletion at the database-policy level.
- Migration `20260825090109_restrict_submission_deletion.sql` restricts persisted submission and file deletion to the primary/global supervisor while preserving uploader cleanup of failed-upload orphan files.
- Pagination is client-side within each supervision view and preserves the existing newest-first ordering of milestones, meetings, and submissions.

---

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
