# Beta.4 hosted Supabase Auth check

Before merging `v0.1.0-beta.4 "Ivory Monolith"`, confirm the hosted Supabase Auth URL configuration matches the repository's production-oriented `supabase/config.toml`:

- Site URL: `https://supervision.bgonzalezbustamante.com`
- Redirect URLs:
  - `https://supervision.bgonzalezbustamante.com/**`
  - `https://**--supervision-portal.netlify.app/**`
- Email rate limit: 30 per hour (custom SMTP)
- Minimum interval between repeated Auth emails: 60 seconds
- Minimum password length: 10 characters
- Public sign-up remains disabled

`npx supabase db push --linked` applies database migrations only. Hosted Auth settings must be checked/applied separately through Supabase Auth configuration or `supabase config push` with authorised project credentials.

This file is a temporary beta.4 verification note and should be removed before merge.
