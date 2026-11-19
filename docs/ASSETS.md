# Aboard — Asset Registry

This document lists every brand, animation, and 3D asset slot in the product.
Each slot is **filename-swappable** — drop your real file at the exact path
with the exact name and it loads with no code changes.

## Brand assets (`/public/brand/`)

| Slot | Filename | Dimensions | Notes |
|---|---|---|---|
| Full logo (mark + wordmark) | `logo-full.svg` | 120×40 | Used in header, footer |
| Mark only (square icon) | `logo-mark.svg` | 40×40 | Used in favicon, PWA icon |
| White version (dark bg) | `logo-white.svg` | 160×44 | Used on belt/dark sections |

**Current state:** placeholder SVGs in sand-cream + charcoal + tan editorial
palette. Replace with your final logo when ready — keep the SVG format and the
exact filenames.

## Animation slots (`/public/animations/`)

All animations are Lottie JSON by default. The registry at
`src/lib/animations/registry.ts` also supports `.dotlottie` and `.riv` (Rive)
files — change the `path` field for a slot to point at a different format.

| Slot | Filename | Used on |
|---|---|---|
| splash | `splash.json` | App splash screen (PWA) |
| onboarding | `onboarding.json` | First-run onboarding carousel |
| booking-success | `booking-success.json` | Booking confirmation |
| payment-processing | `payment-processing.json` | Payment pending state |
| ticket-reveal | `ticket-reveal.json` | Animated ticket reveal |
| seat-selected | `seat-selected.json` | Seat selection confirmation |
| bus-arriving | `bus-arriving.json` | "Bus is 2 min away" notification |
| boarding-verified | `boarding-verified.json` | Driver scan success |
| trip-started | `trip-started.json` | Trip start broadcast |
| arrived-safely | `arrived-safely.json` | Arrival notification (parent) |
| empty-state | `empty-state.json` | Generic empty states |
| loading | `loading.json` | Loading skeletons fallback |
| error | `error.json` | Error states |

**Current state:** each slot has a minimal placeholder Lottie JSON (a single
warm-tan circle, 30fps, 2 seconds). Replace each with your real animation
keeping the exact filename.

## 3D assets (`/public/3d/`)

| Slot | Filename | Format | Notes |
|---|---|---|---|
| Hero 3D bus | `hero-bus.glb` | glTF binary | Lazy-loaded on landing hero via R3F. Static image fallback until supplied. |

Spline scenes are also supported — see `public/3d/README.md`.

## Image registry (`/public/images/`)

See `IMAGES.md` for the full image slot list. Each slot is a filename-swappable
placeholder. Until you supply real photography, slots contain a note in the
registry; the UI renders a CSS gradient placeholder where an image is missing.

## How swapping works

Every asset is loaded through a single registry file
(`src/lib/animations/registry.ts` for animations; direct path imports for
brand SVGs; `next/image` with `src` for photography). To swap any asset:

1. Drop your file at the exact path with the exact filename.
2. Reload the app. No code changes required.

For format changes (e.g., switching a Lottie slot to Rive), update the `path`
field in `src/lib/animations/registry.ts` to point at the new file extension.
