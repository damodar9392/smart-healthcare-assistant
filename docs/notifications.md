# Notification Module (Appointment Events)

Email-first, provider-agnostic outbound notifications. Controllers never send
messages directly — they call service facades, which record delivery status in the
database and delegate to the configured provider.

## Architecture

```
backend/src/
  config/notificationConfig.js        provider + scheduler configuration (env-driven)
  models/OutboundNotification.js      delivery log: channel, status, attempts, error
  services/
    notificationService.js            in-app notifications (existing, kept for dashboard)
    appointmentNotificationService.js EVENT FACADE — used by controllers
    outbound/
      index.js                        dispatchOutbound(): record → provider → update status
      providers.js                    provider registry (email live; sms/push stubs)
      templates.js                    per-event email templates (subject + text + html)
  jobs/reminderScheduler.js           background poller for upcoming-appointment reminders
scripts/testNotifications.js          safe dev test harness (npm run test:notifications)
```

## Events

| Event | Type | Trigger |
| ----- | ---- | ------- |
| Confirmed | `appointment_confirmed` | booking created (`POST /api/appointments`) — emailed to patient + doctor |
| Cancelled | `appointment_cancelled` | `PUT /api/appointments/:id/cancel` — emailed to the non-acting party |
| Rescheduled | `appointment_rescheduled` | `PUT /api/appointments/:id/reschedule` — emailed to patient + doctor |
| Reminder | `appointment_reminder` | background scheduler, `REMINDER_LEAD_HOURS` (default 24h) before the slot, patient only |

Every event also writes an in-app `Notification` (dashboard bell) through the same
facade — one call site, two channels.

## Delivery status

`OutboundNotification.status` lifecycle: `queued` → `sent` (or `failed` + `error`).
`attempts` increments per attempt; failed records are kept for retry tooling.
`metadata.appointmentId` links the record to the appointment (used by the scheduler
to avoid duplicate reminders — a reminder is re-sent only if the previous one
failed).

## Configuration (`.env`)

```env
EMAIL_TRANSPORT=console            # console | smtp — console is the safe dev default
EMAIL_FROM=Smart Healthcare Assistant <no-reply@example.com>
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

RUN_REMINDER_SCHEDULER=true        # set false to disable the background job
REMINDER_LEAD_HOURS=24
REMINDER_CHECK_INTERVAL_MINUTES=5
```

## Testing safely in development

1. **Default is safe**: `EMAIL_TRANSPORT=console` prints the rendered email to the
   server console — nothing leaves the machine. Statuses are still recorded in
   `OutboundNotification`, so the full pipeline (record → provider → status) is
   exercised.
2. **Harness**: `npm run test:notifications` creates a fake appointment, fires all
   four events against a real patient + doctor row, and prints the stored delivery
   records. Requires `MONGO_URI` and at least one patient + one doctor user.
3. **Real inbox without real SMTP**: use a catch-all like Mailtrap — set
   `EMAIL_TRANSPORT=smtp` with Mailtrap's credentials (host `sandbox.smtp.mailtrap.io`).
4. **Reminders**: start the backend with `REMINDER_LEAD_HOURS` small (e.g. 0.05) and
   an appointment 2-3 minutes in the future; watch the console for
   `[reminder-scheduler] sent N appointment reminder(s)` and check the
   `appointment_reminder` records.
5. **Unit-check templates without a database**:
   `node -e "const {renderTemplate}=require('./src/services/outbound/templates'); console.log(renderTemplate('appointment_reminder',{recipient:'Sara',doctor:'Dr X',date:'2026-08-19',startTime:'10:00',endTime:'10:30',reason:'Fever'}).text)"`

## Adding a provider (SMS / push)

1. Create `services/outbound/smsProvider.js` implementing the same contract:
   `async send({ to, subject, body })` (SMS: use `body`; ignore `subject`).
2. Register it in `services/outbound/providers.js` registry.
3. Flip `sms.enabled = true` in `config/notificationConfig.js` (or an env var).
4. Callers already work: `dispatchOutbound({ userId, type, channel: 'sms', ... })`
   records the doc with `channel: 'sms'` and routes through the registry — no
   controller changes.