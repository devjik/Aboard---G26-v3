# Aboard — Image Registry

Every image slot in the product is documented here. Each slot is
**filename-swappable** — name your file exactly as listed and drop it in
`/public/images/`.

Until you supply real photography, the UI renders a warm CSS gradient
placeholder (sand cream → tan) where an image would be. This keeps the
editorial mood consistent without broken image icons.

## Hero & marketing

| Slot | Filename | Recommended size | Used on |
|---|---|---|---|
| Hero (full-bleed) | `hero.jpg` | 2400×1600 | Landing hero background (optional — current design uses mesh gradient) |
| Hero 3D fallback | `hero-bus-fallback.jpg` | 1200×800 | Static image shown while 3D model loads |

## How it works (5 steps)

| Slot | Filename | Used on |
|---|---|---|
| Step 1 — Search | `how-it-works-1.jpg` | Landing scroll story |
| Step 2 — Pick seat | `how-it-works-2.jpg` | Landing scroll story |
| Step 3 — Pay | `how-it-works-3.jpg` | Landing scroll story |
| Step 4 — Track | `how-it-works-4.jpg` | Landing scroll story |
| Step 5 — Board | `how-it-works-5.jpg` | Landing scroll story |

## Campuses (one per pilot campus)

| Slot | Filename | Used on |
|---|---|---|
| UCC | `campus-ucc.jpg` | Routes showcase, pilot badge |
| KNUST | `campus-knust.jpg` | Future expansion |
| Legon / UG | `campus-legon.jpg` | Future expansion |

## Destinations (one per region capital)

16 slots, one per Ghana region capital. Filename pattern: `dest-<city>.jpg`.

Examples: `dest-accra.jpg`, `dest-kumasi.jpg`, `dest-tamale.jpg`,
`dest-takoradi.jpg`, `dest-cape-coast.jpg`, etc.

## Role portraits

| Slot | Filename | Used on |
|---|---|---|
| Student | `student.jpg` | Roles section, student onboarding |
| Driver | `driver.jpg` | Roles section, driver mode empty state |
| Parent | `parent.jpg` | Roles section, parent onboarding |
| Operator | `operator.jpg` | Roles section, operator console header |

## Testimonials

| Slot | Filename | Used on |
|---|---|---|
| Testimonial 1 | `testimonial-1.jpg` | (Future) testimonial carousel |
| Testimonial 2 | `testimonial-2.jpg` | (Future) testimonial carousel |
| Testimonial 3 | `testimonial-3.jpg` | (Future) testimonial carousel |

## Feature cards

| Slot | Filename | Used on |
|---|---|---|
| Feature — Live tracking | `feature-tracking.jpg` | Bento grid feature |
| Feature — QR boarding | `feature-qr.jpg` | Bento grid feature |
| Feature — Parent peace | `feature-parent.jpg` | Bento grid feature |

## Image treatment spec

When you supply images:

- **Format:** AVIF or WebP (provide JPEG fallback for legacy browsers)
- **Sizing:** provide `srcset` at 1x, 1.5x, 2x for responsive images
- **Aspect ratios:** hero 3:2, cards 16:9, portraits 1:1, destinations 4:3
- **Color treatment:** warm tones that complement the sand-cream + tan palette;
  avoid neon or cool-blue imagery that clashes with the editorial mood
- **Compression:** target < 200KB per image at 1x
- **Alt text:** every `<Image>` must have descriptive `alt` for accessibility

## Lazy loading

All images below the fold use `loading="lazy"` and `placeholder="blur"` where
a blurDataURL is available. The mesh-gradient background on the hero ensures
the Largest Contentful Paint is the headline text, not an image — keeping
LCP under the 2.5s budget on 4G.
