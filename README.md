# Supervision Portal

A lightweight graduate supervision portal for managing students, individual and group supervision cases, milestones, meetings, submissions, feedback, and controlled portal access.

Built with **Next.js**, **Supabase**, and **Netlify**.

**Current version:** `v0.1.0-beta.7 "Autumn Forge"`

Production: [supervision.bgonzalezbustamante.com](https://supervision.bgonzalezbustamante.com)

User-facing release history is available publicly at `/release-notes` in the deployed portal. Technical release details remain in `CHANGELOG.md`.

Beta.7 is a security-focused release. It updates Next.js to 16.4.5, adds HTTP security headers and `noindex`, restricts Supabase Auth redirects and Netlify builds to production, hardens the invitation Edge Functions and database privileges, records the Storage policies in a migration, and lets meeting times be entered and shown in both Santiago and Amsterdam time.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The application requires a Supabase project configured with the migrations in `supabase/migrations/` and the Edge Functions in `supabase/functions/`.

Checks (also run by CI on every pull request):

```bash
npm audit --omit=dev --audit-level=high
npm run lint
npm run build
```

## Deployment

- **Netlify** builds and deploys `main` only. Branch deploys and deploy previews are disabled in the Netlify UI, and `netlify.toml` skips those builds as well. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Netlify environment; they are inlined at build time.
- **Database:** with the Supabase CLI linked to the project, review `npx supabase db push --linked --dry-run`, then run `npx supabase db push --linked`.
- **Edge Functions:** `npx supabase functions deploy invite-supervision-user delete-supervision-user`. They use the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` that Supabase provides.
- **Auth settings** live in the Supabase dashboard, not in `supabase/config.toml`, which applies to local development:
  - Site URL `https://supervision.bgonzalezbustamante.com`;
  - redirect URLs `https://supervision.bgonzalezbustamante.com/**` only;
  - sign-ups disabled, so accounts are created by invitation;
  - email confirmation and secure email change enabled;
  - invitation and recovery email templates that link to `/auth/confirm` and `/auth/recovery`.

## Licence

The source code is released under the MIT License.

Institutional names, logos, trademarks, and branding assets in `public/branding/` are excluded from the MIT License and remain subject to the rights of their respective owners.
