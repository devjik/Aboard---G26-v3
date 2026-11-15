# Aboard

**Get on board. Know they arrived.**

Inter-city student bus booking & live tracking platform for Ghana. Pilot hub: University of Cape Coast. Currency: GHS. Payments: mobile money first, then cards.

Built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma (SQLite), and Leaflet/OpenStreetMap.

## Features

- **Trip search & booking** — search across Ghana's 16 regions, pick your seat on a live seat map, pay with mobile money or card
- **Signed QR tickets** — tamper-proof, offline-verifiable boarding passes
- **Live map tracking** — real OpenStreetMap showing the user's real location + the driver's position simultaneously (geolocation permission flow included)
- **Multi-step booking sheet** — seat → your info → pay, with a step indicator
- **Admin dashboard** — KPIs, 7-day bookings chart, route fill, bookings table with CSV export, route management, settings
- **3 themes** — Emerald (default), Sunset, Midnight — all using black as the structural "belt"
- **Role-based access** — Student, Driver, Operator, Parent, Admin

## Quick start

```bash
bun install
bun run db:push     # create the SQLite database
bun run db:seed     # seed 120 trips, 10 routes, users, buses
bun run dev         # start on http://localhost:3000
```

### Demo accounts (password: `password123`)

| Role    | Phone           |
|---------|-----------------|
| Admin   | +233200000001   |
| Student | +233240000001   |
| Driver  | +233270000001   |
| Parent  | +233250000001   |

## Environment

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL="file:./db/custom.db"
ABOARD_SESSION_SECRET="your-32-char-min-secret"
ABOARD_PAYMENT_SANDBOX_KEY="your-sandbox-key"
```

## Tech stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM + SQLite (portable to PostgreSQL)
- **Auth**: scrypt password hashing + HMAC-SHA256 session tokens + OTP
- **Maps**: Leaflet + OpenStreetMap (no API key required)
- **Realtime**: Socket.IO tracking mini-service (port 3003)
- **State**: Zustand (theme) + TanStack Query (server state)
- **Motion**: Framer Motion

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (port 3000) |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema to database |
| `bun run db:seed` | Seed realistic Ghana data |
| `bun run tracking` | Start Socket.IO tracking service (port 3003) |

## Project structure

```
src/
  app/            # Next.js routes + API handlers (/api/v1/*)
  components/     # UI components (brand, common, trips, admin, map, motion, auth)
  lib/            # config, auth, api, payments, notifications, hooks
prisma/           # schema.prisma
mini-services/    # Socket.IO tracking service
scripts/         # seed.ts
docs/             # DECISIONS.md, SETUP.md, API.md
```

## License

MIT
