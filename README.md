# Smart Healthcare Assistant

An AI-powered healthcare assistant that takes patients from symptom analysis
to booking a verified doctor nearby — built as a monorepo with three services:

| Service | Stack | Port |
| --- | --- | --- |
| `frontend/` | React 18 (Vite) SPA | 5173 |
| `backend/` | Node.js >= 24, Express, MongoDB (Mongoose) | 5000 |
| `ai-service/` | Python 3.10+, FastAPI, scikit-learn | 8000 |

```
smart-healthcare-assistant/
│
├── frontend/          # React SPA — auth, symptom form, doctor search, bookings, dashboards
├── backend/           # Express API — the only public API; orchestrates the AI service
├── ai-service/        # FastAPI + scikit-learn — symptom classification prediction
├── docs/              # Architecture, API, database, AI model, notifications, flow docs
└── README.md
```

## What is implemented

- **Auth & roles** — patient / doctor / admin JWT auth (`POST /api/auth/register|login`)
- **AI symptom analysis** — `POST /api/symptoms/analyze` calls the FastAPI model,
  returning recommended specialty, urgency level, and confidence; falls back to a
  keyword-based mock when the AI service is down
- **Safety layers** — rule-based urgency engine (`src/services/urgencyService.js`)
  overrides AI urgency; high/emergency results show an emergency warning instead
  of temporary guidance
- **Doctor discovery** — verified doctors only, `$geoNear` proximity search with
  manual city fallback, doctor profiles + availability slots + reviews
- **Booking** — slot-based appointments with single-booking guarantee, booking
  rules (`src/config/bookingRules.js`), reschedule/cancel, reminders
- **Notifications** — email-first notification module (console preview by
  default in dev), in-app notification inbox, reminder scheduler job
- **Services module** — service categories, sponsored services, distance-aware
  listing
- **Dashboards** — patient (appointments, saved doctors, searches, notifications),
  doctor (today/upcoming, availability CRUD, guidance status, profile), admin
  (stats, users, doctor verification, remedy approval, sponsored services, reviews)

## Prerequisites

| Tool | Minimum |
| --- | --- |
| Node.js | >= 24 |
| npm | >= 11 |
| Python | >= 3.10 |
| MongoDB | local instance or Atlas cluster (local default: `mongodb://localhost:27017/smart_healthcare`) |

## Setup

### 1. AI service (start first — the backend calls it)

```sh
cd ai-service
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000     # http://localhost:8000
```

Verify: `curl http://localhost:8000/health`

### 2. Backend (Express + MongoDB)

```sh
cd backend
npm install
cp .env.example .env
# start MongoDB first, then:
npm run dev            # http://localhost:5000
```

Verify: `curl http://localhost:5000/health`

The backend requires a valid `MONGO_URI` and `JWT_SECRET` — it fails fast at
startup (with a clear error) when MongoDB is unreachable.

### 3. Frontend (React)

```sh
cd frontend
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
```

## Docker deployment (all-in-one)

Run the whole stack (MongoDB + AI service + backend + frontend) with Docker
Compose — no local Node/Python/MongoDB needed:

```sh
# 1. Install Docker Desktop, then from the monorepo root:
cp .env.example .env      # adjust JWT_SECRET etc. if you like
docker compose --profile local-mongo up --build
```

> The bundled MongoDB container runs behind the `local-mongo` profile. To use a
> **free hosted MongoDB instead** (e.g. Atlas M0), put your connection string
> in `.env` (`MONGO_URI=mongodb+srv://...`) and run
> `docker compose up --build` — the mongo container is skipped automatically.

- Website: http://localhost:8080 (nginx serves the React app and proxies
  `/api` to the backend on the same origin)
- Backend API: http://localhost:5000/health
- AI service: http://localhost:8000/health
- MongoDB data persists in the `mongo_data` volume

Ports and settings are controlled by `.env` (see `.env.example`). Stop with
`docker compose down`; also remove the volume with `docker compose down -v`.

Notes:

- The frontend image builds with `VITE_API_URL=/api` (relative) and nginx
  proxies it — no CORS needed for the website.
- `ai-service` model artifacts (`models/*.joblib`) are gitignored — make sure
  they exist locally (they do after `python training/train.py`) before
  building the image.

## Deploy publicly (official website)

To make the site reachable from any device (phones, iOS, Android, any
browser), deploy it to a public server — the kit is ready and works **free**
on Oracle Cloud's Always Free ARM tier (real 24/7 server, $0/month):
`deploy/deploy.sh` (one command, installs Docker, retrains the model, starts
the stack), `docker-compose.https.yml` + Caddy for automatic HTTPS, and a full
step-by-step guide in `docs/deployment.md` (Oracle signup, instance setup,
ports, domain, go-live, security, backups).

## Environment variables

