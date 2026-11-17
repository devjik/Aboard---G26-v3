# Aboard — Deployment Guide (Vercel + Supabase)

This guide walks you through deploying the Aboard app to production using **Vercel** (hosting) and **Supabase** (PostgreSQL database).

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│  Vercel (Next.js app)                             │
│  • Frontend + API routes                          │
│  • Auto-deploy from GitHub                        │
│  • Preview deployments on every PR                │
│  URL: https://your-app.vercel.app                 │
└──────────┬───────────────────────────────────────┘
           │ DATABASE_URL (PostgreSQL connection string)
           ▼
┌──────────────────────────────────────────────────┐
│  Supabase (PostgreSQL database)                   │
│  • Hosted PostgreSQL 15                           │
│  • Connection pooling                             │
│  • Dashboard + SQL editor                         │
│  URL: db.<project>.supabase.co:5432               │
└──────────────────────────────────────────────────┘
```

**Note on realtime tracking:** The Socket.IO tracking service (port 3003) cannot run on Vercel (serverless functions don't support long-lived WebSocket connections). The app works without it — the live map shows stops + a simulated driver position. For real-time GPS tracking in production, deploy the tracking service separately (Railway/Render/Fly.io) or migrate to Supabase Realtime (see `docs/PHASE2.md`).

---

## Part 1 — Set Up Supabase

### Step 1: Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is fine)
2. Click **New Project**
3. Fill in:
   - **Name:** `aboard` (or whatever you prefer)
   - **Database Password:** set a strong password — **save this, you'll need it**
   - **Region:** choose the closest to your users (e.g., `Frankfurt` for Europe, `Singapore` for Asia)
   - **Pricing plan:** Free tier (500MB database, 2GB bandwidth)
4. Click **Create new project** — wait ~2 minutes for provisioning

### Step 2: Get your database connection string

1. In your Supabase dashboard, go to **Project Settings** (gear icon bottom left)
2. Click **Database** in the left sidebar
3. Find the **Connection string** section
4. Copy the **URI** — it looks like:
   ```
   postgresql://postgres:<YOUR-PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres
   ```
5. Replace `<YOUR-PASSWORD>` with the password you set in Step 1
6. Add `?schema=public` to the end:
   ```
   postgresql://postgres:<YOUR-PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres?schema=public
   ```
7. **Save this string** — you'll need it for both local setup and Vercel

### Step 3: Push the database schema + seed data

Do this from your local machine (the repo you cloned):

```bash
# Set your Supabase DATABASE_URL temporarily
# On Mac/Linux:
export DATABASE_URL="postgresql://postgres:<YOUR-PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres?schema=public"

# On Windows (PowerShell):
$env:DATABASE_URL="postgresql://postgres:<YOUR-PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres?schema=public"

# Install dependencies (if not already done)
bun install

# Push the Prisma schema to Supabase (creates all tables)
bun run db:push

# Seed realistic data (16 users, 10 routes, 130 trips, 4160 seats)
bun run db:seed
```

After this, your Supabase database has all the tables and demo data. Verify by going to the Supabase dashboard → **Table Editor** — you should see tables like `User`, `Trip`, `Route`, `Seat`, etc.

---

## Part 2 — Deploy to Vercel

### Step 1: Push your code to GitHub

The repo is already on GitHub at `https://github.com/devjik/Aboard---G26-v3`. If you've made local changes, push them:

```bash
git add -A
git commit -m "prepare for deployment"
git push origin main
```

### Step 2: Import the project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign up / sign in (use GitHub for easy integration)
2. Click **Add New...** → **Project**
3. Find the `Aboard---G26-v3` repo in the list → click **Import**
4. Vercel auto-detects Next.js — the build settings should be:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build` (Vercel runs this automatically — the `postinstall` script generates the Prisma client)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `bun install` (or `npm install` — Vercel detects bun from `bun.lock`)

### Step 3: Set environment variables

In the Vercel import screen, expand **Environment Variables** and add:

| Key | Value | Note |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:<PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres?schema=public` | From Supabase Step 2 |
| `ABOARD_SESSION_SECRET` | Run `openssl rand -hex 32` in terminal → paste the output | Must be 32+ chars |
| `ABOARD_PAYMENT_SANDBOX_KEY` | `aboard-sandbox-key` | Dev sandbox key (change for production) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your Vercel URL (add after first deploy) |

**Important:** Set these for all environments (Production, Preview, Development).

### Step 4: Deploy

1. Click **Deploy**
2. Vercel builds the app (~2-3 minutes) — you'll see build logs in real time
3. When done, you get a URL like `https://aboard-g26-v3.vercel.app`
4. Click **Visit** — your app is live!

### Step 5: Verify the deployment

1. Open the Vercel URL
2. You should see the Aboard landing page (hero, features, routes)
3. Click **Sign in** → use demo accounts (password: `password123`):
   - Student: `+233240000001`
   - Admin: `+233200000001`
4. Try searching trips, booking a seat, viewing the map

---

## Part 3 — Post-Deployment

