# Aboard — Student Bus Booking & Live Tracking Platform

## Project Documentation

---

## 1. Project Overview

**Aboard** is an inter-city student bus booking and live tracking platform built for Ghanaian university students. It connects students directly with bus drivers, eliminates the chaos of lorry-station queues, and gives parents real-time visibility into their wards' journeys — so every trip to and from campus is booked, tracked, and confirmed.

**Tagline:** *Get on board. Know you arrived.*

**Pilot campus:** University of Cape Coast (UCC), Central Region, Ghana
**Currency:** GHS (Ghana Cedi)
**Payment:** Mobile money first (MTN MoMo, Telecel Cash, AirtelTigo Money), then cards

---

## 2. Problem Statement

### The Problem We Identified

Every semester, thousands of students at the University of Cape Coast face the same struggle: **getting a bus to campus at the start of semester and getting a bus home at the end of semester.**

We brainstormed many campus problems — accommodation, course registration, meal costs, wifi access — but kept returning to transportation because it is:

- **Universal:** every student travels to and from campus, every semester
- **Recurring:** the pain repeats at least four times per academic year
- **Bilateral:** the hustle is equal in both directions — coming to campus AND leaving campus
- **Emotionally charged:** parents worry when their children travel long distances

### The Specific Pain Points

#### Coming to campus (start of semester / resumption)
- Students wake up as early as 3:00 AM to queue at lorry stations
- Buses are half-empty or overfull — no way to know in advance
- Drivers have no direct connection to students, so trips run chaotic
- Students wait 2–4 hours for a bus that may or may not come
- No guarantee of a seat — standing for 4+ hours on the Accra–Cape Coast route

#### Leaving campus (end of semester / vacation)
- Same chaos in reverse — everyone leaves on the same day
- Students crowd around campus bus stops with no information
- Parents call repeatedly: *"Have you gotten a bus? Where are you now? Have you arrived?"*
- Drivers don't know how many students are waiting, so they either skip stops or overfill
- No record of who boarded which bus — safety concerns if something goes wrong

#### The Parent Anxiety
The deepest problem is not the queue — it is the **worry**. A parent in Bolgatanga sends their child 12+ hours to Cape Coast and has no visibility:
- Did they board safely?
- Where is the bus right now?
- Has it broken down?
- Did they arrive?

This anxiety is the emotional core of the problem. **Parents do not just want a bus for their child — they want peace of mind.**

### Why Existing Solutions Fail

| Current option | Why it fails students |
|---|---|
| Lorry station walk-up | No advance booking, no seat guarantee, long waits |
| WhatsApp groups | Disorganized, first-come-first-served, no payment trail |
| General ride-hailing (Uber/Bolt) | Too expensive for inter-city student travel (Cape Coast → Accra = GH₵300+ vs GH₵45 bus) |
| STC / VIP buses | Not student-focused, no campus pickup, no parent tracking |
| Walking to campus stops | Dangerous at night, no information about arrival times |

**No existing solution combines student-specific booking + live GPS tracking + parent visibility.** That gap is what Aboard fills.

---

## 3. Our Solution

Aboard is a single platform that connects **students, drivers, operators, and parents** around one shared trip. The student books a seat, the driver runs the trip, the parent follows live — all in one app.

### How It Works (3 steps)

1. **Search & book:** A student searches for a trip (e.g., Cape Coast → Accra, Friday 6:00 AM), picks a seat from a live seat map, and pays with mobile money. The seat is held for 5 minutes during payment — no one else can grab it.

2. **Receive a QR ticket:** After payment, the student gets a signed QR boarding pass with their name, seat, route, and departure time. The ticket works offline — drivers scan it with their phone camera even without internet.

