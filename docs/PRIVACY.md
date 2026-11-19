# Aboard — Privacy & Data Protection

## Governing law

This product follows the **Ghana Data Protection Act, 2012 (Act 843)** and
the general principles of the EU GDPR where they offer stronger protection.

## Data we collect

| Data | Who | Why | Retention |
|---|---|---|---|
| Name, phone, email | All users | Identity, auth, notifications | Until account deletion |
| Password hash (scrypt) | All users | Auth | Until account deletion |
| Student ID number + institution | Students | Verification | Until account deletion |
| Student ID photo | Students | Verification | Deleted after verification completes (max 30 days) |
| Parent-student link | Parents, students | Consent-based trip following | Until revocation + 30 days |
| Booking records | Students | Trip history, refunds | 7 years (financial record) |
| Payment records | All payers | Reconciliation, refunds | 7 years (financial record) |
| Signed QR ticket payload | Students | Boarding | Until trip departure + 24h, then expired |
| Scan records | Drivers, students | Boarding verification audit | 90 days |
| Location updates (driver GPS) | Drivers | Live tracking, ETA | 7 days (`LOCATION_RETENTION_MS`) |
| Live position broadcast | Drivers | Real-time student/parent map | Ephemeral — not persisted, only broadcast |
| Audit logs | All users | Security audit | 1 year |

## Parent access rules

A parent can see a trip only when **all three** are true:
1. The student accepted the link (`parent_links.consentStatus = 'ACCEPTED'`)
2. The student has a confirmed booking on that trip
3. The trip is active (`trips.status = 'ACTIVE'`)

These rules are enforced server-side:
- Socket.IO middleware checks `parent_links` + `bookings` before joining
  a trip room.
- The `/api/v1/consent/*` endpoints require mutual authentication.

Students can revoke parent access at any time. Revocation is instant —
the parent's Socket.IO connection is kicked from the trip room on the
next position broadcast.

## Location data specifics

- **Whose location is tracked:** the **driver's** device, not the student's.
  Students share their location only optionally (to show "you are here" on
  the live map and to compute walking distance to the pickup stop).
- **How often:** driver position is broadcast every 3–5 seconds while a
  trip is active. A persisted point is saved to `location_updates` every
  15–30 seconds for ETA history.
- **Who sees it:** students booked on that trip + accepted parents + the
  operator + admins. Never exposed in analytics views.
- **Background tracking:** the driver screen uses the Screen Wake Lock API
  to prevent the browser from sleeping while a trip is active. The page
  must stay foregrounded. For true background tracking (screen off), a
  Capacitor wrapper is planned (see `docs/PHASE2.md`).
- **Retention:** `location_updates` rows older than 7 days are deleted by
  a scheduled cleanup job. In local dev this runs on a 30s interval; in
  production it runs via pg_cron daily.

## Student verification

- Students verify via school email (`@ucc.edu.gh`) or student ID number.
- Admin can manually approve as a fallback.
- Until verified, students can browse trips but cannot book seats.
- Student ID photos (if uploaded) are stored in a private bucket with
  signed URLs and deleted within 30 days of verification.

## Data subject rights

Under GDPR-style principles, users have:
- **Right of access:** the `/api/v1/auth/me` endpoint returns the user's
  profile. A full data export endpoint is planned (phase 2).
- **Right to rectification:** users can edit their name and phone in the
  profile UI (planned).
- **Right to erasure:** account deletion is planned (phase 2). Financial
  records (bookings, payments) are retained for 7 years per accounting
  law but anonymized on deletion.
- **Right to revoke consent:** parent links can be revoked at any time
  from the student profile.

## Security measures

- Passwords hashed with scrypt (not plain text, not MD5).
- Session tokens are HMAC-SHA256 signed with a 32+ char secret.
- Access tokens short-lived; refresh tokens httpOnly + secure.
- Service-role keys (planned for Supabase) never exposed to the browser.
- Webhook signatures verified with timing-safe comparison.
- Input validation on every endpoint via Zod.
- Rate limiting planned for auth, search, and payment endpoints (phase 2).

## Privacy policy & terms pages

The footer's "Privacy", "Terms", "Data Protection", and "Refunds" links
open bottom sheets with the relevant policy text. These are drafted in
`src/components/common/footer-link-sheet.tsx` and should be reviewed by
a Ghana-qualified lawyer before production launch.

## Breach response

In the event of a data breach:
1. Disconnect the affected environment (staging or production).
2. Audit `audit_logs` for the affected time window.
3. Notify the Ghana Data Protection Commission within 72 hours per Act 843.
4. Notify affected users via SMS + email + in-app notification.
5. Post a public incident report within 30 days.
