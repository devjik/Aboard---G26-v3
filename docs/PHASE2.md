# Aboard — Phase 2 Roadmap

Items deliberately deferred from the current build per the brief's rule
13.7 ("Do not add features outside this brief without asking"). Each is
a clean upgrade path, not a redesign.

## P2-1: Supabase migration

Migrate the local Prisma + SQLite stack to Supabase Postgres + PostGIS +
Auth + Realtime + Edge Functions + Storage. See `docs/DECISIONS.md`
ADR-001 for the migration map.

**Effort:** 5–7 days. Blocked on: Supabase project provisioning,
confirmation that the local stack can be retired.

## P2-2: Asymmetric QR ticket signing (Ed25519)

Replace HMAC-SHA256 symmetric signing with Ed25519 asymmetric. The
signer becomes a Supabase Edge Function holding the private key; the
public key embeds in the service worker. This enables true offline
scanner verification on untrusted driver devices. See ADR-004.

**Effort:** 2 days. Blocked on: P2-1.

## P2-3: PWA service worker + offline ticket cache

Ship a Workbox service worker that caches:
- The signed QR ticket payload in IndexedDB on issue.
- The public verification key for offline scan verification.
- The app shell for offline relaunch.

**Effort:** 2 days. Blocked on: P2-2 (for the public key).

## P2-4: Hubtel payment integration

Implement `hubtelProvider` in `src/lib/payments/provider.ts` against the
Hubtel Collection API. Add `POST /api/v1/payments/webhook` with HMAC
signature verification + `webhook_events` dedup table. Add pg_cron
reconciliation job.

**Effort:** 3 days. Blocked on: Hubtel sandbox credentials (client item C).

## P2-5: SMS gateway for parent alerts

Implement `smsProvider` against Africa's Talking (or Hubtel SMS) in
`src/lib/notifications/provider.ts`. Wire to the `notify` Edge Function
with retry + user preferences. SMS is required for parents who may not
have data.

**Effort:** 1 day. Blocked on: SMS gateway account (client item F).

## P2-6: MapLibre + kepler.gl migration

Replace Leaflet with MapLibre GL JS for the student/parent/driver live
map (dark neon style JSON to be authored). Add kepler.gl lazy-loaded in
the operator/admin dashboards for demand heatmaps, route flow arcs, and
trip replays. Add deck.gl custom layers on the public landing map section.

**Effort:** 4 days. Blocked on: P2-1 (for PostGIS geography columns +
analytics views).

## P2-7: Analytics views + export endpoint

Create materialized views (`v_boardings_per_stop_per_hour`,
`v_demand_by_campus_hostel`, `v_seat_fill`, `v_trip_duration`,
`v_delay_heatmap`) refreshed by pg_cron. Expose via
`GET /api/v1/analytics/:view?format=geojson|csv`.

**Effort:** 2 days. Blocked on: P2-1.

## P2-8: Rate limiting

Add rate limiting on `/v1/auth/*` (5/min per IP), `/v1/trips/search`
(60/min per user), and `/v1/payments/*` (10/min per user) via Vercel
Edge Middleware + Upstash Redis.

**Effort:** 1 day. No blockers.

## P2-9: OpenAPI spec generation

Compile the Zod schemas in `src/lib/api/contracts/*.ts` to JSON Schema
via `zod-to-openapi`, wrap in an OpenAPI 3.1 document, serve at
`/api/openapi.json` and a Swagger UI at `/docs/api`.

**Effort:** 1 day. No blockers.

## P2-10: Playwright end-to-end tests

Three core journey e2e tests:
1. Student signs up → searches trip → picks seat → pays (sandbox) →
   receives ticket → boards (driver scans).
2. Driver signs in → starts trip → broadcasts GPS → scans ticket →
   ends trip.
3. Parent accepts link → follows trip → receives alerts.

**Effort:** 3 days. No blockers (can run against local stack today).

## P2-11: Capacitor wrapper for background GPS

Wrap the driver PWA in Capacitor for true background location tracking
(screen off, app backgrounded). Uses Capacitor's Background Geolocation
plugin to keep broadcasting position even when the driver switches apps.

**Effort:** 2 days. Blocked on: P2-3 (PWA shell must be solid first).

## P2-12: Sentry + Vercel Analytics + Speed Insights

Wire Sentry for error tracking, Vercel Analytics for page views, and
Vercel Speed Insights for Core Web Vitals. Alert on booking success
rate < 95%, payment success rate < 90%, scan time > 5s, tracking
latency > 10s.

**Effort:** 1 day. Blocked on: production deployment.

## Total phase 2 effort

~27–32 days. Can run in parallel with phase 1 hardening once the Supabase
migration (P2-1) is unblocked.

## Out of scope (phase 3+)

- Multi-campus expansion (KNUST, Legon, UG) — product is ready, just
  needs route + campus data entry.
- Multi-operator marketplace (multiple transport companies competing).
- Subscription passes (monthly unlimited rides).
- Carpool matching (students driving private cars).
- Carbon offset tracking per trip.