3. **Track live & arrive safe:** Once the driver starts the trip, the bus appears on a live map. The student sees the bus approach their pickup stop. The parent (with the student's consent) follows the same trip on their own phone and gets SMS alerts: *"Your ward boarded the bus."* ... *"Bus is 2 minutes away."* ... *"Your ward has arrived safely."*

### What Makes It Different

- **Student-only:** verified by student ID or school email — fares stay student-focused
- **Seat-assigned:** no standing, no overbooking, no chaos
- **Offline-first tickets:** QR codes work without internet (drivers verify locally)
- **Parent live tracking:** the signature feature — guardians see the bus move in real time
- **Fair pricing in pesewa:** transparent fares, no surge pricing, refunds under a clear policy
- **Built for Ghana:** mobile money first, all 16 regions connected to the pilot hub at UCC

---

## 4. Key Features

### 4.1 Live GPS Tracking with Parent Visibility *(Signature Feature)*

This is the feature that sets Aboard apart from every other bus booking platform. **Loved ones can see their wards at any given moment** — not a guess, not a phone call, but a live GPS position on a map.

#### How it works
- While a trip is active, the driver's device broadcasts its GPS position every 3–5 seconds
- Students and linked parents subscribe to the trip's live channel and see the bus move on a map in real time
- The bus marker interpolates smoothly between position updates — no jumping
- The server recomputes ETA to each stop based on the latest position

#### Parent access rules (privacy by design)
A parent can see a trip **only when all three conditions are met:**
1. The student explicitly accepted the parent link (consent required)
2. The student has a confirmed booking on that trip
3. The trip is currently active

These rules are enforced at the **server level**, not just in the UI — a parent cannot subscribe to a trip channel without passing all three checks. The student can revoke access at any time.

#### Alerts parents receive
| Alert | When | Channel |
|---|---|---|
| Trip started | Driver taps "Start trip" | SMS + push notification |
| Ward boarded | Driver scans the student's QR ticket | SMS + push |
| Bus approaching | Bus is within 2 minutes of the pickup stop | SMS + push |
| Delay detected | Bus is more than 15 minutes behind schedule | SMS + push |
| Arrived safely | Driver taps "End trip" at the destination | SMS + push |

**SMS is required for parents** — the assumption is that a parent in a rural area may not have a smartphone or data bundle, but they have a basic phone that receives SMS.

#### Location data privacy
- Only the **driver's** GPS is tracked, never the student's phone
- Live position is ephemeral (broadcast, not stored long-term)
- Persisted location history is deleted after 7 days
- Location data is **never exposed in analytics** — only aggregated, anonymized data
- Follows the Ghana Data Protection Act, 2012 (Act 843)

### 4.2 Trip Search & Seat Booking

- Search by origin, destination, and date with filters (price, time window, operator rating, minimum seats left)
- Live seat map showing available, held, and booked seats
- Atomic seat hold: when a student selects a seat, it's locked for 5 minutes via a database-level unique constraint — **two students can never get the same seat**
- Held seats are automatically released if payment doesn't complete within 5 minutes (via a scheduled cleanup job)
- Booking history with status tracking

### 4.3 Signed QR Tickets (Offline-First)

- Each ticket is a signed token (HMAC-SHA256) containing: booking ID, trip ID, seat, student ID, route, departure time, expiry, key version
- Drivers scan the QR code with their phone camera
- The scanner verifies the signature **locally** — works even without internet
- Scans are queued offline and synced when connection returns
- Conflict resolution: if one ticket is scanned on two phones, the first valid scan wins
- Duplicate scans are rejected — a ticket can only be used once

### 4.4 Mobile Money & Card Payments

- Mobile money first (MTN MoMo, Telecel Cash, AirtelTigo Money) — matches how Ghanaian students actually pay
- Cards supported (Visa, Mastercard)
- Idempotency keys on every payment — duplicate requests don't create duplicate charges
- Webhook signature verification — tampered webhooks are rejected
- Refund policy: full refund if cancelled >2h before departure, 50% if 30min–2h, none if <30min. Operator-cancelled trips are always fully refunded.

### 4.5 Student Verification

- Sign up with school email (e.g., `@ucc.edu.gh`) or student ID number
- Admin can manually approve as a fallback
- Only verified students can book seats — keeps fares student-only and prevents scalping

### 4.6 Driver Experience

- Today's trips list with passenger manifests
- One-tap trip start/end
- GPS broadcasting automatically active while a trip is running
- QR scanner with large success/failure states
- Offline indicator + queued scan sync
- Earnings and payout status dashboard
- Screen Wake Lock API keeps the driver screen on during active trips

### 4.7 Operator Dashboard

- Manage buses, seat layouts, drivers, routes, stops, schedules, and pricing
- View manifests for upcoming trips
- Track seat fill rates and trip performance
- Earnings summary with payout history
- 7-day bookings trend chart

### 4.8 Admin Panel

- Verify students and operators
- Manage all users (suspend, reinstate)
- Handle disputes and process refunds
- Run payouts to operators
- View platform-wide reports and audit log
- See all active logins and locations (for security monitoring)

### 4.9 Notifications

- Booking confirmed, payment failed, trip reminder
- Bus approaching pickup stop
- Boarding verified (driver scanned your ticket)
- Trip started, delay detected, arrived safely
- Refund processed
- Delivered via in-app, SMS, email, and web push (for installed PWA)

### 4.10 Installable PWA

- Add to Home Screen on Android — works as a standalone app
- Tan theme color, standalone display mode
- Offline-capable ticket display (service worker planned for phase 2)
- Web Push notifications when installed

---

## 5. Target Users & Roles

The platform serves five distinct roles, each with role-based access:

| Role | Who they are | What they can do |
|---|---|---|
| **Student** | University student (verified) | Search trips, book seats, pay, receive QR ticket, track bus live, invite parents, view booking history |
| **Driver** | Bus driver (assigned by operator) | View today's trips, see manifest, start/end trip, broadcast GPS, scan QR tickets offline, view earnings |
| **Operator** | Transport company | Manage buses, drivers, routes, schedules, pricing; view manifests, earnings, trip performance |
| **Parent / Guardian** | Linked by a student (with consent) | Follow linked student's active trip on live map, receive SMS/push alerts, optionally pay for a ticket |
| **Admin** | Platform administrator | Verify users, manage disputes, process refunds, run payouts, view reports and audit log, see all active sessions |

### Role-Based Access Control
Every API endpoint and screen is gated by role. A student cannot access the operator dashboard. A parent can only see trips where their linked student is booked. A driver can only scan tickets for trips assigned to them. Access is enforced server-side, not just in the UI.

---

## 6. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui | Modern React framework with SSR, file-based routing, excellent DX |
| **State management** | TanStack Query (server state), Zustand (client state) | Query caching + retries + optimistic updates |
| **Animations** | Framer Motion | Scroll-triggered reveals, magnetic buttons, 3D tilt cards, spring physics |
| **Maps** | MapLibre GL JS (via `@mapcn/map`), CARTO basemaps | Free, open-source, no API key required, auto light/dark switching |
| **Backend** | Next.js Route Handlers (REST API) | Co-located with frontend, TypeScript end-to-end |
| **Database** | Prisma ORM + SQLite (local dev), PostgreSQL (production-ready) | Type-safe queries, migrations, portable from SQLite to Postgres |
| **Auth** | Custom: scrypt password hashing + HMAC-SHA256 session tokens + OTP | Phone OTP + email + password; role claims in session |
| **Realtime** | Socket.IO (tracking mini-service) | Driver position broadcast every 3–5s; room-based authorization |
| **QR signing** | HMAC-SHA256 (Node.js crypto) | Signed tickets, offline-verifiable, replay-resistant |
| **Payments** | Sandbox provider (HMAC-signed) → Hubtel/Paystack (production) | Idempotency keys, webhook signature verification, refund support |
| **Testing** | Vitest | Unit tests, concurrency tests, integration tests |
| **PWA** | Web App Manifest | Installable, standalone display, theme colors |
| **Code quality** | ESLint, TypeScript (strict) | Catch errors early |

### Design System
- **Theme:** Sand cream + charcoal + tan editorial (signature), with a charcoal + white monochrome alternative
- **Fonts:** Fraunces (editorial serif display), Inter (body), JetBrains Mono (code)
- **Motion primitives:** Custom cursor with spotlight, magnetic buttons, 3D tilt cards with glare, scroll-triggered reveals, animated mesh gradients, parallax sections, bento grids
- **Components:** shadcn/ui (New York variant) + custom motion primitives

---

## 7. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (PWA)                         │
│  Student / Driver / Parent / Operator / Admin views      │
│  TanStack Query (cache) + Socket.IO client (realtime)    │
└──────────┬──────────────────────────┬───────────────────┘
           │ REST API (/api/v1/*)      │ WebSocket (:3003)
           ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Next.js Server     │     │  Socket.IO Tracker  │
│  (Route Handlers)   │     │  (mini-service)     │
│                     │     │                     │
│  Auth (OTP+session) │     │  Trip rooms         │
│  Trip search        │     │  Position broadcast │
│  Seat hold (atomic) │     │  Channel auth       │
│  Payment webhook    │     │  (checks consent +  │
│  Ticket signing     │     │   booking before    │
│  Notifications      │     │   joining room)     │
└────────┬────────────┘     └─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Prisma + SQLite    │
│  (PostgreSQL-ready)  │
│                     │
│  Users, Students,   │
│  Parents, Links,    │
│  Drivers, Operators,│
│  Buses, Routes,     │
│  Stops, Trips,      │
│  Seats, Bookings,   │
│  Payments, Tickets, │
│  Scans, Locations,  │
│  Notifications,     │
│  Refunds, Audits    │
└─────────────────────┘
```

### Key Architectural Decisions

1. **Monolithic Next.js app** — frontend and backend co-located, TypeScript end-to-end, single deploy
2. **Socket.IO for realtime** — ephemeral position broadcast, room-based authorization, auto-reconnect
3. **Prisma + SQLite for local dev** — zero-config, portable to PostgreSQL for production
4. **HMAC-signed QR tickets** — server signs, driver verifies locally (offline-capable)
5. **Payment provider abstracted behind an interface** — swap sandbox → Hubtel/Paystack with one config change

---

## 8. Data Model

The database has 20+ tables covering the full domain:

### Core entities
- **profiles** — all users (role, name, phone, email, status)
- **students** — student-specific data (institution, student ID, verification status)
- **parents** + **parent_links** — guardian profiles + consent-based links to students
- **drivers** — driver profiles (license, rating, operator assignment)
- **operators** — transport company profiles
- **buses** + **seat_layouts** — vehicle fleet with seat configurations

### Trip domain
- **routes** — origin → destination with distance, duration, base price
- **stops** — ordered waypoints along a route (with lat/lng coordinates)
- **trips** — scheduled departures (route + bus + driver + departure time + status)
- **seats** — per-trip seat instances (label, row, col, status: available/held/booked)
- **seat_locks** — active seat holds (holder, expires_at, booking intent)

### Booking & payment
- **bookings** — confirmed reservations (student + trip + seat + payer + amount)
- **payments** — payment records (provider, reference, status, idempotency key)
- **tickets** — signed QR tickets (payload, key version, status: valid/used/cancelled/expired)
- **scans** — boarding scan records (driver, time, location, offline flag, sync status)
- **refunds** — refund records (amount, reason, policy applied)

### Operations
- **location_updates** — persisted GPS positions (trip, point, speed, heading, time)
- **notifications** — alert records (channel, type, title, body, status)
- **disputes** — booking disputes (reason, status, resolution)
- **payouts** — operator payout records (amount, period, status)
- **reviews** — post-trip ratings and comments
- **audit_logs** — security audit trail (action, resource, user, IP, timestamp)

### Critical constraint: seat locking
The `seat_locks` table has a `@@unique([seatId, tripId])` constraint — **only one active lock per seat per trip**. This is the database-level guarantee that two students can never hold the same seat. Concurrency tests prove exactly one of 20 simultaneous hold attempts succeeds.

---

## 9. API Documentation

All endpoints are under `/api/v1` and return a consistent JSON envelope:
```json
{ "ok": true, "data": ..., "meta": { "correlationId": "..." } }
```

### Endpoint groups

| Group | Endpoints | Purpose |
|---|---|---|
| **Auth** | `/auth/register`, `/auth/login`, `/auth/otp/*`, `/auth/me`, `/auth/logout`, `/auth/refresh` | Phone OTP, email OTP, password login, session management |
| **Trips** | `/trips/search`, `/trips/:id`, `/trips/:id/seats` | Search, detail, seat map |
| **Seat hold** | `/trips/hold`, `/trips/hold/:lockId/release` | Atomic seat hold + release |
| **Payments** | `/payments/initiate`, `/payments/:id/confirm` | Payment creation + confirmation |
| **Tickets** | `/tickets/:bookingId`, `/tickets/scan` | Get ticket + driver scan |
| **Consent** | `/consent/request`, `/consent/verify` | Parent linking + consent |
| **Notifications** | `/notifications`, `/notifications/:id/read`, `/notifications/boarding`, `/notifications/meetup`, `/notifications/trip-started` | Alerts + boarding notifications |
| **Admin** | `/admin/dashboard`, `/admin/bookings`, `/admin/routes`, `/admin/live-users`, `/admin/tickets` | Admin panel data |
| **Health** | `/health`, `/ready` | Service health checks |

Full endpoint details are in `docs/API.md`.

---

## 10. Setup & Installation

### Prerequisites
- Node.js 20+ or Bun 1.1+
- Git

### One-command start
```bash
git clone https://github.com/devjik/Aboard---G26-v3.git aboard
cd aboard
cp .env.example .env
bun install
bun run db:push    # create database + schema
bun run db:seed    # seed realistic data (16 users, 10 routes, 130 trips)
bun run dev        # start on http://localhost:3000
```

### Demo accounts (password: `password123`)
| Role | Phone |
|---|---|
| Admin | `+233200000001` |
| Operator | `+233200000002` |
| Driver | `+233270000001` |
| Student | `+233240000001` |
| Parent | `+233250000001` |

### Optional: live tracking service
```bash
bun run tracking    # start Socket.IO on port 3003
```

Full setup details are in `docs/SETUP.md`.

---

## 11. Testing

The project includes unit and integration tests using **Vitest**:

| Test file | What it covers | Tests |
|---|---|---|
| `tests/unit/seat-hold.concurrency.test.ts` | Fires 20 simultaneous seat hold attempts on the same seat; proves exactly 1 succeeds via the unique constraint | 4 |
| `tests/unit/qr-forgery.test.ts` | Signs tickets, tampers with payloads, verifies forged signatures are rejected | 8 |
| `tests/unit/webhook-idempotency.test.ts` | Verifies duplicate and out-of-order webhook events don't double-confirm bookings | 7 |
| `tests/unit/api-envelope.test.ts` | Tests the JSON API envelope structure and error codes | 7 |

**Total: 26 tests, all passing.**

Run tests:
```bash
bun run test:run
```

---

## 12. Security & Privacy

### Security measures
- Passwords hashed with **scrypt** (not plain text, not MD5)
- Session tokens are **HMAC-SHA256 signed** with a 32+ character secret
- Access tokens short-lived; refresh tokens in httpOnly cookies
- Input validation on every endpoint via **Zod schemas**
- **Idempotency keys** on payment creation — no duplicate charges
- Webhook signatures verified with **timing-safe comparison**
- Seat holds protected by a **database unique constraint** — no double-booking
- QR tickets are **signed** — cannot be forged or replayed

### Privacy & data protection
- Follows the **Ghana Data Protection Act, 2012 (Act 843)**
- Parent access requires **explicit student consent** — enforced server-side
- Only the **driver's** GPS is tracked, never the student's phone
- Location history **deleted after 7 days**
- Location data **never exposed in analytics**
- Student can **revoke parent access** at any time — takes effect immediately
- Student ID photos deleted after verification (max 30 days)
- Privacy policy + terms pages included in the app footer

Full details in `docs/PRIVACY.md`.

---

## 13. Pilot Context

| Detail | Value |
|---|---|
| **Pilot campus** | University of Cape Coast (UCC) |
| **Hub region** | Central Region, Ghana |
| **Routes seeded** | 10 (connecting 16 Ghana regions to Cape Coast) |
| **Sample routes** | Cape Coast ↔ Accra, Cape Coast ↔ Kumasi, Cape Coast ↔ Takoradi, Accra ↔ Kumasi, Kumasi ↔ Tamale, etc. |
| **Trips seeded** | 130 trips over 5 days (3 departures/day at 6:00, 9:00, 13:00) |
| **Buses seeded** | 4 coaster buses (32 seats each) |
| **Currency** | GHS (internally stored in pesewa: 1 GHS = 100 pesewa) |
| **Sample fare** | Cape Coast → Accra: GH₵45.00 (2h 45m, 145 km) |

### Expansion plan
After the UCC pilot proves the model, the same route-onboarding pattern extends to:
- KNUST (Kumasi)
- University of Ghana (Legon)
- UDS (Tamale)
- UCC affiliate campuses

---

## 14. Future Work

Planned enhancements (documented in `docs/PHASE2.md`):

1. **Supabase migration** — move from SQLite/Socket.IO to Supabase Postgres + PostGIS + Realtime + Edge Functions
2. **Asymmetric QR signing** — Ed25519 private/public key pair for true offline scanner verification
3. **PWA service worker** — offline ticket cache + offline QR scanning via IndexedDB
4. **Hubtel payment integration** — real mobile money + cards via Hubtel Collection API
5. **SMS gateway** — Africa's Talking or Hubtel SMS for parent alerts
6. **MapLibre + kepler.gl** — advanced analytics maps (demand heatmaps, route flows, trip replays) for operator/admin dashboards
7. **OpenAPI spec** — auto-generated from Zod schemas
8. **Playwright e2e tests** — three core journey tests (student books + boards, driver runs trip, parent follows trip)
9. **Capacitor wrapper** — true background GPS tracking for drivers (screen-off tracking)
10. **Multi-campus expansion** — KNUST, Legon, UDS

---

## 15. Project Structure

```
aboard-g26/
├── src/
│   ├── app/                    # Next.js routes + API handlers
│   │   ├── page.tsx            # Home (cinematic landing + app)
│   │   ├── layout.tsx          # Fonts, cursor, PWA metadata
│   │   ├── globals.css         # Sand-cream + charcoal + tan theme
│   │   └── api/v1/             # REST API (34 endpoints)
│   ├── components/
│   │   ├── brand/              # Logo, theme switcher
│   │   ├── motion/             # Cursor, Reveal, Parallax, MeshGradient, BentoGrid, TiltCard
│   │   ├── common/             # StatusPill, EmptyState, BottomSheet, etc.
│   │   ├── trips/              # TripCard, SeatMap, BookingSheet, TripsExplorer
│   │   ├── map/                # MapInner (MapLibre GL), RealMapView, LiveMapView
│   │   ├── operator/           # OperatorDashboard
│   │   ├── admin/              # AdminPanel
│   │   ├── driver/             # DriverMode
│   │   ├── guardian/           # GuardianView (parent live tracking)
│   │   ├── auth/               # SignInSheet
│   │   └── ui/                 # shadcn/ui primitives + map.tsx (mapcn)
│   └── lib/
│       ├── api/                # Typed client + Zod contracts + envelope
│       ├── auth/               # Session, OTP, password, guards
│       ├── config/             # App config + Ghana regions/routes
│       ├── tickets/            # HMAC-SHA256 signer/verifier
│       ├── payments/           # PaymentProvider interface + sandbox
│       └── hooks/              # useGeolocation, useTrackingSocket
├── prisma/                     # schema.prisma (20+ models)
├── mini-services/              # Socket.IO tracking service
├── scripts/                    # seed.ts (realistic Ghana data)
├── tests/                      # Vitest (26 tests)
├── docs/                       # SETUP, DECISIONS, API, PRIVACY, ASSETS, IMAGES, PHASE2
└── public/
    ├── brand/                  # Logo SVGs
    ├── animations/             # 13 Lottie placeholder slots
    ├── images/                 # Photography slots
    ├── maplibre-gl-worker.mjs  # Local maplibre worker
    └── manifest.webmanifest    # PWA manifest
```

---

## 16. Lessons Learned

### What we learned building this

1. **Start with the emotional core, not the technical stack.** We almost built a "bus booking app" — a commodity. The moment we reframed it as "parent peace of mind," every design decision got clearer: the live map became the hero feature, SMS became mandatory for parents, consent became non-negotiable.

2. **Concurrency is a design problem, not just a code problem.** The seat-holding logic needed a database unique constraint, not just a "check then insert" pattern. We proved it with 20 concurrent requests — exactly 1 succeeds.

3. **Offline-first is hard but essential for Ghana.** Internet is unreliable on long bus routes. Making QR tickets work offline (driver verifies locally, syncs later) was a must-have, not a nice-to-have.

4. **Editorial restraint beats feature overload.** We started with a dark-neon-with-glass design and pivoted to sand-cream + charcoal + tan editorial. The restrained design made the product feel premium, not flashy.

5. **The local stack matters.** Building on Prisma + SQLite + Socket.IO meant we could run the entire product with zero cloud credentials — every feature is testable locally with real data.

---

## 17. Conclusion

Aboard addresses a real, universal, emotionally-charged problem faced by every Ghanaian university student: **the hustle for a bus to and from campus, and the worry it causes their loved ones.**

The platform combines:
- **Student-specific booking** with atomic seat holds
- **Offline-first QR tickets** for reliable boarding verification
- **Live GPS tracking** so students see their bus approach
- **Parent live tracking + SMS alerts** so loved ones know their ward is safe at every moment

The pilot at the University of Cape Coast is ready to launch with 10 routes connecting all 16 Ghana regions, 130 seeded trips, and a complete role-based platform serving students, drivers, operators, parents, and admins.

**Get on board. Know you arrived.**

---

*This project was built as an academic assignment to solve a real campus problem using full-stack web development.*