### Custom domain (optional)

1. In Vercel dashboard → your project → **Settings** → **Domains**
2. Add your domain (e.g., `aboard.gh`)
3. Add the DNS records Vercel shows you
4. Vercel auto-provisions HTTPS certificates

### Update NEXT_PUBLIC_APP_URL

After you know your Vercel URL (or custom domain):
1. Go to Vercel → Settings → Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` to your final URL
3. Redeploy (Settings → Redeploy)

### Automatic deployments

Every `git push` to `main` triggers a production deployment. Every pull request gets a preview deployment with its own URL.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| **Build fails: "prisma generate" error** | Ensure `postinstall` script is in `package.json` (it is). Check Vercel build logs. |
| **Runtime error: "DATABASE_URL not found"** | Add the env var in Vercel Settings → Environment Variables → redeploy. |
| **Database connection timeout** | Supabase free tier has connection limits. Use the connection pooler URL (Settings → Database → Connection pooling). |
| **Map doesn't load** | The map uses WebGL + CARTO tiles. Vercel has internet access, so tiles should load. Check browser console. If it crashes, the SVG fallback map shows automatically. |
| **Sign-in doesn't work (401)** | The session secret must match between local (where you seeded) and Vercel. Set the same `ABOARD_SESSION_SECRET`. |
| **Real-time tracking not working** | Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set on Vercel. Without them, the app uses simulated driver positions. |

---

## Real-Time Map Tracking (Supabase Realtime)

The app uses **Supabase Realtime Broadcast** for live driver GPS tracking. This replaces the previous Socket.IO approach and works natively on Vercel (no separate service needed).

### How it works

- The driver's device broadcasts GPS positions every 3–5 seconds via a Supabase Realtime channel named `trip:<tripId>`
- Students and linked parents subscribe to that channel and receive positions in real time
- Positions are ephemeral (broadcast only, not stored in the database)
- If Supabase env vars aren't set, the app falls back to a **simulated driver** that moves along the route automatically — the map still works, just without real GPS

### Step 1: Get your Supabase API keys

1. Go to your Supabase dashboard → **Settings** (gear icon) → **API**
2. Copy these two values:
   - **Project URL:** `https://<your-project>.supabase.co`
   - **anon public key:** `eyJhbGciOi...` (long string — this is safe to expose to the browser)

### Step 2: Enable Realtime (usually already enabled)

1. Go to Supabase dashboard → **Database** → **Replication**
2. Ensure **Realtime** is enabled (it's on by default for new projects)
3. No table-level Realtime needed — we use Broadcast channels (ephemeral, not tied to tables)

### Step 3: Set environment variables

**On Vercel:**
- Go to Settings → Environment Variables
- Add:
  | Key | Value |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-project>.supabase.co` |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` (your anon key) |
- Redeploy

**Locally (Docker):**
Create a `.env` file in the project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```
Then `docker compose up --build` — the Docker Compose reads these from `.env` automatically.

**Locally (without Docker):**
```bash
export NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
bun run dev
```

### Step 4: Test real-time tracking

1. Open the app in two browser windows (or two devices)
2. In window 1: sign in as **driver** (`+233270000001` / `password123`) → go to Drive → start a trip
3. In window 2: sign in as **student** (`+233240000001` / `password123`) → go to Live Map
4. The student should see the bus marker move in real time as the driver's GPS updates

### Without Supabase env vars (simulation mode)

If you don't set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
- The live map still renders with stops + route line
- A **simulated driver** marker moves along the route automatically (updates every 2 seconds)
- No real-time GPS broadcast between devices
- Everything else (booking, payment, tickets, admin) works fully

This is useful for local development and testing without a Supabase project.

---

## Summary Checklist

- [ ] Supabase project created
- [ ] Supabase API keys copied (URL + anon key)
- [ ] Database connection string copied
- [ ] `DATABASE_URL` set locally + `bun run db:push` + `bun run db:seed` run
- [ ] GitHub repo is up to date
- [ ] Vercel project imported from GitHub
- [ ] Environment variables set on Vercel (DATABASE_URL, SESSION_SECRET, SANDBOX_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)
- [ ] First deployment successful
- [ ] Demo accounts work on the Vercel URL
- [ ] Real-time tracking tested (driver in one window, student in another)
- [ ] (Optional) Custom domain configured

---

## Environment Variable Reference

| Variable | Where | Example |
|---|---|---|
| `DATABASE_URL` | Vercel + local | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres?schema=public` |
| `ABOARD_SESSION_SECRET` | Vercel + local | `a1b2c3d4e5f6...` (32+ chars, `openssl rand -hex 32`) |
| `ABOARD_PAYMENT_SANDBOX_KEY` | Vercel + local | `aboard-sandbox-key` |
| `NEXT_PUBLIC_APP_URL` | Vercel only | `https://your-app.vercel.app` |

| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + local | `eyJhbGciOi...` (from Supabase Settings → API) |

**Never commit `.env` to git.** The `.gitignore` already excludes it.
