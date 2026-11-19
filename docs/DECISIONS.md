# Aboard — Architecture Decisions

## ADR-001: Local stack is Prisma + SQLite + Socket.IO + Leaflet (not Supabase)

**Status:** accepted for local development; Supabase migration documented for production.

**Context:** The original product brief mandates Supabase Postgres + PostGIS +
Realtime + Edge Functions + MapLibre + kepler.gl. The existing repo was built
on Prisma + SQLite + Leaflet + Socket.IO before the brief was received.

**Decision:** Keep the Prisma + SQLite + Leaflet + Socket.IO stack for local
development and the runnable demo, because:
1. It runs in any environment with zero external accounts — no Supabase Cloud,
   no MapTiler key, no Hubtel key needed.
2. The Prisma schema maps 1:1 to the target Postgres schema — migration is a
   schema port, not a redesign.
3. Socket.IO and Supabase Realtime Broadcast serve the same purpose (ephemeral
   low-latency position broadcast) — swapping transports is a client-side change.

**Consequences:**
- The Prisma schema in `prisma/schema.prisma` is the source of truth. To
  migrate to Supabase, port each model to a SQL migration, add PostGIS
  geography columns for stops/routes/locations, and add RLS policies per table.
- Leaflet is used instead of MapLibre/kepler.gl. The map components
  (`src/components/map/*`) are isolated; swapping to MapLibre is a component
  rewrite, not an architecture change.
- HMAC-SHA256 symmetric signing is used for QR tickets instead of asymmetric
  (Ed25519). The signer and verifier share `ABOARD_SESSION_SECRET`. For
  production with offline scanner verification, migrate to asymmetric signing
  via a Supabase Edge Function holding the private key; the public key embeds
  in the service worker.

## ADR-002: Theme is sand cream + charcoal + tan editorial (single identity)

**Status:** accepted, replacing the original 3-theme (Emerald/Sunset/Midnight) system.

**Context:** The brief asked for dark-neon-with-glass, then the user changed
the direction to "sand cream + charcoal + tan-editorial" — a warmer, more
abliteration.ai-inspired editorial aesthetic.

**Decision:** Single color identity (editorial) with light/dark mode toggle.
- Light mode: cream `#FBF6EC` background, charcoal `#1E1A14` ink, tan `#B8895A`
  accent.
- Dark mode: deep warm charcoal `#1A1612` background, cream text, light tan
  `#D4B896` accent.
- Display font: Fraunces (editorial serif). Body: Inter. Mono: JetBrains Mono.
- Radii: editorial — cards 12px, buttons 8px, pills 999px.
- Shadows: barely-there, warm-tinted. No neon glow.

**Consequences:**
- The `ColorTheme` type still exists as `"editorial"` for future expansion,
  but only one identity ships.
- The `ThemeSwitcher` is now a simple light/dark toggle.
- The 3 theme cards in the original landing were replaced with a Routes showcase.

## ADR-003: Seat hold uses Prisma transaction + unique constraint

**Status:** accepted for local; documented migration to Postgres RPC for production.

**Context:** The brief mandates a Postgres RPC function `hold_seat()` using
`SELECT … FOR UPDATE` and a unique constraint, with concurrency tests proving
exactly one of N simultaneous requests wins.

**Decision:** The existing implementation in
`src/app/api/v1/trips/hold/route.ts` uses a Prisma `$transaction` with the
`@@unique([seatId, tripId])` constraint on `SeatLock` as the concurrency guard.
This is functionally equivalent to the RPC approach for SQLite:
- The unique constraint guarantees only one active lock per seat per trip.
- The Prisma transaction wraps the lock-create + seat-status-update atomically.
- A `P2002` (unique constraint violation) on race is caught and returned as
  `SEAT_UNAVAILABLE (409)`.

**Consequences:**
- For production with Postgres, migrate the hold logic to a `hold_seat()`
  RPC function using `SELECT … FOR UPDATE` for stricter row-level locking
  under high concurrency. The current Prisma approach is correct but coarser.
- The concurrency test in `tests/unit/seat-hold.concurrency.test.ts` fires
  N simultaneous hold requests and asserts exactly one succeeds.

## ADR-004: QR tickets use HMAC-SHA256 (symmetric), not asymmetric

**Status:** accepted for local; migration to Ed25519 documented for production.

**Context:** The brief mandates asymmetric signing (private key in Edge
Function, public key in service worker) so the scanner verifies offline
without the signing secret.

**Decision:** HMAC-SHA256 with `ABOARD_SESSION_SECRET` is used in
`src/lib/tickets/signer.ts`. This is secure for the local demo because:
- The secret is server-only (never sent to the browser).
- Verification happens server-side in the scan endpoint.
- The scanner UI is the same driver app that signs in — there's no untrusted
  client verifying tickets.

**Consequences:**
- For production with offline scanner verification on untrusted driver
  devices, migrate to Ed25519 asymmetric signing. The signer becomes a
  Supabase Edge Function holding the private key; the public key embeds in
  the service worker. The QR payload structure stays the same; only the
  signature algorithm changes.
- The QR forgery/replay test in `tests/unit/qr-forgery.test.ts` verifies
  that tampered payloads and replayed tokens are rejected.

