This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Scheduled reservation cleanup

Apply `supabase/10_secure_scheduled_functions.sql` after the existing Supabase SQL scripts. It restricts reservation cleanup and view-count RPCs to the service role.

For automated cleanup, set `CRON_SECRET` in the production environment and as a GitHub Actions repository secret with the same long random value. Set the repository variable `PRODUCTION_SITE_URL` to the deployed site URL. The workflow then calls the protected cleanup endpoint every 15 minutes.

## Local authentication setup

Account creation and Google sign-in do not require Frugl to be deployed, but they do require a reachable Supabase project. For local testing, use a development Supabase project rather than a production project.

1. Copy `.env.example` to `.env.local` and fill in the Supabase URL, publishable key, and server secret key.
2. In Supabase, set the Auth **Site URL** to `http://localhost:3000` and add `http://localhost:3000/**` to the redirect URL allowlist for local development. Use the exact production callback URL in production rather than a wildcard.
3. Run `npm run dev`, then create an account. If email confirmation is enabled, complete the link sent by Supabase; it returns to the local callback route.

To brand Google sign-in, set the app name to **Frugl** in Google Auth Platform **Branding**, create a Web OAuth client, and configure its client ID and secret in Supabase Auth > Providers > Google. Add `http://localhost:3000` as a JavaScript origin and use the exact Supabase callback URL shown in the Google provider settings as an authorized redirect URI. Google may require brand verification. A Supabase custom Auth domain is needed if the Google screen should show a Frugl domain instead of the default Supabase project domain.

In Supabase Auth > **Sessions**, keep the JWT expiry at its default one hour. On plans that support session controls, a reasonable starting point is a 30-day maximum lifetime and 7-day inactivity timeout; enable single-session only if users should be limited to one device. These limits are enforced when sessions refresh, not immediately. The app's sign-out clears the current browser session; suspended accounts are blocked by application checks and database policies.

## Auth/database migration

After scripts `01`–`10` have been applied, run `supabase/11_auth_authorization_and_indexes.sql` once in the Supabase SQL Editor. It enforces active-account access, narrows message/offer/notification updates to their intended columns, validates conversation participants against the listing owner, and adds indexes for the repository's inbox, dashboard, offer, review, and report queries.

For account profile details, also run `supabase/12_public_profile_details.sql` once in the Supabase SQL Editor. It adds public region, city, and bio fields and backfills location values from existing profiles.

The repository currently stores SQL as numbered standalone scripts, not a Supabase CLI migrations directory. To apply the script from a machine with `psql`, use the database connection string from Supabase:

```powershell
psql "<SUPABASE_DATABASE_CONNECTION_STRING>" -v ON_ERROR_STOP=1 -f supabase\11_auth_authorization_and_indexes.sql
psql "<SUPABASE_DATABASE_CONNECTION_STRING>" -v ON_ERROR_STOP=1 -f supabase\12_public_profile_details.sql
```

Do not rerun the base schema scripts against an already initialized project.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