| Service | Variable | Default | Notes |
| --- | --- | --- | --- |
| backend | `PORT` | `5000` | |
| backend | `MONGO_URI` | `mongodb://localhost:27017/smart_healthcare` | required; set an Atlas connection string to skip the bundled mongo container |
| backend | `JWT_SECRET` | `change-me-in-production` | required, change in production |
| backend | `JWT_EXPIRES_IN` | `1h` | |
| backend | `CORS_ORIGIN` | `http://localhost:5173` | comma-separated list, or `*` in dev |
| backend | `AI_SERVICE_URL` | `http://localhost:8000` | fastapi endpoint for predictions |
| backend | `EMAIL_TRANSPORT` | `console` | `console` (dev preview) or `smtp` |
| backend | `SMTP_*` | — | only when `EMAIL_TRANSPORT=smtp` |
| backend | `RUN_REMINDER_SCHEDULER` | `true` | background reminder job |
| backend | `REMINDER_LEAD_HOURS` / `REMINDER_CHECK_INTERVAL_MINUTES` | `24` / `5` | reminder timing |
| ai-service | `PORT` | `8000` | |
| ai-service | `MODEL_PATH` | `models/` | joblib artifacts |
| ai-service | `DATA_PATH` | `data/` | |
| ai-service | `ALLOWED_ORIGINS` | — | |
| ai-service | `LOG_LEVEL` | — | |
| frontend | `VITE_API_URL` | `http://localhost:5000/api` | backend base URL |

Never commit `.env` files — only `.env.example` is tracked.

## End-to-end flow

Login → symptom analysis (Node calls FastAPI) → urgency safety check →
recommended specialty → find verified nearby doctors (geo search) → view
profile/slots → book appointment → stored + confirmation notification.

See `docs/integration-flow.md` for the Mermaid sequence diagram, exact API
calls, and failure modes.

## Module map

Backend (`backend/src/`):

- `routes/` — public API surface (auth, doctors, appointments, symptoms,
  remedies, reviews, notifications, sponsored services, urgency, admin/*)
- `controllers/` — request handling + validation glue
- `services/` — AI client (`aiService.js`), urgency rules, slots, booking,
  notifications, outbound email providers
- `models/` — Mongoose models (User, DoctorProfile, Appointment, etc.)
- `middleware/` — JWT auth, role guard, express-validator, central error handler
- `jobs/reminderScheduler.js` — background reminder job
- `scripts/lint.js` — syntax lint (`node --check`)

Frontend (`frontend/src/`):

- `pages/` — Home, Login, Register, SymptomForm, DoctorList, DoctorDetail,
  BookAppointment, ServicesPage, Patient/Doctor/Admin dashboards
- `components/` — `UrgencyWarning`, `VerifiedGuidance`, `Sidebar`,
  `AppointmentCard`, shared Loading/Error/Empty states, per-role sections
- `services/` — axios instance (`api.js`) + patient/doctor/admin service layers
- `hooks/` — `useAuth`, `useAppointments`
- `context/AuthContext.jsx` — auth state + JWT persistence

## Scripts

| Service | Command | Purpose |
| --- | --- | --- |
| frontend | `npm run dev` | dev server (:5173) |
| frontend | `npm run build` | production build (`vite build`) |
| frontend | `npm run lint` | ESLint |
| backend | `npm run dev` | dev server (:5000) |
| backend | `npm run lint` | syntax check (`node scripts/lint.js`) |
| ai-service | `uvicorn main:app --reload --port 8000` | API server (:8000) |

> No test runners are configured yet — see `docs/testing-plan.md` for the
> complete test-case matrix (auth, RBAC, analysis, AI, urgency, guidance,
> verification, search, booking, reviews, notifications, admin) and the
> recommended toolchain (Jest + Supertest + mongodb-memory-server for the
> backend, Vitest + React Testing Library + MSW for the frontend, pytest for
> ai-service, Newman + a full-stack flow script for integration).

## Docs index

- `docs/architecture.md` — service overview and data flow
- `docs/integration-flow.md` — end-to-end flow with Mermaid diagram
- `docs/api-auth.md` — auth endpoints and JWT
- `docs/api-modules.md` — module-by-module API reference
- `docs/database-design.md` — schemas and relations
- `docs/ai-model.md` — model, data, training artifacts
- `docs/urgency-rules.md` — rule-based safety engine
- `docs/notifications.md` — email transports, templates, reminders
- `docs/testing-plan.md` — test-case matrix and toolchain recommendations
- `docs/deployment.md` — public deployment guide (VPS, domain, HTTPS, backups)

## Git configuration

- Repo root: `git init` at the monorepo root
- `.gitignore` covers `.env`, `node_modules/`, `.venv/`, `dist/`, caches
- Never commit `.env` files — only `.env.example`
- Branches: `feature/<name>`, `fix/<name>`, `chore/<name>`
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`