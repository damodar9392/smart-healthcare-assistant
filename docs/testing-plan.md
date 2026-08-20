# Smart Healthcare Assistant — Testing Plan

Scope: the three services (React frontend :5173, Express API :5000, FastAPI
AI service :8000) and the MongoDB persistence layer. Tests are written against
the contracts in `docs/api-modules.md`, `docs/integration-flow.md`,
`docs/database-design.md`, and `backend/src/config/bookingRules.js`.

Legend: ✅ expected | ❌ rejected | **Actual output** and **Result** columns
are filled in when the test is executed.

---

## 1. Authentication

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 | Register patient | `POST /api/auth/register` `{name, email, password, role:"patient"}` | 201, `{success, data:{user, token}}` | | |
| AUTH-002 | Register doctor | same with `role:"doctor"` | 201, doctor user + JWT | | |
| AUTH-003 | Register admin | `role:"admin"` | ❌ 403 "Admin accounts cannot be created publicly" | | |
| AUTH-004 | Duplicate email | same email again | ❌ 409 "Email is already registered" | | |
| AUTH-005 | Validation | invalid email / short password / missing name | ❌ 400 `{success:false, errors:[{field,message}]}` | | |
| AUTH-006 | Login ok | `POST /api/auth/login` correct credentials | 200 `{token, user}` | | |
| AUTH-007 | Login wrong password | correct email, wrong password | ❌ 401 "Invalid email or password" | | |
| AUTH-008 | Login unknown email | unregistered email | ❌ 401 same message (no user enumeration) | | |
| AUTH-009 | Get me | `GET /api/auth/me` with valid Bearer token | 200, current user payload | | |
| AUTH-010 | Get me no token | no Authorization header | ❌ 401 | | |
| AUTH-011 | Get me bad token | garbage/expired token | ❌ 401 "Invalid token" / "Token expired" | | |

## 2. Role-based access

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| RBAC-001 | Patient hits doctor-only | `GET /api/doctors/me` as patient | ❌ 403 | | |
| RBAC-002 | Doctor books appointment | `POST /api/appointments` as doctor | ❌ 403 (patient-only) | | |
| RBAC-003 | Patient hits admin stats | `GET /api/admin/stats` as patient | ❌ 403 | | |
| RBAC-004 | Admin reads stats | same as admin | 200, aggregated counts | | |
| RBAC-005 | Doctor creates remedy | `POST /api/remedies` as doctor | 201, status defaults to pending | | |
| RBAC-006 | Patient creates remedy | same as patient | ❌ 403 | | |
| RBAC-007 | Admin approves remedy | `PUT /api/admin/remedies/:id/approve` as admin | 200, status=approved | | |
| RBAC-008 | User list | `GET /api/admin/users` as non-admin | ❌ 403 | | |

## 3. Symptom analysis

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| SYMP-001 | Analyze (happy path) | `POST /api/symptoms/analyze` `{symptoms:["headache","fever"], durationInDays:3, severity:"moderate"}` | 200 with `recommendedSpecialty`, `urgencyLevel`, `confidenceScore`, `summary`, `disclaimer`, `message`, `showTemporaryGuidance` | | |
| SYMP-002 | Analyze AI unreachable | ai-service stopped, same payload | 200, result flagged `source:"mock"` (keyword fallback, no crash) | | |
| SYMP-003 | Empty symptoms | `{symptoms:[], ...}` | ❌ 400 "symptoms must be an array with at least 1 item" | | |
| SYMP-004 | Duration out of range | `durationInDays:0` or `400` | ❌ 400 | | |
| SYMP-005 | Invalid severity | `severity:"critical"` | ❌ 400 | | |
| SYMP-006 | History (patient) | `GET /api/symptoms/searches` with patient token | 200, list of past analyses (newest first) | | |

## 4. AI service communication

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| AI-001 | Health check | `GET /health` on :8000 | 200 `{status:"ok", model: {ready: true, ...}}` | | |
| AI-002 | Predict valid | `POST /predict` `{symptoms:["cough"], duration_days:2, severity:"mild"}` | 200 `{recommended_specialty, urgency, confidence, disclaimer}` | | |
| AI-003 | Predict model missing | engine not ready | ❌ 503 "Model is not available" | | |
| AI-004 | Predict validation | `severity:"urgent"` | ❌ 422 (pydantic detail) | | |
| AI-005 | Backend→AI mapping | backend `durationInDays`/`severity` → AI `duration_days`/`severity` | analyze result equals AI output mapped back (assert equality) | | |
| AI-006 | Timeout | AI HTTP call takes > backend timeout | backend falls back to mock, 200 `source:"mock"` | | |
| AI-007 | Unit: aiService mocks | mocked fetch/axios returning edge payloads | correct parsing / graceful error, no unhandled rejection | | |

