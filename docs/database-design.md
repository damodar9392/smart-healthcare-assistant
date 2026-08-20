# MongoDB Database Design — Smart Healthcare Assistant

## Collections and relationships

```
User (roles: patient, doctor, admin)
 │
 ├── 1:1 ── DoctorProfile (doctor only)
 │            │
 │            ├── 1:N ── DoctorAvailability
 │            │
 │            ├── 1:N ── Appointment (as doctor)
 │            │
 │            └── 1:N ── Review (as doctor)
 │
 ├── 1:N ── Appointment (as patient)
 ├── 1:N ── Review (as patient)
 ├── 1:N ── Notification (recipient)
 └── 1:N ── TemporaryRemedy (submitting doctor)
              │
              ├── N:M ── Symptom (via symptoms refs)
              └── 1:1 ── approval.admin (User, admin)
```

### Relationship notes

- **User → DoctorProfile (1:1)**: a doctor's identity lives in `users`; their professional
  details in `doctor_profiles`. The `user` field is unique — one profile per doctor.
  `passwordHash` is stored on `User` because all roles authenticate the same way.
- **DoctorProfile → DoctorAvailability (1:N)**: many weekly slots per doctor.
- **Appointment**: stores `patient` and `doctor` as `User` refs, so both directions query
  cheaply (`{ doctor, date, status }` index) without joining profiles. Profile info is
  joined via `populate()` when rendering.
- **Symptom ↔ TemporaryRemedy (N:M)**: a remedy covers one or more symptoms; a symptom
  can appear in many remedies. `Symptom` is a curated catalog (name, category, severity
  level, recommended specialty) that both the AI triage and remedy lookup share.
- **TemporaryRemedy**: submitted by a doctor, approved by an admin (`approval.approvedBy`).
  It stores a *probable condition category* and *recommendation*, never a confirmed
  diagnosis — by design the model has no "diagnosis" field, and `disclaimer` is baked in.
- **Review**: one review per (patient, doctor) pair enforced by a unique compound index.
  `DoctorProfile.rating` is a denormalized aggregate maintained by the service layer
  (query-driven, not stored logic).
- **Notification**: fan-out per user with a `relatedId` pointing at the entity that
  triggered it (appointment, remedy, etc.).
- **SponsoredService**: standalone catalog (clinics, labs, pharmacies) with GeoJSON
  location for near-me search. No relations to users.
- **Rating on DoctorProfile** is derived from `reviews.rating`; keep in sync in the
  service layer.

## Sample documents

### users — patient

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Ayesha Khan",
  "email": "ayesha.khan@example.com",
  "passwordHash": "$2b$10$e0Myz68j7mQY9aFg1QYkze.XXXX (bcrypt, never plaintext)",
  "phone": "+92-300-1234567",
  "role": "patient",
  "createdAt": "2026-01-10T09:30:00.000Z",
  "updatedAt": "2026-01-10T09:30:00.000Z"
}
```

### users — doctor

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
  "name": "Dr. Imran Sheikh",
  "email": "imran.sheikh@example.com",
  "passwordHash": "$2b$10$e0Myz68j7mQY9aFg1QYkze.XXXX",
  "phone": "+92-321-9876543",
  "role": "doctor",
  "createdAt": "2026-01-12T14:00:00.000Z",
  "updatedAt": "2026-01-12T14:00:00.000Z"
}
```

### users — admin

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
  "name": "System Admin",
  "email": "admin@example.com",
  "passwordHash": "$2b$10$e0Myz68j7mQY9aFg1QYkze.XXXX",
  "phone": "+92-333-1112223",
  "role": "admin",
  "createdAt": "2026-01-01T08:00:00.000Z",
  "updatedAt": "2026-01-01T08:00:00.000Z"
}
```

### doctor_profiles

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
  "user": "64f1a2b3c4d5e6f7a8b9c0d2",
  "qualification": ["MBBS", "FCPS Cardiology"],
  "specialization": "Cardiology",
  "experience": 12,
  "hospital": {
    "name": "City Heart Clinic",
    "address": "12 Gulberg III, Lahore"
  },
  "consultationFee": 2500,
  "location": {
    "type": "Point",
    "coordinates": [74.3436, 31.5204]
  },
  "verificationStatus": "verified",
  "rating": 4.7,
  "createdAt": "2026-01-12T14:05:00.000Z",
  "updatedAt": "2026-02-01T10:00:00.000Z"
}
```

