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
| **Map doesn't load** | The map uses WebGL + CARTO tiles. Vercel has internet access, so tiles should load. Check browser console. |
| **Sign-in doesn't work (401)** | The session secret must match between local (where you seeded) and Vercel. Set the same `ABOARD_SESSION_SECRET`. |
| **Notifications not updating** | The app polls every 8s. Real-time push (WebSocket) isn't available on Vercel serverless. |
| **Socket.IO tracking service** | Can't run on Vercel. Deploy separately on Railway/Render/Fly.io, or skip (simulated driver positions work). |

---

## Socket.IO Tracking Service (Optional)

If you want real-time driver GPS tracking in production:

### Option A: Deploy separately on Railway
1. Go to [railway.app](https://railway.app)
2. Create a new project from your GitHub repo
3. Set the start command: `bun --hot mini-services/tracking/index.ts`
4. Set env vars: `DATABASE_URL` (Supabase), `ABOARD_SESSION_SECRET`
5. Railway gives you a URL like `aboard-tracker.up.railway.app`
6. Update the app's tracking service URL to point to Railway

### Option B: Skip it (simplest)
The app works without the tracking service:
- Live map shows stops + route line (from the database)
- Driver position is simulated (moves along the route automatically)
- No real-time GPS broadcast
- Everything else (booking, payment, tickets, admin) works fully

### Option C: Migrate to Supabase Realtime (future)
Replace Socket.IO with Supabase Realtime Broadcast for driver positions. This is documented in `docs/PHASE2.md` and is the recommended production approach.

---

## Summary Checklist

- [ ] Supabase project created
- [ ] Database connection string copied
- [ ] `DATABASE_URL` set locally + `bun run db:push` + `bun run db:seed` run
- [ ] GitHub repo is up to date
- [ ] Vercel project imported from GitHub
- [ ] Environment variables set on Vercel (DATABASE_URL, SESSION_SECRET, SANDBOX_KEY)
- [ ] First deployment successful
- [ ] Demo accounts work on the Vercel URL
- [ ] (Optional) Custom domain configured
- [ ] (Optional) Tracking service deployed separately

---

## Environment Variable Reference

| Variable | Where | Example |
|---|---|---|
| `DATABASE_URL` | Vercel + local | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres?schema=public` |
| `ABOARD_SESSION_SECRET` | Vercel + local | `a1b2c3d4e5f6...` (32+ chars, `openssl rand -hex 32`) |
| `ABOARD_PAYMENT_SANDBOX_KEY` | Vercel + local | `aboard-sandbox-key` |
| `NEXT_PUBLIC_APP_URL` | Vercel only | `https://your-app.vercel.app` |

**Never commit `.env` to git.** The `.gitignore` already excludes it.