## 5. Urgency detection

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| URG-001 | Emergency keywords | analyze `{symptoms:["chest pain"], severity:"severe"}` | urgencyLevel high/emergency, `showTemporaryGuidance:false` | | |
| URG-002 | Low urgency | `{symptoms:["mild headache"], durationInDays:1, severity:"mild"}` | urgencyLevel low, `showTemporaryGuidance:true`, guidance shown | | |
| URG-003 | Rule engine override | AI returns low but rule engine flags high | engine result is authoritative (backend overrides AI) | | |
| URG-004 | Direct evaluate | `POST /api/urgency/evaluate` with symptom set | 200 `{level, reason(s), action}` | | |
| URG-005 | Rules catalog | `GET /api/urgency/rules` as admin | 200, rule list | | |

## 6. Doctor-approved guidance retrieval

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| GUID-001 | Match remedies | `POST /api/remedies/match` with `symptoms:["headache"]` + specialty | 200, only `status:"approved"` remedies matched | | |
| GUID-002 | Pending hidden | remedy with status pending added by doctor | ❌ not returned by match or list endpoints | | |
| GUID-003 | Rejected hidden | status rejected | ❌ not returned | | |
| GUID-004 | Guidance fields present | approved remedy payload | contains `safeTemporaryGuidance`, `precautions`, `avoid`, `emergencyWarningSigns`, `reference`/`source` | | |
| GUID-005 | Frontend render | Specialty component pass-through | `VerifiedGuidance` renders for low urgency only; not rendered when `showTemporaryGuidance===false` | | |

## 7. Doctor verification

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| VER-001 | Doctor creates profile | `POST /api/doctors/me` as doctor (license, specialization, hospital, location) | 201, `status:"pending"` | | |
| VER-002 | Unverified hidden | search doctors as patient before approval | doctor with pending status excluded | | |
| VER-003 | Admin list | `GET /api/admin/doctors/verification` as admin | 200, pending profiles with documents |
| VER-004 | Admin approve | `PUT /api/admin/doctors/verification/:id` `{status:"verified"}` | 200, `isVerified:true` | | |
| VER-005 | Admin reject | `{status:"rejected", notes:"..."}` | 200, status rejected, notes stored | | |
| VER-006 | Visible after approve | search again | ✅ now returned with distance | | |
| VER-007 | Patient verifies | same admin endpoint as patient | ❌ 403 | | |
| VER-008 | Duplicate profile | doctor posts profile twice | ❌ 409 "Profile already exists" | | |

## 8. Nearby doctor search

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| NEAR-001 | Geo search | `GET /api/doctors/nearby?latitude=..&longitude=..&maxDistance=10000` | 200, verified doctors only, sorted by distance, `distanceKm` present | | |
| NEAR-002 | Specialty filter | `+specialization=Cardiologist` | only matching verified doctors | | |
| NEAR-003 | Radius filter | `maxDistance=5000` with doctor 8 km away | doctor excluded | | |
| NEAR-004 | Invalid coords | `latitude=999` | ❌ 400 | | |
| NEAR-005 | City fallback | `GET /api/doctors?city=Karachi&specialization=...` | 200, verified doctors matching city+specialty | | |
| NEAR-006 | Frontend prefill | navigate to `/doctors?specialty=Cardiologist` | specialty input prefilled + auto-search runs, notice shown | | |

## 9. Location permission failure

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| LOC-001 | Permission denied | mock `navigator.geolocation` → `PERMISSION_DENIED` | manual mode enabled, notice "Location permission was denied…", no crash | | |
| LOC-002 | Unavailable | geolocation → `POSITION_UNAVAILABLE` | manual mode, fallback message | | |
| LOC-003 | Timeout | geolocation → `TIMEOUT` | manual mode, timeout message | | |
| LOC-004 | Not supported | delete `navigator.geolocation` | manual mode, "not supported" notice | | |
| LOC-005 | Manual search works | city + specialty submitted | city API called with parameters, results rendered | | |

## 10. Appointment booking

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| BOOK-001 | Book valid slot | doctor with availability, `POST /api/appointments` `{doctor, date, startTime:"10:00", endTime:"10:30", reason}` | 201, status scheduled, appointment persisted | | |
| BOOK-002 | Slot length rule | `startTime:"10:00", endTime:"10:45"` | ❌ 400 "Each slot is 30 minutes" | | |
| BOOK-003 | Past date | yesterday | ❌ 400 "Appointment date cannot be in the past" | | |
| BOOK-004 | Too far ahead | date +20 days | ❌ 400 "up to 14 days in advance" | | |
| BOOK-005 | No doctor availability | slot not in doctor availability schedule | ❌ 400 "Doctor is not available for booking" | | |
| BOOK-006 | Unauthenticated | no token | ❌ 401 | | |
| BOOK-007 | Invalid doctor id | `doctor:"abc"` | ❌ 400 "Valid doctor id required" | | |
| BOOK-008 | Notification side-effect | successful booking | notification row created for patient (see §14) | | |

