# Ivory Monolith preview smoke test

Use the deploy preview for PR beta.4 and verify:

1. Sign-in page shows **Forgot password?** and the footer version links to `/release-notes`.
2. `/release-notes` is public and shows beta.4 through beta.1 in plain language.
3. Signed-in users can open `/account`, update their display name, and see their role as read-only.
4. Password change requires at least 10 characters.
5. The primary/global supervisor can open `/admin/access` and sees existing accounts plus invitation management.
6. Assigned staff cannot open `/admin/access`.
7. A managed Student invitation creates a student-role profile after Auth user creation.
8. A managed Staff invitation creates an admin-role profile, but case access remains dependent on case assignment.
9. Retry/cancel is available only for pending/failed invitations and refuses to remove accounts with supervision activity.
10. Password recovery sends a non-enumerating response and the newest recovery link reaches `/auth/recovery`.

This file is a temporary beta.4 verification note and should be removed before merge.
