# Feature: Patient Enquiry Tickets

> **Status: IMPLEMENTED (2026-09-12).** All files in the plan below are live —
> model, controller, routes, notification type, email template, and the full
> frontend section (EnquiriesSection, service methods, sidebar item, badges).

Complete implementation plan — every file in one document.

Patients (logged in) raise support/medical enquiries tied to their account,
track ticket status, and receive a confirmation email on submit. Admins get an
in-app notification for each new ticket.

## API endpoints (backend, JWT required, role: patient)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/enquiries` | Create enquiry ticket `{ subject, category?, message }` |
| GET | `/api/enquiries` | List my tickets (newest first) |

Ticket statuses: `open` -> `in-progress` -> `resolved` / `closed`.
Categories: `appointment`, `medical`, `technical`, `feedback`, `other`.

On create: in-app notification to patient + admins (`type: 'enquiry'`) and
templated email `enquiry_received` via the outbound module (console preview in
dev; SMTP when `EMAIL_TRANSPORT=smtp`). Email failure never fails the request.

## File list

| # | File | Action |
| --- | --- | --- |
| 1 | `backend/src/models/Enquiry.js` | NEW |
| 2 | `backend/src/models/Notification.js` | EDIT (add `'enquiry'` type) |
| 3 | `backend/src/services/outbound/templates.js` | EDIT (add template) |
| 4 | `backend/src/controllers/enquiryController.js` | NEW |
| 5 | `backend/src/routes/enquiryRoutes.js` | NEW |
| 6 | `backend/src/app.js` | EDIT (register route) |
| 7 | `frontend/src/services/patientService.js` | EDIT (+2 methods) |
| 8 | `frontend/src/components/patient/EnquiriesSection.jsx` | NEW |
| 9 | `frontend/src/pages/PatientDashboard.jsx` | EDIT (render section) |
| 10 | `frontend/src/components/Sidebar.jsx` | EDIT (nav item) |
| 11 | `frontend/src/assets/main.css` | EDIT (status badges) |

---

## 1. backend/src/models/Enquiry.js (NEW)

```js
const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Enquiry owner is required'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: {
        values: ['appointment', 'medical', 'technical', 'feedback', 'other'],
        message: '{VALUE} is not a valid enquiry category',
      },
      default: 'other',
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'in-progress', 'resolved', 'closed'],
        message: '{VALUE} is not a valid enquiry status',
      },
      default: 'open',
    },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

enquirySchema.index({ user: 1, status: 1 });
enquirySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Enquiry', enquirySchema);
```

## 2. backend/src/models/Notification.js (EDIT)

Add `'enquiry'` to the type enum:

```js
values: ['appointment', 'remedy', 'review', 'system', 'admin', 'enquiry'],
```

## 3. backend/src/services/outbound/templates.js (EDIT)

Add to `TEMPLATES`:

```js
  enquiry_received: {
    subject: (a) => `We received your enquiry: ${a.subject}`,
    text: (a) => [
      `Dear ${a.recipient},`,
      ``,
      `Thank you for contacting Smart Healthcare Assistant.`,
      ``,
      `Reference: ${a.reference}`,
      `Category: ${a.category}`,
      `Subject: ${a.subject}`,
      ``,
      `Our support team will review your enquiry and update you soon.`,
      `You can track its status from your dashboard under Enquiries.`,
    ].join('\n'),
  },
```

## 4. backend/src/controllers/enquiryController.js (NEW)

```js
const { body } = require('express-validator');
const Enquiry = require('../models/Enquiry');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { notifyUser, notifyAdmins } = require('../services/notificationService');
const { sendTemplatedEmail } = require('../services/outbound');

const CATEGORIES = ['appointment', 'medical', 'technical', 'feedback', 'other'];

const createValidation = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),
  body('category')
    .optional()
    .isIn(CATEGORIES)
    .withMessage('Invalid enquiry category'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 2000 })
    .withMessage('Message cannot exceed 2000 characters'),
  validate,
];

const create = asyncHandler(async (req, res) => {
  const { subject, category, message } = req.body;
  const enquiry = await Enquiry.create({
    user: req.user._id,
    subject,
    category,
    message,
  });
  await notifyUser(
    req.user._id,
    'enquiry',
    'Enquiry received',
    `We received "${subject}". Our team will respond soon.`,
    enquiry._id
  );
  await notifyAdmins(
    'enquiry',
    'New patient enquiry',
    `${req.user.name}: ${subject}`,
    enquiry._id
  );
  try {
    await sendTemplatedEmail({
      userId: req.user._id,
      type: 'enquiry_received',
      summary: {
        recipient: req.user.name,
        reference: String(enquiry._id),
        category: enquiry.category,
        subject: enquiry.subject,
      },
      metadata: { enquiryId: String(enquiry._id) },
    });
  } catch (err) {
    console.error(`Enquiry confirmation email failed: ${err.message}`);
  }
  res.status(201).json({ success: true, data: enquiry });
});

const getMine = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.status && ['open', 'in-progress', 'resolved', 'closed'].includes(req.query.status)) {
    filter.status = req.query.status;
  }
  const data = await Enquiry.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data });
});

module.exports = { createValidation, create, getMine };
```