## 11. Double booking prevention

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| DBL-001 | Sequential double book | two patients book the same doctor/date/startTime after each other | 1 × 201, second ❌ 409 "This slot was just booked by someone else" | | |
| DBL-002 | Same patient twice | same patient books identical slot again | ❌ 409 | | |
| DBL-003 | Concurrent race | fire both bookings with `Promise.all` (parallel) | exactly one 201, one 409 — no two appointments for the slot | | |
| DBL-004 | Reschedule into taken slot | patient B reschedules onto patient A's existing slot | ❌ 409 | | |
| DBL-005 | Distinct slots allowed | second booking on a different free slot of same doctor | ✅ 201 | | |

## 12. Appointment cancellation

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| CANC-001 | Patient cancels own | `PUT /api/appointments/:id/cancel` as the booking patient | 200, status=cancelled, other party notified | | |
| CANC-002 | Doctor cancels | same endpoint as the doctor | 200, status=cancelled, patient notified | | |
| CANC-003 | Stranger cancels | third user ID | ❌ 403 "Not allowed to cancel" | | |
| CANC-004 | Insufficient lead | appointment within 24 h of start | ❌ 400 "Cancellation is only allowed at least 24 hours before" | | |
| CANC-005 | Already completed | cancel a completed appointment | ❌ 400 "Only active appointments can be cancelled" | | |
| CANC-006 | Reschedule rules | valid new slot, expiry < 24 h before start | ❌ 400 (24 h lead) | | |
| CANC-007 | Reschedule limit | 3rd reschedule | ❌ 400 "maximum of 2" | | |
| CANC-008 | Reschedule same slot | same date/startTime | ❌ 400 "Choose a different slot" | | |

## 13. Reviews

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| REV-001 | Post review | `POST /api/reviews` as patient `{doctor, rating:5, comment}` | 201, review stored, doctor's aggregate rating updated | | |
| REV-002 | Rating bounds | `rating:0` or `rating:6` | ❌ 400 "Rating must be an integer between 1 and 5" | | |
| REV-003 | Non-integer rating | `rating:4.5` | ❌ 400 | | |
| REV-004 | Doctor reviews | same endpoint as doctor role | ❌ 403 | | |
| REV-005 | Public list | `GET /api/reviews/doctor/:doctorId` | 200, reviews for that doctor | | |
| REV-006 | My reviews | `GET /api/reviews` as patient | 200, only own reviews | | |
| REV-007 | Edit own | `PUT /api/reviews/:id` own review | 200, updated, rating recalculated | | |
| REV-008 | Delete other's | delete another patient's review | ❌ 403/404 | | |

## 14. Notifications

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| NOT-001 | Booking notification | book appointment | notification row created for patient (type appointment, title, ref id) | | |
| NOT-002 | Inbox | `GET /api/notifications/me` as patient | 200, notification present, unread | | |
| NOT-003 | Mark single read | `PUT /api/notifications/me/read/:id` | 200, `read:true` | | |
| NOT-004 | Mark all read | `PUT /api/notifications/me/read-all` | 200, all own notifications read | | |
| NOT-005 | Delete notification | `DELETE /api/notifications/me/:id` | 200, removed | | |
| NOT-006 | Cross-user isolation | patient A reads patient B's notification id | ❌ 404 | | |
| NOT-007 | Reminder scheduler | appointment within `REMINDER_LEAD_HOURS` (24 h) of start, scheduler tick (5 min) | reminder notification + outbound email (console transport) generated | | |
| NOT-008 | Console transport | `EMAIL_TRANSPORT=console` | email payload printed to backend logs (subject, to, html body) | | |
| NOT-009 | Outbound record | any outbound send attempt | `OutboundNotification` row persisted with status sent/failed | | |

## 15. Admin operations

