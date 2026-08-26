# Supervision Portal

A lightweight graduate supervision portal for managing students, individual and group supervision cases, milestones, meetings, submissions, feedback, and controlled portal access.

Built with **Next.js**, **Supabase**, and **Netlify**.

**Current version:** `v0.1.0-beta.4 "Ivory Monolith"`

Production: [supervision.bgonzalezbustamante.com](https://supervision.bgonzalezbustamante.com)

User-facing release history is available publicly at `/release-notes` in the deployed portal. Technical release details remain in `CHANGELOG.md`.

Beta.4 access management includes guarded account deletion: accounts with supervision history, group supervision, or active Staff assignments are protected from accidental removal.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The application requires a Supabase project configured with the migrations in `supabase/migrations/` and the Edge Functions in `supabase/functions/`.

## Licence

The source code is released under the MIT License.

Institutional names, logos, trademarks, and branding assets in `public/branding/` are excluded from the MIT License and remain subject to the rights of their respective owners.