## 5. backend/src/routes/enquiryRoutes.js (NEW)

```js
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/enquiryController');

router.get('/', protect, authorize('patient'), c.getMine);
router.post('/', protect, authorize('patient'), c.createValidation, c.create);

module.exports = router;
```

## 6. backend/src/app.js (EDIT)

With the other requires:

```js
const enquiryRoutes = require('./routes/enquiryRoutes');
```

With the other mounts:

```js
app.use('/api/enquiries', enquiryRoutes);
```

## 7. frontend/src/services/patientService.js (EDIT)

Add inside the service object:

```js
  getEnquiries: () => api.get('/enquiries'),
  createEnquiry: (payload) => api.post('/enquiries', payload),
```

## 8. frontend/src/components/patient/EnquiriesSection.jsx (NEW)

```jsx
import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../EmptyState';
import Loading from '../Loading';
import ErrorMessage from '../ErrorMessage';
import { patientService } from '../../services/patientService';
import { formatDate } from '../../utils/format';

const CATEGORIES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'medical', label: 'Medical' },
  { value: 'technical', label: 'Technical' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Other' },
];

const EnquiriesSection = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('other');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await patientService.getEnquiries();
      setEnquiries(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load enquiries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setFormError('Subject and message are required.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setSuccess('');
    try {
      const { data } = await patientService.createEnquiry({
        subject: subject.trim(),
        category,
        message: message.trim(),
      });
      setEnquiries((prev) => [data.data, ...prev]);
      setSuccess(
        'Ticket created. A confirmation email has been sent to your inbox.'
      );
      setSubject('');
      setCategory('other');
      setMessage('');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="section-head">
        <h2>Enquiries</h2>
        <p className="section-intro">
          Raise a question or issue about appointments, medical guidance or the
          platform. Our team responds by email and in-app notification.
        </p>
      </div>

      <div className="card form-card">
        <h4>New enquiry</h4>
        {success && <div className="alert alert-success">{success}</div>}
        {formError && <div className="alert alert-error">{formError}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="enquiry-category">Category</label>
              <select
                id="enquiry-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="enquiry-subject">Subject</label>
              <input
                id="enquiry-subject"
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary (max 200 characters)"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="enquiry-message">Message</label>
            <textarea
              id="enquiry-message"
              rows={5}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your enquiry (max 2000 characters)"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Enquiry'}
          </button>
        </form>
      </div>

      <h3 className="section-gap">My tickets</h3>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : enquiries.length === 0 ? (
        <EmptyState
          title="No enquiries yet"
          hint="Tickets you submit will appear here with their status."
        />
      ) : (
        <div className="notification-list">
          {enquiries.map((enquiry) => (
            <div className="notification-item" key={enquiry._id}>
              <div className="notification-head">
                <span className={`badge badge-${enquiry.status}`}>
                  {enquiry.status}
                </span>
                <span className="badge badge-system">{enquiry.category}</span>
                <span className="muted">{formatDate(enquiry.createdAt)}</span>
              </div>
              <strong>{enquiry.subject}</strong>
              <p className="muted">{enquiry.message}</p>
              <span className="muted">Reference: {enquiry._id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnquiriesSection;
```

## 9. frontend/src/pages/PatientDashboard.jsx (EDIT)

Import:

```jsx
import EnquiriesSection from '../components/patient/EnquiriesSection';
```

Render with the other sections:

```jsx
{section === 'enquiries' && <EnquiriesSection />}
```

## 10. frontend/src/components/Sidebar.jsx (EDIT)

Patient section list gains:

```js
{ id: 'enquiries', label: 'Enquiries' },
```

## 11. frontend/src/assets/main.css (EDIT)

Append after `.badge-no-show`:

```css
.badge-open {
  background: #fef3c7;
  color: var(--warning);
}

.badge-in-progress {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-resolved {
  background: #dcfce7;
  color: var(--success);
}

.badge-closed {
  background: #f1f5f9;
  color: var(--muted);
}
```

---

## Verification

1. Backend: `cd backend && npm run lint`
2. Frontend: `cd frontend && npm run lint`
3. Manual flow: login as patient -> Dashboard -> Enquiries -> submit ->
   success alert, ticket listed as `open`, confirmation email previewed in
   backend console (`EMAIL_TRANSPORT=console`), admin sees in-app notification.
