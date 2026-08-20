# Urgency Rule System (Safety Module)

Status: **pending medical review** — every rule below must be reviewed and signed off
by a qualified medical professional before this system is used in clinical context.

## Design principles

1. **Conservative bias.** Rules deliberately over-trigger. False positives redirect
   users toward care; false negatives endanger them. When in doubt, escalate.
2. **The safety module is authoritative.** The AI model (`ai-service`) may suggest a
   specialty and confidence, but `urgencyLevel` is always computed by this module —
   the AI never overrides it. See `backend/src/services/urgencyService.js`.
3. **Self-care is suppressible.** `showTemporaryGuidance` is `false` for `high` and
   `emergency`, so the frontend hides temporary remedies for those cases.
4. **Rule set is data, not code.** Rules live in
   `backend/src/config/urgencyRules.json` and are editable without touching code.

## Sources of truth

- Rules: `backend/src/config/urgencyRules.json` (JSON schema v1.0.0).
- Evaluation: `backend/src/services/urgencyService.js`.
- Endpoint (standalone): `POST /api/urgency/evaluate`.
- Wired into analysis: `backend/src/controllers/analysisController.js`.

## Evaluation order

For each analyze request the module evaluates, in order, the combined text of main
symptoms + additional symptoms + free-text description:

1. **Emergency rules** — any phrase match → `emergency`.
2. **High rules** — any phrase match → `high`.
3. **Thresholds** — `severity: severe` or `durationInDays > 14` → `high`;
   `severity: moderate` or `durationInDays > 7` → `medium`.
4. **Fallback** → `low`.

Matching is a normalized substring match (lowercase, whitespace-collapsed).

## Levels and guidance

| Level | Message | Show temporary guidance |
| ----- | ------- | ----------------------- |
| low | Manageable at home; monitor and consult if worsening | yes |
| medium | Consider booking an appointment soon | yes |
| high | May require prompt medical attention | no |
| emergency | Seek immediate professional medical attention | no |

## Current rule inventory (all `pending-review`)

Emergency (14): chest pain, shortness of breath, breathing difficulty, unconscious,
fainting, seizure, paralysis, severe bleeding, high fever, blood in stool, vomiting
blood, stroke, difficulty speaking, suicidal thoughts.

High (4): severe abdominal pain, swelling in legs, blurred vision, persistent vomiting.

## Review workflow

1. Medical professional reviews `urgencyRules.json` rule by rule.
2. For each rule set `reviewStatus` to `reviewed` and add reviewer + date.
3. Update the top-level `reviewedBy` / `reviewedAt` fields.
4. Bump `schemaVersion` on structural changes.

## Frontend behavior

- `frontend/src/components/UrgencyWarning.jsx` renders the warning panel only for
  `high` / `emergency`.
- Emergency services directory (`category: emergency` in sponsored services) is
  offered in the panel via `GET /api/sponsored-services?category=emergency`.
- Badge labels live in `frontend/src/pages/SymptomForm.jsx` and
  `frontend/src/pages/PatientDashboard.jsx`.