# Bug Tracker

Track of fixed bugs and known open issues across the monorepo.

## Conventions

- Log bugs here as they are found or fixed. Keep entries concise and link to the
  relevant file/line so they are easy to verify.
- Fixed bugs go in the **Fixed bugs** table: mark the fix commit (if any) and
  the date. Do not delete fixed entries — keep history.
- Open issues go in the **Open issues** table: add a `Status` and link.
- Revisit the "Open issues" list after each task; anything you fix must move to
  the fixed table.

## Fixed bugs

| # | Date | Bug | Root cause | Fix | Fixed in |
|---|------|-----|------------|-----|----------|
| 1 | 2026-09-12 | MongoWarning: duplicate index on `{"name":1}` (Symptom) | `name` had `unique: true` plus an extra `index({ name: 1 })` | Removed `symptomSchema.index({ name: 1 })` | `backend/src/models/Symptom.js` |
| 2 | 2026-09-12 | MongoWarning: duplicate index on `{"sessionId":1}` (Conversation) | `sessionId` had `unique: true, sparse: true` plus an extra `index({ sessionId: 1 })` | Removed `conversationSchema.index({ sessionId: 1 })` | `backend/src/models/Conversation.js` |
| 3 | 2026-09-12 | ENCRYPTION_KEY not set, falling back to JWT_SECRET | Should use a dedicated key, not JWT_SECRET | Generated a dedicated 64-char `ENCRYPTION_KEY` in `backend/.env`; `env.js` now validates length (>= 32) in all environments and fails closed | `backend/.env`, `backend/src/config/env.js` |
| 4 | 2026-09-12 | `AI service unavailable (fetch failed), using mock analysis` log spam | ai-service unreachable but every request logged a warning | Added single retry in `aiService.analyzeSymptoms`, throttled fallback warnings to at most once per minute (`utils/logThrottle.js`), and surfaced ai-service status in backend `/health` | `backend/src/services/aiService.js`, `backend/src/controllers/assistantController.js`, `backend/src/utils/logThrottle.js`, `backend/src/app.js` |

## Open issues

| # | Component | Bug | Root cause / notes |
|---|-----------|-----|--------------------|
| — | — | — | — |