# Aboard — Setup Guide

## Prerequisites

- **Node.js 20+** (or Bun 1.1+ — recommended, the repo ships a `bun.lock`)
- **Git**
- No external accounts required for local development — the app uses
  Prisma + SQLite locally, so the entire product runs on your machine
  with zero cloud credentials.

## One-command local start

```bash
git clone https://github.com/devjik/Abord---G26.git aboard
cd aboard
cp .env.example .env
bun install
bun run db:push    # create SQLite database + schema
bun run db:seed    # seed 16 users, 10 routes, 130 trips, 4160 seats
bun run dev        # start on http://localhost:3000
```

That's it. Open http://localhost:3000 — the app is fully runnable with
real data, real APIs, real seat-holding, real signed QR tickets, and a
real sandbox payment provider.

## Demo accounts (password: `password123`)

| Role | Phone | What you can do |
|---|---|---|
| Admin | `+233200000001` | Verify users, manage disputes, view audit log, see all bookings |
| Operator | `+233200000002` | Fleet, manifests, earnings, performance dashboards |
| Driver 1 | `+233270000001` | Today's trips, manifest, start/end trip, QR scanner |
| Driver 2 | `+233270000002` | Second driver |
| Student 1–10 | `+233240000001` … `+233240000010` | Search trips, book seats, pay, ticket, live map |
| Parent | `+233250000001` | Linked to Student 1, live trip view, alerts |

## Optional: live tracking service

The driver GPS broadcast runs over Socket.IO on port 3003. Without it,
the live map still works (it shows stop positions and the user's location)
but the bus marker won't move in real time.

```bash
bun run tracking    # start Socket.IO on :3003 in a second terminal
```

## Environment variables

```bash
# .env
DATABASE_URL="file:./db/custom.db"
ABOARD_SESSION_SECRET="change-me-to-a-32-char-min-secret"
ABOARD_PAYMENT_SANDBOX_KEY="change-me"
```

- `DATABASE_URL` — SQLite file path. Change to a PostgreSQL URL to switch DBs.
- `ABOARD_SESSION_SECRET` — HMAC key for session tokens and QR ticket signing.
  **Must be 32+ characters.** Generate one with `openssl rand -hex 32`.
- `ABOARD_PAYMENT_SANDBOX_KEY` — HMAC key for the sandbox payment provider.
  In production this is replaced with real Hubtel/Paystack credentials in
  `src/lib/payments/provider.ts`.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema to database |
| `bun run db:seed` | Seed realistic Ghana data |
| `bun run db:reset` | Reset database (destructive) |
| `bun run tracking` | Start Socket.IO tracking service (port 3003) |
| `bun run test` | Run unit tests (Vitest) |
| `bun run test:run` | Run tests once (CI mode) |

## Project structure

```
src/
  app/            # Next.js routes + API handlers (/api/v1/*)
    page.tsx      # Combined landing + app home (cinematic)
    layout.tsx    # Fonts, CursorProvider, PWA metadata
    globals.css   # Sand-cream + charcoal + tan editorial theme
  components/
    brand/        # Logo, theme switcher
    motion/       # MagneticWrap, TiltCard, CursorProvider, Reveal,
                  #   ParallaxSection, MeshGradient, BentoGrid
    common/       # StatusPill, EmptyState, BottomSheet, etc.
    trips/        # TripCard, SeatMap, BookingSheet, TripsExplorer
    map/          # LiveMapView (stylized), RealMapView (Leaflet)
    operator/     # OperatorDashboard (fleet, manifests, earnings)
    admin/        # AdminPanel (KPIs, routes, bookings, live users)
    driver/       # DriverMode (manifest, trip lifecycle, scanner)
    guardian/     # GuardianView (parent live trip + alerts)
    auth/         # SignInSheet
    ui/           # shadcn/ui primitives (button, input, dialog, etc.)
  lib/
    api/          # Typed API client + Zod contracts + envelope
    auth/         # Session, OTP, password, guards
    config/       # app config, Ghana regions + route seeds
    tickets/      # HMAC-SHA256 ticket signer/verifier
    payments/     # PaymentProvider interface + sandbox impl
    notifications/# Notification provider
    hooks/        # use-geolocation, use-tracking-socket
    theme.ts      # Editorial theme store
    db.ts         # Prisma client
prisma/           # schema.prisma
mini-services/    # Socket.IO tracking service
scripts/          # seed.ts
tests/            # Vitest unit + integration tests
docs/             # SETUP.md, DECISIONS.md, API.md, PRIVACY.md, ASSETS.md,
                  #   IMAGES.md, PHASE2.md
public/
  brand/          # logo SVGs (3 slots)
  animations/     # Lottie JSON placeholders (13 slots)
  3d/             # GLB placeholder slot
  images/         # Photography slots (see IMAGES.md)
  manifest.webmanifest
```

## Deployment

### Vercel (recommended)

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Set environment variables (only `ABOARD_SESSION_SECRET` and
   `ABOARD_PAYMENT_SANDBOX_KEY` are required; the rest have defaults).
4. Deploy. Vercel auto-detects Next.js 16.

### Other platforms

The app is a standard Next.js 16 standalone build. The `next.config.ts`
sets `output: "standalone"`, so `bun run build` produces a self-contained
`.next/standalone/` directory that runs anywhere Node runs.

## When things go wrong

- **`prisma/db not found`** — run `bun run db:push` first.
- **`ECONNREFUSED 3003`** — the tracking service isn't running. Start it
  with `bun run tracking` in a second terminal, or ignore it (the app
  degrades gracefully — live map shows stops without the moving bus marker).
- **`401 Unauthorized`** — your session expired. Sign out and sign back in.
- **Seat hold fails** — another student grabbed it, or your 5-minute window
  expired. Pick another seat.

## Pilot context

- **Campus:** University of Cape Coast
- **Hub:** Cape Coast, Central Region
- **Routes:** 10 seeded routes connecting 16 Ghana regions to Cape Coast
- **Currency:** GHS (pesewa internally, 1 GHS = 100 pesewa)
- **Payments:** mobile money first (MTN MoMo, Telecel Cash, AirtelTigo Money),
  then cards. Sandbox provider active locally; swap to Hubtel/Paystack by
  editing `src/lib/payments/provider.ts`.
- **Privacy law:** Ghana Data Protection Act, 2012 (Act 843)
