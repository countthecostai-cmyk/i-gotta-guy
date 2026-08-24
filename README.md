# I Gotta Guy

**"Need something done? We got a guy."**

A local services marketplace connecting customers with local service providers ("Guys") — lawn care, cleaning, hauling, handyman work, painting, and more. Built as a general-purpose marketplace: new service categories are added through the admin dashboard, not code changes.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4, Turbopack)
- **Supabase** — Postgres, Auth (email/password + roles), Row Level Security, Storage
- **Stripe Connect** — marketplace payments (customer charge → platform fee → provider payout), with a demo-mode fallback so the full loop works before Stripe is configured
- Deployed on **Vercel**

## Getting started

1. Copy `.env.example` to `.env.local` and fill in Supabase credentials (see below).
2. `npm install`
3. `npm run dev`

Without Supabase configured, the marketing site (`/`, `/services`, `/how-it-works`, etc.) still renders fully. Anything behind auth (`/app`, `/guy`, `/admin`) shows a friendly "not connected yet" page until step 4 below.

### 4. Set up Supabase

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations/` in order (via `supabase db push`, the SQL editor, or the Supabase MCP tools):
   - `0001_init.sql` — schema
   - `0002_rls.sql` — Row Level Security policies
   - `0003_seed_catalog.sql` — starter service catalog (lawn care, cleaning, hauling, handyman, painting)
3. Copy the project URL, anon key, and service role key into `.env.local` (and into Vercel's project env vars for production).
4. Create your own admin account: sign up normally, then in the Supabase SQL editor run:
   ```sql
   update profiles set role = 'admin' where id = '<your-auth-user-id>';
   ```

### 5. Payments (optional — demo mode works without this)

The app runs on a **demo payment processor** by default (`src/lib/payments/demo-processor.ts`) — it simulates successful charges/payouts so the full request → pay → match → complete → payout loop is testable end-to-end with zero real money movement, clearly marked `isLive: false` everywhere it matters.

To go live:
1. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
2. Point a Stripe webhook at `/api/webhooks/stripe` for `checkout.session.completed`.
3. Onboard each Guy through Stripe Connect Express and store their connected account id on `guy_profiles.stripe_connect_account_id`.

See `src/lib/payments/stripe-processor.ts` for the full integration boundary.

## Architecture

- `src/lib/domain/` — framework-free business logic: the pricing engine (`pricing.ts`), the job lifecycle state machine (`job-state-machine.ts`), and money helpers (integer cents everywhere).
- `src/lib/actions/` — server actions, the only way the UI mutates data. Every action re-validates authorization server-side (never trusts RLS or the client alone).
- `src/lib/payments/` — the payment processor boundary (Stripe Connect / demo).
- `src/lib/supabase/` — `client.ts` (browser), `server.ts` (RLS-respecting, per-request), `admin.ts` (service role — used sparingly, only where crossing RLS is legitimate, e.g. the ledger and cross-user notifications).
- `supabase/migrations/` — schema, RLS policies, and catalog seed data.
- Route groups: `(marketing)` + `(auth)` are public; `/app` is the customer dashboard; `/guy` is the provider dashboard; `/admin` is the operator dashboard. All three protected areas are gated in `src/proxy.ts`.

## What's real vs. what's a documented boundary

Per the project's "no fake functionality" standard:
- **Job lifecycle, pricing, matching, messaging, reviews, notifications, admin analytics** — fully implemented against Postgres, no mock data.
- **Payments** — fully implemented against a real interface; ships in demo mode (no live keys), swaps to live Stripe Connect by setting env vars, no code changes.
- **Background checks / identity verification** — the data model (`guy_profiles.identity_verified`, `background_check_status`) and UI states exist, but no verification provider is integrated yet. The UI never claims a Guy is verified unless that's actually true in the database.
- **Geocoding** — Guy service areas currently store city/state/zip + a radius; precise lat/lng-based geographic matching is a documented fast-follow (the schema already supports it).
- **Email/SMS/push notifications** — the notification architecture (`src/lib/actions/notifications.ts`) is provider-agnostic and ready for a channel to be plugged in; only in-app notifications are wired up today.
