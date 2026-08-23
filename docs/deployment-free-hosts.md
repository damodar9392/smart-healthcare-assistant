# Free Cloud Deployment Guide

Deploy the full stack with $0/month using free tiers:

| Piece | Host | Free tier notes |
| --- | --- | --- |
| Frontend (React) | Netlify | 100GB bandwidth/mo, instant deploys |
| Backend (Express) | Render | free web service; sleeps after 15 min idle |
| AI service (FastAPI) | Render | free web service; retrains model at build |
| Database (MongoDB) | Atlas M0 | 512MB — plenty for dev |

> Free services sleep when idle: first request after inactivity takes ~30-60s.
> Upgrade any piece later without config changes.

## Order of operations (matters)

Atlas -> GitHub -> Render (AI first, then backend) -> Netlify -> wire URLs.

## 1. MongoDB Atlas (~10 min)

1. Sign up at https://www.mongodb.com/cloud/atlas (free M0).
2. Build a cluster (choose the free M0, nearest region).
3. Database Access -> Add user (username + strong password).
4. Network Access -> Add IP -> `0.0.0.0/0` (Render uses dynamic IPs).
5. Clusters -> Connect -> Drivers -> copy the URI:
   `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/smart_healthcare`
   (add `/smart_healthcare` before the `?` if not present).

## 2. Push to GitHub (~5 min)

1. Create an empty repo on https://github.com/new (name it
   `smart-healthcare-assistant`, private is fine).
2. From the monorepo root:

```sh
git add .
git commit -m "feat: deployment kit"
git remote add origin https://github.com/<you>/smart-healthcare-assistant.git
git push -u origin main
```

## 3. Render — AI service + backend (~15 min)

1. Sign up at https://render.com with GitHub, authorize repo access.
2. Dashboard -> New + -> **Blueprint** -> pick the repo -> Render reads
   `render.yaml` and creates both services:
   - `smartcare-ai-service`: installs deps and runs `python training/train.py`
     at build (model artifacts are rebuilt in the cloud).
   - `smartcare-backend`: Node 24, `npm ci && npm start`.
3. When prompted for the `sync: false` variables fill:
   - ai-service: none needed.
   - backend:
     - `MONGO_URI` = your Atlas URI from step 1
     - `AI_SERVICE_URL` = paste after ai-service deploys (see below)
     - `CORS_ORIGIN` = set after Netlify gives you a URL (step 4)
     - JWT_SECRET is auto-generated.
4. Deploy order: let `smartcare-ai-service` finish first, open its service
   page and copy the URL (`https://smartcare-ai-service.onrender.com`),
   then set backend env var `AI_SERVICE_URL` to it (Environment tab) ->
   Save (auto-redeploys).
5. Verify: `https://smartcare-backend.onrender.com/health` ->
   `{"status":"ok"}`.

## 4. Netlify — frontend (~5 min)

1. Sign up at https://netlify.com with GitHub.
2. Add new site -> Import an existing project -> pick the repo.
3. Netlify reads `netlify.toml` (build: `npm run build`, publish
   `frontend/dist`). Before deploying, add environment variable:
   - Key `VITE_API_URL`
   - Value `https://smartcare-backend.onrender.com/api`
4. Deploy. You get e.g. `https://smartcare.netlify.app`.
5. Back in Render -> smartcare-backend -> Environment -> set
   `CORS_ORIGIN=https://<your-site>.netlify.app` -> Save.

## 5. Final checks

- Site loads: `https://<your-site>.netlify.app`
- Register a patient, run a symptom analysis (hits Render AI), find doctors,
  book.
- Backend cold start? First click takes ~60s, then normal.

## Costs & limits

Everything above is $0. Watch-outs:

- Render free: 750 instance-hours/mo per service (enough for one of each),
  sleep-after-idle, no custom domain on free plan (use the onrender.com URL).
- Atlas M0: 512MB storage, 100 connections — fine for development.
- Netlify free: 100GB bandwidth, 300 build minutes.