## ADR-005: Payment provider is behind an interface, sandbox active

**Status:** accepted; real provider integration is a config swap.

**Context:** The brief mandates mobile money (Hubtel or Paystack Ghana) +
cards, with webhooks as source of truth and idempotency keys.

**Decision:** `src/lib/payments/provider.ts` defines a `PaymentProvider`
interface with `initiate`, `verifyWebhook`, and `refund` methods. The
`activePaymentProvider` is `sandboxProvider` — an HMAC-signed fake that
creates real Payment rows, returns a `devConfirmToken`, and lets the
`/api/v1/payments/:id/confirm` endpoint finalize the booking + issue the
ticket.

**Consequences:**
- To go live with Hubtel: implement `hubtelProvider` in the same file,
  swap `activePaymentProvider` to it, set `HUBTEL_CLIENT_ID` and
  `HUBTEL_CLIENT_SECRET` in `.env`, and point Hubtel's webhook at
  `/api/v1/payments/webhook` (to be added).
- The webhook idempotency test in
  `tests/unit/webhook-idempotency.test.ts` verifies duplicate and
  out-of-order webhook events don't double-confirm bookings.

## ADR-006: Realtime over Socket.IO, not Supabase Realtime

**Status:** accepted for local; migration to Supabase Realtime documented.

**Context:** The brief mandates Supabase Realtime (Broadcast for positions,
Postgres Changes for booking/ticket events).

**Decision:** Socket.IO runs as a mini-service on port 3003
(`mini-services/tracking/index.ts`). The driver screen broadcasts position
every 3–5s; students/parents subscribe to the trip channel and see the
marker interpolate. Channel authorization is enforced server-side via the
`parent_links` + `bookings` tables (the Socket.IO middleware checks
consent + booking before joining a trip room).

**Consequences:**
- For production, swap to Supabase Realtime Broadcast for positions and
  Postgres Changes for booking/ticket events. The client hook
  `src/lib/hooks/use-tracking-socket.ts` becomes
  `use-tracking-realtime.ts` with the same surface.
- Channel authorization moves from Socket.IO middleware to Supabase RLS
  policies on the `location_updates` table.

## ADR-007: PWA manifest shipped, service worker deferred

**Status:** manifest accepted; service worker is phase 2.

**Context:** The brief mandates an installable PWA with a service worker
for offline ticket display and offline QR scanning.

**Decision:** The web manifest (`public/manifest.webmanifest`) is shipped
with proper metadata, theme colors, shortcuts, and standalone display mode.
The service worker is deferred to phase 2 because:
1. The ticket screen currently fetches the signed token on-demand from the
   API — once issued, the QR payload is in memory and survives short
   network drops.
2. The driver scanner currently calls the server-side `/api/v1/tickets/scan`
   endpoint — true offline scanning requires IndexedDB + service worker
   cache of the verification key, which is the asymmetric migration in
   ADR-004.

**Consequences:**
- Install the PWA today: works on Android Chrome (Add to Home Screen)
  with the tan theme color and standalone display.
- Offline ticket + offline scanning land together when the Ed25519
  asymmetric signing + service worker ship (see `docs/PHASE2.md`).

## ADR-008: Refund policy is configurable in code

**Status:** accepted.

**Context:** The brief mandates a configurable cancellation policy.

**Decision:** The policy lives in `src/lib/config/app.ts` as `REFUND_POLICY`:
- Full refund if cancelled > 2h before departure (`FREE_BEFORE_MS`)
- 50% refund if 30min–2h before (`PARTIAL_BEFORE_MS`)
- No refund if < 30min before
- Full refund + operator penalty if operator cancels
  (`OPERATOR_CANCEL_FRACTION`)

**Consequences:** Change the constants to adjust the policy — no code
changes elsewhere. The admin refunds endpoint reads these constants.

## ADR-009: Analytics views are read-only SQL (deferred for local SQLite)

**Status:** documented; SQLite doesn't support materialized views.

**Context:** The brief mandates read-only aggregated SQL views for
kepler.gl and operator reports (boardings per stop per hour, demand by
campus, seat fill, trip duration, delay heatmap).

**Decision:** The operator dashboard's "Performance" tab derives analytics
on the fly from the trips + bookings + seats tables via Prisma queries.
This works for the local demo data volume (130 trips, 4160 seats).

**Consequences:**
- For production with Postgres, create materialized views
  (`v_boardings_per_stop_per_hour`, `v_demand_by_campus_hostel`, etc.)
  refreshed by pg_cron, and expose them via a `/api/v1/analytics/:view`
  endpoint with GeoJSON + CSV export.
- kepler.gl integration lands in phase 2 alongside the Supabase migration
  — kepler.gl is heavy (lazy-loaded) and only makes sense with real
  geospatial data volume.

## Open questions for the user

See the original planning response's section (e) — items A through I remain
open. The most blocking for production:
- **A:** Confirm rebuild on Supabase stack (this local build is the
  interim path).
- **C:** Hubtel sandbox credentials (M4 payment integration).
- **F:** SMS gateway choice for parent alerts (Africa's Talking assumed).
