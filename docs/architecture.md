# Architecture

## Overview

Three independent services communicating over HTTP. The backend is the only service
that talks to the database and exposes the public API to the frontend. The AI service
is a private model-serving layer that the backend calls for predictions.

```
React SPA (frontend)
   │  HTTPS / REST  http://localhost:5000/api
   ▼
Express API (backend) ──► MongoDB
   │  HTTP  http://localhost:8000
   ▼
FastAPI (ai-service) ──► scikit-learn models
```

## Services

### frontend/ (React.js + Vite)

- `src/components/` — reusable UI components
- `src/pages/` — route-level pages
- `src/services/` — API client modules (axios)
- `src/hooks/` — custom React hooks
- `src/context/` — React context providers (auth, settings)
- `src/utils/` — helpers and formatters
- `src/assets/` — static assets (images, styles)
- `public/` — static files copied as-is at build time

### backend/ (Node.js + Express.js)

- `src/config/` — env-driven configuration (db, auth, cors)
- `src/controllers/` — request handlers
- `src/models/` — Mongoose schemas
- `src/routes/` — API route definitions
- `src/middleware/` — auth, error handling, validation
- `src/services/` — business logic, AI-service client
- `src/utils/` — helpers
- `src/app.js` — Express app entry point

### ai-service/ (Python + FastAPI + Scikit-learn)

- `app/` — FastAPI application modules and endpoints
- `models/` — trained model artifacts
- `training/` — model training scripts
- `data/` — datasets
- `main.py` — uvicorn entry point

## Communication contracts

- Frontend → Backend: REST JSON under `/api` (no direct frontend access to AI service).
- Backend → AI Service: REST JSON, prediction requests forwarded from backend controllers.
  Every request carries the shared `X-Internal-Token` secret (`AI_INTERNAL_TOKEN`);
  the AI service rejects anything without it with a 401. The AI service has no
  authentication of its own and must never be exposed publicly.
- AI Service → Backend: predictions, confidence scores, and errors.

## Environment variables

Each service reads its own `.env` file (see each service's `.env.example`).
Secrets (JWT secret, DB credentials) live only in local `.env` files, never in git.
