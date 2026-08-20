# Backend Modules — API Reference (Phase 1)

All endpoints under `http://localhost:5000`. Auth-protected routes need
`Authorization: Bearer <token>`. All `/api/admin/*` routes require the **admin**
role — admin operations live under their own router namespace, separate from
normal user APIs. (Legacy `/api/users` remains mounted for compatibility.)

## Admin Dashboard — `/api/admin`

| Method | Route                 | Access | Description |
| ------ | --------------------- | ------ | ----------- |
| GET    | `/api/admin/stats`    | admin  | Aggregation analytics: `totalUsers`, `totalDoctors`, `verifiedDoctors`, `pendingVerifications`, `pendingGuidance`, `totalAppointments` + breakdowns `usersByRole`, `doctorsByStatus`, `appointmentsByStatus` |
| GET    | `/api/admin/users`    | admin  | Paginated user list (`page`, `limit`, `q` name/email search, `role` filter) |
| PUT    | `/api/admin/users/:id/role` | admin | Change role (`patient`\|`doctor`\|`admin`) — cannot change own role |
| DELETE | `/api/admin/users/:id` | admin | Delete a user — cannot delete own account |
| GET    | `/api/admin/sponsored-services` | admin | All services incl. hidden (`page`, `limit`, `q` name search, `category`, `isActive` filters) |
| POST   | `/api/admin/sponsored-services` | admin | Create service (same validation as public write routes) |
| PUT    | `/api/admin/sponsored-services/:id` | admin | Update service (incl. `isActive` publish/hide toggle) |
| DELETE | `/api/admin/sponsored-services/:id` | admin | Delete service |

## Doctors — `/api/doctors`

| Method | Route                              | Access  | Description |
| ------ | ---------------------------------- | ------- | ----------- |
| GET    | `/api/doctors`                     | Public  | Search **verified** doctors only (non-admins): `specialization`, `city`, `minRating`, `maxFee`, `lat`+`lng`+`maxDistance` (meters), `page`, `limit`. Admins may pass `verificationStatus=pending|verified|rejected` to see all profiles (sensitive fields stripped for non-admins) |
| GET    | `/api/doctors/nearby`              | Public  | Nearby verified doctors via 2dsphere + `$geoNear`: `latitude`, `longitude` (required), `specialization?`, `maxDistance?` (meters, default 10,000, max 500,000). Returns `{ name, profilePhoto, qualification, specialization, experience, hospital, consultationFee, rating, location, distance (m), distanceKm }` sorted nearest-first |
| GET    | `/api/doctors/saved`               | patient | List saved doctors (populated profile + user name), newest first |
| POST   | `/api/doctors/:id/save`            | patient | Save a doctor profile (409 if already saved) |
| DELETE | `/api/doctors/:id/save`            | patient | Remove a doctor from the saved list (404 if not saved) |
| GET    | `/api/doctors/:id/availability`    | Public  | Available time slots (`isAvailable: true`) for the doctor's profile, sorted by day/time |
| GET    | `/api/doctors/:id`                 | Public  | Doctor profile detail (verification details + history visible only to owner/admin) |
| POST   | `/api/doctors/me`                  | doctor  | Create own profile — always starts `pending`; doctors cannot set verification status |
| GET    | `/api/doctors/me`                  | doctor  | Get own profile (full, incl. verification history) |
| PUT    | `/api/doctors/me`                  | doctor  | Update own profile — only whitelisted profile fields are accepted (`verificationStatus`, `rating`, `verificationHistory` are ignored) |
| PUT    | `/api/doctors/me/verification`     | doctor  | Submit `{ licenseNumber, issuingAuthority }` — resets status to `pending`, records history entry, notifies admins via their pending list |
| GET    | `/api/doctors/me/availability`     | doctor  | List own slots |
| POST   | `/api/doctors/me/availability`     | doctor  | Add slot `{ dayOfWeek, startTime, endTime, isAvailable? }` (0=Sunday..6=Saturday) |
| PUT    | `/api/doctors/me/availability/:slotId` | doctor | Update own slot |
| DELETE | `/api/doctors/me/availability/:slotId` | doctor | Delete own slot |
| PUT    | `/api/doctors/:id/verify`          | admin   | Legacy verify `{ status: verified\|rejected, notes? }` |