### symptoms

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
  "name": "chest pain",
  "description": "Discomfort or pain in the chest area",
  "category": "cardiovascular",
  "severityLevel": "severe",
  "recommendedSpecialty": "Cardiology",
  "relatedSymptoms": ["64f1a2b3c4d5e6f7a8b9c0d6"],
  "createdAt": "2026-01-05T11:00:00.000Z",
  "updatedAt": "2026-01-05T11:00:00.000Z"
}
```

### temporary_remedies (approved, general guidance only)

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d7",
  "symptoms": ["64f1a2b3c4d5e6f7a8b9c0d5"],
  "probableConditionCategory": "mild musculoskeletal strain (category only, not a diagnosis)",
  "recommendedSpecialty": "Orthopedics",
  "safeTemporaryGuidance": "Rest the affected area, apply ice for 15 minutes every few hours, and take paracetamol only if previously tolerated.",
  "precautions": ["Do not ignore pain lasting more than 3 days", "Avoid lifting heavy objects"],
  "avoid": ["Strenuous exercise", "Alcohol"],
  "emergencyWarningSigns": ["Sudden severe chest pain", "Pain spreading to jaw or left arm", "Shortness of breath"],
  "disclaimer": "This is general educational guidance only and does not constitute a medical diagnosis. Consult a qualified doctor for an actual diagnosis.",
  "doctor": "64f1a2b3c4d5e6f7a8b9c0d2",
  "approvalStatus": "approved",
  "approval": {
    "approvedBy": "64f1a2b3c4d5e6f7a8b9c0d3",
    "approvedAt": "2026-01-20T09:00:00.000Z",
    "notes": "Reviewed; aligns with cardiology triage protocol."
  },
  "createdAt": "2026-01-18T16:30:00.000Z",
  "updatedAt": "2026-01-20T09:00:00.000Z"
}
```

### appointments

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d8",
  "patient": "64f1a2b3c4d5e6f7a8b9c0d1",
  "doctor": "64f1a2b3c4d5e6f7a8b9c0d2",
  "date": "2026-02-15T00:00:00.000Z",
  "startTime": "10:00",
  "endTime": "10:30",
  "status": "confirmed",
  "reason": "Recurring chest discomfort during exercise",
  "createdAt": "2026-02-01T12:00:00.000Z",
  "updatedAt": "2026-02-01T12:30:00.000Z"
}
```

### doctor_availabilities

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d9",
  "doctor": "64f1a2b3c4d5e6f7a8b9c0d2",
  "dayOfWeek": 1,
  "startTime": "10:00",
  "endTime": "13:00",
  "isAvailable": true,
  "createdAt": "2026-01-13T09:00:00.000Z",
  "updatedAt": "2026-01-13T09:00:00.000Z"
}
```

### reviews

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0da",
  "patient": "64f1a2b3c4d5e6f7a8b9c0d1",
  "doctor": "64f1a2b3c4d5e6f7a8b9c0d2",
  "rating": 5,
  "comment": "Very thorough and explained everything clearly.",
  "createdAt": "2026-02-16T11:00:00.000Z",
  "updatedAt": "2026-02-16T11:00:00.000Z"
}
```

### notifications

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0db",
  "user": "64f1a2b3c4d5e6f7a8b9c0d1",
  "type": "appointment",
  "title": "Appointment confirmed",
  "message": "Your appointment with Dr. Imran Sheikh on 2026-02-15 at 10:00 is confirmed.",
  "read": false,
  "relatedId": "64f1a2b3c4d5e6f7a8b9c0d8",
  "createdAt": "2026-02-01T12:31:00.000Z",
  "updatedAt": "2026-02-01T12:31:00.000Z"
}
```

### sponsored_services

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0dc",
  "name": "MediPlus Diagnostic Lab",
  "description": "Full blood panel and cardiac screening packages.",
  "category": "diagnostics",
  "price": 1500,
  "location": {
    "type": "Point",
    "coordinates": [74.3354, 31.5201]
  },
  "contact": {
    "phone": "+92-42-35770000",
    "email": "info@mediplus.example.com",
    "website": "https://mediplus.example.com"
  },
  "sponsor": "MediPlus Group",
  "isActive": true,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

## Design guarantees

- No confirmed-diagnosis field exists anywhere; remedies expose only
  `probableConditionCategory` plus a built-in disclaimer.
- All schemas use `{ timestamps: true }` (`createdAt` / `updatedAt`).
- Indexes target the hot query paths: login (`email` unique), doctor search
  (`specialization + rating`, 2dsphere `location`), scheduling (`doctor + date + status`,
  unique availability slots), review dedup (`patient + doctor` unique), notifications
  (`user + read`), and remedy surfacing (`approvalStatus`).