| TC ID | Feature | Input | Expected output | Actual output | Result |
| --- | --- | --- | --- | --- | --- |
| ADM-001 | Dashboard stats | `GET /api/admin/stats` as admin | 200 `{usersByRole, doctorsByStatus, appointmentsByStatus, totals}` | | |
| ADM-002 | User list | `GET /api/admin/users?role=doctor&search=` | 200, filtered users, paginated | | |
| ADM-003 | Role change | `PUT /api/admin/users/:id/role` `{role:"doctor"}` | 200, role updated | | |
| ADM-004 | Delete user | `DELETE /api/admin/users/:id` | 200, cascading cleanup (profiles/appointments?) verified | | |
| ADM-005 | Sponsored service CRUD | `POST/PUT/DELETE /api/admin/sponsored-services` | 201/200/200, listing reflects changes | | |
| ADM-006 | Remedy review list | `GET /api/admin/remedies/pending` | 200, only pending remedies | | |
| ADM-007 | Approve/reject remedy | `PUT /api/admin/remedies/:id/approve\|reject` with notes | 200, status + notes stored | | |
| ADM-008 | Doctor verification workflow | VER-003/004/005 as admin | consistent status transitions, no invalid transitions (verified→pending) | | |
| ADM-009 | Reviews moderation | `GET /api/admin/reviews` + delete | 200 list; delete removes review | | |

---

## Suggested testing strategy (practical tools)

### Backend testing — Jest + Supertest + mongodb-memory-server

- **Tooling**: Jest, `supertest`, `mongodb-memory-server` (in-memory Mongo, no
  local install needed), `@faker-js/faker` for fixtures, `jest --coverage`.
- Add `"test": "jest --runInBand"` to `backend/package.json`; suites in
  `backend/tests/`.
- **Unit tests** (no DB): `services/urgencyService` (rule matching per
  `urgencyRules.json`), `services/aiService` (mock transport — 200, timeout,
  non-2xx, malformed JSON), `services/slotService` (slot math with
  `bookingRules.js`), outbound `templates.js` (subject/body rendering).
- **Integration tests** (memory-server + Supertest): boot `app` (export the
  Express app separately from `start()`), seed users/doctors/availability, run
  each endpoint contract above. Cover DBL-003 with `Promise.all`.
- **Targets**: branch coverage ≥ 80% for services and middleware, endpoints
  exercised for the main + one error path.

### Frontend testing — Vitest + React Testing Library + MSW

- **Tooling**: Vitest, `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`, `jsdom` environment, `msw` (Mock Service
  Worker) to stub the axios API, `vi.spyOn(navigator.geolocation, ...)` for
  location tests.
- **Component/unit tests**: `UrgencyWarning` (high/emergency renders,
  guidance hidden), `DoctorList` URL-param prefill + auto-search (NEAR-006),
  all LOC-001..005 geolocation failure branches, `SymptomForm` submit →
  result card, `AuthContext` token persistence, `ProtectedRoute` redirect on
  401, `AppointmentCard` reschedule/cancel buttons disable inside lead time.
- **Coverage**: component render branches + API layer mapping functions in
  `src/services/*`.

### API testing — Supertest contract tests + Newman collection

- Reuse the Supertest suites as the primary contract tests (fast, in-process).
- Maintain a Postman/Newman collection (`docs/api-collection.json`) mirroring
  `docs/api-modules.md` for manual and CI smoke checks:
  `newman run docs/api-collection.json -e docs/env.json` runs against a booted
  backend.
- Assert the uniform response envelope `{success, data|message|errors}` and
  `400/-` validation `errors:[{field,message}]` shape for every endpoint.

### Integration testing — full-stack scripted flow

- **Stage 1 (local)**: `docker-compose.yml` (or three shells) with Mongo +
  backend + ai-service + frontend; environment via `.env.test` files
  (`MONGO_URI` → memory-server or a test DB, `EMAIL_TRANSPORT=console`,
  `RUN_REMINDER_SCHEDULER=false`).
- **Stage 2 (flow script)**: a Node script using axios replays the user
  journey exactly as `docs/integration-flow.md`: register patient + doctor →
  admin verifies → symptom analyze (assert AI source) → `/doctors?specialty=`
  → nearby search → slots → book → double-book 409 → cancel → reminder
  notification. Assert at each step.
- **Stage 3 (frontend E2E, optional)**: Playwright against the running stack —
  smoke only (login → analyze → find doctors → book).
- **CI**: GitHub Actions matrix `node:24` + `python:3.10`, `services: mongo`,
  jobs: backend jest, ai-service pytest, frontend vitest + build, and a job
  running the stage-2 flow script against the booted services.
- **Load (optional)**: k6 or Artillery one-off scenario — N concurrent
  bookings of the same slot to empirically confirm DBL-003 holds under load.

### Data & fixtures

- `backend/tests/fixtures/`: users.json, doctors.json (with geo coordinates
  near a chosen point), availability.json, remedies.json, services.json.
- ai-service: reuse `models/` artifacts; pytest fixtures in `ai-service/tests/`
  call `get_engine()` directly; include a "model missing" fixture to assert
  the 503 path.

### Suggested execution order

1. Backend unit tests (services) → 2. Backend integration (Supertest) →
3. ai-service pytest → 4. Frontend Vitest → 5. API Newman smoke →
6. Full-stack flow script → 7. (optional) Playwright E2E + load test.