Profile payload: `profilePhoto?` (http(s) URL), `qualification[]`, `specialization`,
`experience`, `hospital{name,address?,city?}`, `consultationFee`,
`location{type:"Point",coordinates:[lng,lat]}` (validated ±180/±90), `about?` (≤1000).

Only **verified** doctors appear in public search and are bookable. Every status
change (create, verification submit, admin verify/reject) is recorded in
`verificationHistory[]` with actor, notes and timestamp.

## Doctor verification (admin) — `/api/admin/doctors`

| Method | Route                             | Access | Description |
| ------ | --------------------------------- | ------ | ----------- |
| GET    | `/api/admin/doctors/verification` | admin  | List profiles by `?status=pending\|verified\|rejected` (default pending), newest first |
| GET    | `/api/admin/doctors/verification/:id` | admin | Full profile incl. verification details and complete history |
| PUT    | `/api/admin/doctors/verification/:id` | admin | `{ status: verified\|rejected, notes? }` — records history entry with admin + notes |

## Appointments — `/api/appointments`

| Method | Route                 | Access           | Description |
| ------ | --------------------- | ---------------- | ----------- |
| POST   | `/api/appointments`   | patient          | Book `{ doctor, date, startTime, endTime, reason }` — slot must be within a 30-minute window of the doctor's availability; atomic double-booking protection via partial unique index (409 on conflict) |
| GET    | `/api/appointments/me`| any authenticated | Own appointments (as patient or doctor); `?status=`; includes `doctorProfileId` for slot lookups |
| GET    | `/api/appointments/:id` | participants/admin | Detail |
| PUT    | `/api/appointments/:id/status` | doctor/patient/admin | Status transitions enforced: doctor: scheduled/rescheduled→completed/cancelled; patient: →cancelled; admin: any |
| PUT    | `/api/appointments/:id/cancel` | patient/doctor/admin | Rules: active appointment only, ≥24h before start (admin exempt); releases the slot |
| PUT    | `/api/appointments/:id/reschedule` | patient/admin | Rules: ≥24h before start, max 2 reschedules, new date within booking window, slot availability re-checked atomically |

Statuses: `scheduled` → `completed` / `cancelled` / `rescheduled`. Both parties get
a notification on every change.

## Availability — `/api/availability`

| Method | Route  | Access | Description |
| ------ | ------ | ------ | ----------- |
| GET    | `/api/availability` | doctor | Own availability windows |
| POST   | `/api/availability` | doctor | Add window `{ dayOfWeek, startTime, endTime, isAvailable? }` (0=Sunday..6=Saturday) — slots are derived from windows at 30-minute granularity |

## Doctor slots — `/api/doctors/:id/slots`

| Method | Route | Access | Description |
| ------ | ----- | ------ | ----------- |
| GET    | `/api/doctors/:id/slots?date=YYYY-MM-DD` | Public | Available 30-minute slots for a date: windows minus already-booked slots (`scheduled`/`rescheduled`/`completed`) |

## Appointments (admin) — `/api/admin/appointments`

| Method | Route | Access | Description |
| ------ | ----- | ------ | ----------- |
| GET    | `/api/admin/appointments` | admin | Monitor all appointments; `?status=`, `?doctorId=`, `?patientId=`, `?from=`/`?to=` date range, `?page=`/`?limit=` → `{ data, total, pagination }` |

## Symptoms — `/api/symptoms`

| Method | Route               | Access  | Description |
| ------ | ------------------- | ------- | ----------- |
| POST   | `/api/symptoms/analyze` | Public (history saved only when authenticated) | Analyze `{ symptoms[], additionalSymptoms?, durationInDays (1-365), severity (mild\|moderate\|severe), description? (≤500) }`. Forwards to the AI service `/predict` (TF-IDF + logistic regression, see `docs/ai-model.md`), returns `{ recommendedSpecialty, urgencyLevel (low\|medium\|high\|emergency), confidenceScore, summary, message, showTemporaryGuidance, matchedRules[], disclaimer }`. `urgencyLevel` is set by the rule-based safety module (see `docs/urgency-rules.md`), not the AI. Falls back to a rule-based mock if the AI service is unreachable |
| GET    | `/api/symptoms/searches` | any authenticated | Recent analyses of the current user (latest 20) |
| GET    | `/api/symptoms`      | Public  | List; `?category=`, `?severityLevel=`, `?q=` (name search) |
| GET    | `/api/symptoms/:id`  | Public  | Detail |
| POST   | `/api/symptoms`      | admin   | Create `{ name, category, severityLevel?, description?, recommendedSpecialty? }` |
| PUT    | `/api/symptoms/:id`  | admin   | Update |
| DELETE | `/api/symptoms/:id`  | admin   | Delete |

