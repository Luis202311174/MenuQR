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

### Environment variables
This project requires environment variables to connect to your Supabase project and AI services.

1. Copy `.env.example` to `.env.local`.
2. Set the required values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
   - `OPENAI_API_KEY`

Optional keys:
   - `NUTRITION_API_NINJAS_KEY` (for nutrition estimates)
   - `REDIS_URL`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# MenuQR

## Platform administrator setup

Platform-admin access is separate from business-owner and staff permissions. There
is no public administrator registration page. Apply
[`migrations/add_platform_admins.sql`](./migrations/add_platform_admins.sql) in
the Supabase SQL editor, then grant access manually:

1. In Supabase Auth, ensure the intended administrator has an email/password
   sign-in credential. You can set a password for an existing Auth user or
   create the Auth user in the Supabase dashboard. The admin page does not
   provide public account registration.
2. In the Supabase SQL editor, run the commented `INSERT` example at the bottom
   of the migration, replacing `admin@example.com` with that account's email.
   The account's UUID is looked up in `auth.users`; do not store the password in
   the application or migration.
3. Sign in at `/admin/login` with that email and password. Only accounts present in
   `public.platform_admins` can use the platform-admin API.

The service-role key must remain server-side as `SUPABASE_SERVICE_ROLE_KEY`.
The admin API checks the signed-in Supabase user and the database grant on every
request. MenuQR users can be edited and sign-in can be disabled or re-enabled,
but accounts cannot be deleted from this screen. Orders and payment records are
read-only except for order status corrections; order history and activity logs
cannot be deleted. Other admin creates, edits, and deletes are recorded in
`platform_admin_audit_logs` (field names only, not submitted values). Other
deletions remain subject to the database's foreign-key constraints.

The admin home starts with a restaurant directory. Select a restaurant to work
with its scoped profile, menu, orders, staff, promotions, and operations records;
use the sidebar's restaurant control to return to the directory or switch stores.
