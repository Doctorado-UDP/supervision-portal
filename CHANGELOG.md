# CHANGELOG

## v0.1.0-beta.7 "Autumn Forge"

### Summary

- Updated Next.js from `16.3.6` to `16.4.5` to fix two critical unauthenticated remote code execution advisories, high-severity issues in Image Optimization and Server Actions, and the seven moderate advisories of the November 2026 Next.js security release.
- Added HTTP security headers, `noindex` on every page and response, and a `robots.txt` that disallows crawling.
- Restricted every Supabase Auth redirect to the production origin and made Netlify build `main` only.
- Hardened the invitation and account Edge Functions so cancelling or retrying an invitation can never delete an account that the invitation did not create.
- Added migration `20261103180000_beta7_security_hardening.sql`, which tightens milestone, function and table privileges and records the production Storage policies in version control.
- Meeting and submission times are entered in Santiago or Amsterdam time, and meetings are shown in both zones.
- Fixed the password recovery flow for links that return a `?code=`.
- Fixed milestone completion dates, dashboard date windows, silently ignored updates, and raw database errors shown to users.
- Added a GitHub Actions CI workflow and Dependabot.

### Security and platform

- Updated Next.js from `16.3.6` to `16.4.5` and `eslint-config-next` from `16.3.1` to `16.4.5`, keeping both exactly pinned. `16.4.4` was deployed first as a hotfix (#11). This fixes the Next.js advisories that affected `16.3.6`, including two critical unauthenticated remote code execution issues (GHSA-2464-fhr4-w9xw in Image Optimization with SVG files, and GHSA-673q-mjm6-r5xr in `use cache` functions) and high-severity issues in Image Optimization (GHSA-cjq9-62q9-8jv4) and Server Actions (GHSA-p3m5-59mp-jv5r). `16.4.5` is the November 2026 security release, which fixes seven moderate advisories (GHSA-mfr8-8qww-v76h, GHSA-vc7v-qv4w-wrv8, GHSA-vvgp-ww4w-46vf, GHSA-rhh4-g77r-r9qj, GHSA-pc58-hwjq-p385, GHSA-7qx7-33qx-rqx2 and GHSA-f3mh-rxg3-f5g2).
- Ran `npm audit fix` to update transitive dependencies within their existing ranges, including `sharp` `0.35.5` and `source-map-js` `1.2.2`, so the production audit reports no high or critical advisories.
- The remaining low-severity KaTeX advisory (GHSA-238p-pmpm-9mq7) comes from copies nested under `rehype-katex` and `remark-math`; its only automatic fix is a breaking downgrade of `rehype-katex`, so it was left unchanged.
- Added security headers on every response: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy` and `X-Robots-Tag: noindex, nofollow`. `next.config.ts` sends them on rendered pages and `netlify.toml` on static files; `X-Powered-By` is no longer sent.
- Added `robots: { index: false, follow: false }` to the root metadata and `app/robots.ts`, which disallows all crawling; `/robots.txt` is public in the proxy.
- Tightened the proxy's public routes to `/login`, `/auth/*`, `/release-notes` and `/robots.txt` exactly, so paths such as `/authors` are no longer treated as public.
- The submission download redirect now sends `Cache-Control: private, no-store` and `Referrer-Policy: no-referrer`, because its signed URL carries a short-lived token.

### Netlify and Auth redirects

- Added `netlify.toml` with `ignore = "exit 0"` for the `deploy-preview` and `branch-deploy` contexts, so only `main` builds even if branch deploys are turned back on in the Netlify UI. Branch deploys and deploy previews are also disabled there.
- Removed the `https://**--supervision-portal.netlify.app/**` entry from the Auth redirect allow-list in `supabase/config.toml` and from the hosted project's URL Configuration. A leading `**` matched any host, so a password-reset or invitation link could have been redirected to an arbitrary site.
- Invitations always redirect to `https://supervision.bgonzalezbustamante.com/auth/confirm`. The Edge Function no longer accepts a redirect origin, and the access actions no longer derive one from request headers.
- Password recovery requests always redirect to the production `/auth/recovery`.

### Edge Functions

- `invite-supervision-user`: an Auth account that already exists for an invited email is no longer linked to the invitation. Cancel and Retry remove an account only if the invitation created it, it has never signed in, it has no supervision records and it is not the primary supervisor's.
- `invite-supervision-user`: the Auth account lookup reads every page of users instead of the first 1,000.
- `delete-supervision-user`: active invitations for the deleted account are matched on the exact email address; `_` and `%` are no longer treated as wildcards. The access page's existing-account check does the same.
- Error messages returned by both functions now reach the access page instead of being replaced by generic text.
- Both functions pin `npm:@supabase/supabase-js@2.112.3` and `jsr:@supabase/functions-js@2.112.3`, matching the application's version.

### Database and Storage

- Added migration `20261103180000_beta7_security_hardening.sql`, applied to the production Supabase project after this release was deployed.
- Students can update only case-level milestones: the policy's `USING` clause now also requires `student_id is null`, so a group member cannot take over a groupmate's personal milestone.
- Revoked the default `EXECUTE` privilege for `PUBLIC` on new functions globally. The per-schema revoke added in beta.6 had no effect, because PostgreSQL grants `EXECUTE` to `PUBLIC` through a global default. New functions must now grant `EXECUTE` explicitly in their migration.
- The orphan-file deletion policy checks for a submission with the SECURITY DEFINER helper `private.submission_file_exists(text)`. The previous subquery ran under the caller's RLS, so a file whose row the caller could no longer see looked orphaned.
- Revoked all table and sequence privileges from `anon` in the `public` schema, and `TRUNCATE`, `TRIGGER`, `REFERENCES` and `MAINTAIN` from `authenticated`, for existing and future tables. The portal never reads tables as `anon`, and these privileges are not governed by RLS.
- Recorded the five production Storage `SELECT` and `INSERT` policies on `storage.objects`, which had been created in the dashboard, unchanged in the migration, so a fresh project reproduces production. There is still no `UPDATE` policy, so stored files cannot be overwritten.
- The `submissions` bucket is defined in the migration (private, 25 MiB) and accepts only `application/pdf`, `application/msword` and `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. The upload form now sends the content type of the checked file extension instead of the type reported by the browser.

### Meetings and dates

- Meeting and submission date-time fields have a Santiago/Amsterdam time zone selector, preset from the browser's zone, with a live preview in both zones. The server converts the wall-clock time with the chosen zone, so the stored time no longer depends on the browser's zone; times that do not exist because of a clock change are rejected.
- Meetings are shown in both zones on the supervision workspace and the student page, for example `04 Nov 2026, 11:00 Santiago (GMT-3) · 15:00 Amsterdam (GMT+1)`.
- Milestone `completed_at` is the Santiago date on which the milestone became completed (it was the UTC date) and is kept when a completed milestone is edited later.
- The admin dashboard's upcoming window uses Santiago dates, matching the supervision workspaces.

### Accounts and recovery

- The recovery page uses the session the browser client has already established from a `?code=` link instead of exchanging the code a second time, which failed.
- Recovery link errors and Supabase Auth password errors are shown as fixed messages; text from the URL is no longer displayed.

### Supervision workspace

- Updates and deletes of feedback, milestones, meetings and submission dates that RLS does not allow now report an error instead of a success message.
- A submission's file is removed only after its database row has been deleted.
- Database errors from supervision configuration and submission uploads are mapped to fixed messages; messages raised by `admin_configure_supervision_case` itself are still shown to the supervisor.

### Development

- Added a GitHub Actions CI workflow (`.github/workflows/ci.yml`) that runs on pull requests and pushes to `main`: `npm ci`, `npm audit --omit=dev --audit-level=high`, lint, and the production build, with no environment variables.
- Added Dependabot (`.github/dependabot.yml`): weekly grouped minor and patch npm updates, grouped security updates, and monthly GitHub Actions updates. Major upgrades are not raised automatically.
- Pinned the Supabase CLI to `2.115.0`.
- Removed unused legacy server actions under `app/admin/students/[studentId]/`.
- Replaced the deprecated `priority` property of `next/image` with `preload`.
- `lib/releases.ts` types `status` as `"Current beta" | "In development"`; the footer falls back to the newest released entry and omits the codename quotes when there is no codename.

---

## v0.1.0-beta.6 "Rustic Peak"

### Summary

- Standardised the Student header Account link so it uses the same bordered control styling as supervisor and staff/admin accounts.
- Fixed sign-out redirects so users remain on the current public or preview host instead of being sent to a Netlify atomic deploy permalink.
- Reordered milestones in supervision workspaces so upcoming targets appear nearest first, overdue open milestones follow, and completed milestones are moved to the bottom.
- Reordered supervision meetings so upcoming meetings appear nearest first and past meetings are grouped below them with the most recent past meeting first.
- Hardened Supabase Data API default privileges ahead of the 30 October 2026 platform change so future public-schema objects require explicit API grants.
- Removed unnecessary anonymous execution access from two authenticated `SECURITY DEFINER` application RPCs while preserving existing application access.
- Updated Next.js from `16.3.1` to `16.3.6` to incorporate upstream security fixes while keeping the framework version exactly pinned.

### Supervision workspace

- Added shared ordering logic used by both supervisor/staff and Student supervision views.
- Non-completed milestones with upcoming target dates are ordered ascending so the nearest target appears first.
- Overdue non-completed milestones follow upcoming milestones, with the most recently overdue target first.
- Completed milestones are kept at the bottom of the list.
- Upcoming supervision meetings are ordered chronologically with the nearest meeting first.
- Past meetings follow upcoming meetings, with the most recent past meeting first.
- Global Timetable ordering is unchanged.

### Navigation and accounts

- Standardised the Student Account link with the bordered button treatment already used for supervisor and staff/admin accounts.
- Changed the sign-out Route Handler to return a relative `Location: /login` redirect after the sign-out POST, using HTTP 303 so Netlify deployment permalinks do not leak into the browser URL.

### Data API and security

- Added migration `20260923223924_harden_data_api_default_privileges.sql`, already applied to the production Supabase project as `20260923223924_harden_data_api_default_privileges`.
- Revoked default table CRUD privileges for `anon`, `authenticated`, and `service_role` on future objects created in the `public` schema; future grants must be explicit in migrations.
- Revoked default function `EXECUTE` privileges for API roles and restricted default sequence privileges for future public-schema objects.
- Existing table privileges were left untouched, so the current application remains unaffected by the default-privilege change.
- Removed unnecessary anonymous `EXECUTE` access from `admin_configure_supervision_case(...)` and `get_case_people(uuid)`.
- Verified after migration that Supabase no longer reports the previous anonymous `SECURITY DEFINER` execution warnings.
- Remaining authenticated `SECURITY DEFINER` notices correspond to deliberate application RPCs with internal authorisation checks and were not changed.
- Updated Next.js from `16.3.1` to `16.3.6`; `npm audit`, lint, and the production build were verified successfully after the update.

### Notes

- The Supabase hardening migration was applied to production before this release.
- The technical `CHANGELOG.md` remains more detailed than the user-facing `/release-notes` page.

---

## v0.1.0-beta.5 "Spring Quartz"

### Summary

- Added student-facing creation and editing of shared supervision milestones from the Student supervision page.
- Students can edit milestone title, description, target date, and status while milestone deletion remains unavailable to students.
- Added case-membership checks in server actions and database policies so students can create and update milestones only within their own supervision case.
- Kept student-created and student-updated milestones at case level rather than attaching them to an individual student record.
- Changed global Timetable milestone ordering to descending target date, matching the newest-first ordering used in supervision views.

### Student milestones

- Added student-facing milestone creation and edit forms to the existing Student supervision page.
- Students can update title, description, target date, and status for shared milestones in their own case.
- Student milestone deletion remains unavailable.
- Server actions verify that the signed-in student belongs to the target supervision case before accepting changes.

### Permissions and database

- Added migration `20260827102951_allow_students_manage_case_milestones.sql`.
- Added case-member `INSERT` and `UPDATE` policies for milestones while retaining the existing supervisor controls.
- Student-created and student-updated milestones are constrained to case-level records (`student_id IS NULL`).
- Applied the migration to the linked hosted Supabase project before deploy-preview testing.

### Timetable

- Changed the global Timetable milestone query from ascending to descending `target_date`.
- Timetable milestone ordering now matches the newest-first target-date ordering already used in supervision views.

### Notes

- Students can manage shared milestone content but cannot delete milestones.
- The technical `CHANGELOG.md` remains separate from the user-facing `/release-notes` page.

---

## v0.1.0-beta.4 "Ivory Monolith"

### Summary

- Added a primary/global-supervisor-only Access area for viewing portal accounts and managing Student and Staff invitations.
- Added automatic invitation acceptance tracking on Auth sign-in so completed onboarding no longer remains marked as pending.
- Added guarded primary-supervisor-only account deletion in Access; unused accounts and empty individual Student setups can be removed while accounts with supervision history, group supervision, or Staff assignments are protected.
- Added in-portal invitation delivery through a JWT-protected Supabase Edge Function, including retry and cancellation of unused onboarding accounts.
- Added an invitation record that securely determines whether a new account becomes a Student or Staff profile.
- Added invited Student accounts to the Students module immediately as setup-required records, while keeping supervision-specific configuration as a separate step.
- Added a personal Account page for signed-in users to update their own name, request an email change, and change their password without changing portal permissions.
- Added UDP branding to the Account page for consistency with the main portal header.
- Added password recovery from the sign-in page with a dedicated recovery flow and non-enumerating recovery messages.
- Added a public, plain-language Release notes page and linked the footer version/codename to it.
- Refined the admin header with right-aligned module buttons and a clear active-module state while keeping UDP branding and the portal title on the left.
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
- Added an Auth-user sign-in trigger to reconcile managed invitations as accepted, including existing invited users who have already signed in.
- Added the JWT-protected `delete-supervision-user` Edge Function for guarded account removal without exposing the service-role credential to the application.

### Student workflow

- Newly invited Student profiles appear immediately in the Students module with a `Setup required` state.
- Student configuration now reuses the invited profile name instead of asking the supervisor to enter the name a second time.
- The Configure action captures programme, start date, target completion date, and status; only then is the `students` record created and the automatic supervision-case setup triggered.
- The Students module now directs new-account creation to Access management rather than presenting a second independent Add student workflow.

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