Analysis input is validated (non-empty symptom array, each 2-100 chars, duration bounds,
severity enum, description length). Results are never framed as confirmed diagnoses;
a medical disclaimer is attached to every response and stored history. The safety
urgency module overrides AI output and can suppress self-care guidance entirely.

## Urgency — `/api/urgency`

| Method | Route                 | Access | Description |
| ------ | --------------------- | ------ | ----------- |
| POST   | `/api/urgency/evaluate` | Public | `{ symptoms[], durationInDays, severity, description? }` → `{ urgency, message, showTemporaryGuidance, matchedRules[] }`. Same logic that drives `/api/symptoms/analyze`, exposed standalone for clients that want urgency without the AI call |
| GET    | `/api/urgency/rules`   | admin  | The full rule set (`urgencyRules.json`) including review status of every rule |

Rules are phrase-based, conservative (over-trigger by design), and carry an explicit
`pending-review` status until a medical professional signs off each one.

## Temporary Remedies — `/api/remedies`

| Method | Route                     | Access        | Description |
| ------ | ------------------------- | ------------- | ----------- |
| POST   | `/api/remedies/match`     | Public        | Patient lookup after AI analysis: `{ symptoms[] (names), recommendedSpecialty }` → only **approved** guidance, ranked by match score (specialty +2, each matched symptom +1), max 5. Never generated by AI — database content only |
| GET    | `/api/remedies`           | authenticated | Patients: approved only. Doctors: own + approved (`?mine=true` → own only, any status, for the dashboard's Submitted Guidance section). Admins: all (`?approvalStatus=`, `?symptom=`, `?category=`, `?specialty=`) |
| GET    | `/api/remedies/:id`       | authenticated | Role-aware visibility (patients/other doctors see approved only) |
| POST   | `/api/remedies`           | doctor/admin  | Submit `{ symptoms[], probableConditionCategory, recommendedSpecialty, safeTemporaryGuidance, precautions?, avoid?, emergencyWarningSigns? }` — starts `pending`, admins notified |
| PUT    | `/api/remedies/:id`       | doctor/admin  | Doctor edits own non-approved; admin edits any |
| PUT    | `/api/remedies/:id/approval` | admin      | Legacy approval `{ status: approved\|rejected, notes? }` — records approver + timestamp, notifies submitting doctor |
| DELETE | `/api/remedies/:id`       | doctor/admin  | Doctor deletes own non-approved; admin any |

## Temporary Remedies (admin) — `/api/admin/remedies`

| Method | Route                 | Access | Description |
| ------ | --------------------- | ------ | ----------- |
| GET    | `/api/admin/remedies/pending` | admin | All pending guidance, newest first |
| PUT    | `/api/admin/remedies/:id/approve` | admin | `{ notes? }` — approves; publishes to patients; notifies submitting doctor |
| PUT    | `/api/admin/remedies/:id/reject` | admin | `{ notes? }` — rejects; notifies submitting doctor |

Workflow: doctor submits → `pending` → admin approves/rejects → **only approved**
entries are visible to patients (enforced server-side in every read path and the
match endpoint). No confirmed diagnoses — only condition categories + built-in
disclaimer.

## Reviews — `/api/reviews`

| Method | Route                       | Access  | Description |
| ------ | --------------------------- | ------- | ----------- |
| POST   | `/api/reviews`              | patient | `{ doctor, rating (1-5), comment? }` — requires a completed appointment with that doctor; **one review per appointment** (409 if already reviewed; a new completed appointment unlocks a new review) |
| GET    | `/api/reviews`              | any     | Own written reviews |
| GET    | `/api/reviews/doctor/:doctorId` | Public | Paginated reviews for a doctor: `?page=` (default 1), `?limit=` (default 10, max 50) → `{ data, pagination }` |
| PUT    | `/api/reviews/:id`          | patient | Edit own review |
| DELETE | `/api/reviews/:id`          | patient/admin | Delete (owner or admin) |

## Reviews (admin) — `/api/admin/reviews`

| Method | Route               | Access | Description |
| ------ | ------------------- | ------ | ----------- |
| GET    | `/api/admin/reviews` | admin | All reviews, paginated (`page`/`limit`), with `?rating=`, `?patientId=`, `?doctorId=`, `?q=` comment search; populated with doctor + patient + appointment |
| DELETE | `/api/admin/reviews/:reviewId` | admin | Remove inappropriate reviews; recomputes the doctor's rating |

Doctor `rating` on the profile is recomputed automatically after create/update/delete
(`services/ratingService.js`, aggregation average rounded to 1 decimal).

## Notifications — `/api/notifications`

| Method | Route                       | Access | Description |
| ------ | --------------------------- | ------ | ----------- |
| GET    | `/api/notifications/me`     | any    | Own notifications (latest 50); `?unread=true` |
| PUT    | `/api/notifications/me/read/:id` | any | Mark one read |
| PUT    | `/api/notifications/me/read-all` | any | Mark all read |
| DELETE | `/api/notifications/me/:id` | any    | Delete own |

Types: `appointment`, `remedy`, `review`. Created automatically on events
(booking request, status change, remedy submit/approval, review received).

## Sponsored Services — `/api/sponsored-services`

| Method | Route                 | Access | Description |
| ------ | --------------------- | ------ | ----------- |
| GET    | `/api/sponsored-services` | Public | List **active** services; `?category=` (`pharmacy` \| `diagnostics` \| `checkup` \| `insurance` \| `consultation` \| `clinic` \| `wellness` \| `emergency` \| `other`), `?lat=`+`?lng=`+`?maxDistance=` → `$geoNear` nearest-first with `distanceInMeters` + `distanceKm` |
| GET    | `/api/sponsored-services/:id` | Public | Detail |
| POST   | `/api/sponsored-services` | admin | Create `{ name, description?, category?, price?, location{coordinates}, contact?, sponsor?, isSponsored?, isActive? }` — `sponsor` required when `isSponsored: true` |
| PUT    | `/api/sponsored-services/:id` | admin | Update |
| DELETE | `/api/sponsored-services/:id` | admin | Delete |

### Isolation guarantees (non-negotiable)

The service directory is a **standalone module** — a separate model, router and
controller with its own `/api/sponsored-services` namespace. Nothing in the medical
pipeline reads it:

- AI specialist recommendation (`/api/symptoms/analyze` → ai-service `/predict`)
- Urgency classification (`urgencyService` / `urgencyRules.json`)
- Doctor-verified guidance (`TemporaryRemedy`, approved by admins)

…are all completely independent of sponsored services. The only integration point
is **presentational**: the urgency panel may *display* `category: emergency` entries
(as explicitly labeled optional/sponsored listings) and the `/services` page lists
the directory. Frontend cards carry an `Optional` tag on every card and a
`Sponsored · <sponsor>` tag on paid placements. Sponsored services can never alter
an analysis result, urgency level, or which verified guidance is shown.

## Users (admin) — `/api/users`

| Method | Route              | Access | Description |
| ------ | ------------------ | ------ | ----------- |
| GET    | `/api/users`       | admin  | List users (no passwordHash); `?role=`, `?q=` (name/email search), `?page=`, `?limit=` |
| PUT    | `/api/users/:id/role` | admin | Change role `{ role: patient\|doctor\|admin }` |
| DELETE | `/api/users/:id`   | admin  | Delete a user (cannot delete self) |

## Business rules enforced

- Only verified doctors appear in search and can be booked.
- Booking validates: doctor availability slot (day + time window) and no overlapping
  pending/confirmed appointment → `409` on conflict.
- Review requires a completed appointment; rating auto-recomputed via aggregation.
- Remedies are `pending` until an admin approves with notes; patients never see
  unapproved content. After AI analysis, patients query `POST /api/remedies/match`
  (approved-only, symptom + specialty ranked); guidance is never AI-generated.
  For `high`/`emergency` urgency, the frontend suppresses self-care guidance
  (`showTemporaryGuidance: false`) and shows urgent-care messaging instead.
- Notifications fire on every cross-party event.
