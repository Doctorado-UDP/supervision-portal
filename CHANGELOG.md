# CHANGELOG

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
Adopted release codenames generated with the [OCPSG Benchmarking LLMs Release Name Generator](https://ocpsg-benchmarking-llms.github.io/release-name-generator/).

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