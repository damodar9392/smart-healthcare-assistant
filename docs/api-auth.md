# Auth Module — API Reference and Testing Guide

## Endpoints

| Method | Endpoint            | Access | Description                    |
| ------ | ------------------- | ------ | ------------------------------ |
| POST   | `/api/auth/register`| Public | Create patient or doctor account |
| POST   | `/api/auth/login`   | Public | Verify credentials, get JWT    |
| GET    | `/api/auth/me`      | Any authenticated user | Return current user (no password) |

## Request / response

### POST /api/auth/register

```json
{
  "name": "Ayesha Khan",
  "email": "ayesha.khan@example.com",
  "password": "strongPass123",
  "phone": "+92-300-1234567",
  "role": "patient"
}
```

- `role` is optional (defaults to `patient`); only `patient` or `doctor` allowed.
- `admin` is rejected with 403: `Admin accounts cannot be created publicly`.
- Password: 8-100 characters, must contain at least one letter and one number.
- Success `201` — returns the user only; call `/login` afterwards to get a token:

```json
{
  "success": true,
  "user": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Ayesha Khan",
    "email": "ayesha.khan@example.com",
    "phone": "+92-300-1234567",
    "role": "patient",
    "createdAt": "2026-01-10T09:30:00.000Z",
    "updatedAt": "2026-01-10T09:30:00.000Z"
  }
}
```

### POST /api/auth/login

```json
{ "email": "ayesha.khan@example.com", "password": "strongPass123" }
```

- Wrong email or password → `401` `{ "success": false, "message": "Invalid email or password" }`.
- Success `200`: `{ "success": true, "token": "...", "user": { ... } }` (no `passwordHash`).

### GET /api/auth/me

Header: `Authorization: Bearer <token>`

- No token / invalid / expired → `401`.
- Success `200`: `{ "success": true, "user": { ... } }` (no `passwordHash`).

## Validation errors

Bad input returns `400`:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Valid email required" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

## curl examples

```sh
# Register a patient
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ayesha Khan","email":"ayesha.khan@example.com","password":"strongPass123","phone":"+92-300-1234567","role":"patient"}'

# Register a doctor
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr. Imran Sheikh","email":"imran.sheikh@example.com","password":"strongPass123","phone":"+92-321-9876543","role":"doctor"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ayesha.khan@example.com","password":"strongPass123"}'

# Get current user (replace TOKEN)
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer TOKEN"
```

## Postman guide

1. **Import / create requests**: `POST http://localhost:5000/api/auth/register` (Body → raw → JSON).
2. **Login** request: `POST http://localhost:5000/api/auth/login`.
3. **Store the token automatically**: in the Login request, Tests tab:
   ```js
   const json = pm.response.json();
   pm.collectionVariables.set('token', json.token);
   ```
4. **GET /api/auth/me**: set header `Authorization: Bearer {{token}}` (collection variable).
5. **Negative tests to try**:
- Register with invalid email / short password / password without a number → expect 400 with `errors` array.
- Register with `"role": "admin"` → expect 403.
- Register with an existing email → expect 409.
- Login with wrong password → expect 401.
- Call `/api/auth/me` without token → expect 401.

## Environment variables (backend/.env)

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/smart_healthcare
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=1h
CORS_ORIGIN=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
```

- `JWT_SECRET` must be a long random string (e.g. `openssl rand -hex 32`). Never commit it.
- `JWT_EXPIRES_IN` uses `jsonwebtoken` format (`7d`, `1h`).
