# Ukulima Sahi – Farmer Certification

## Description

Ukulima Sahi is a backend service for managing farmer certification. Farmers can register and track their certification status, while administrators can review applications, approve, reject, or revoke certifications. The system implements role-based authentication and uses a PostgreSQL database.

---

## Live Backend Endpoint

https://farmers-backend-k3gr.onrender.com

---

## Technology Stack

- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- bcrypt
- Render

---

## Roles

- **farmer**: register, login, view own certification status
- **admin**: review farmers, approve, reject, revoke certifications

---

## Authentication

The system uses JWT-based authentication with role-based authorization.

JWT tokens contain:

- user id
- role

---

## Admin Registration

There is **no public admin registration endpoint**.

Administrators are created manually in the database for security reasons.

**Steps:**

1. Generate a bcrypt password hash
2. Insert the admin record into the `users` table with role set to `admin`

---

## API Endpoints

### Authentication

- `POST /auth/login`

### Farmers

- `POST /farmers`
- `GET /farmers`
- `GET /farmers/:id`
- `GET /farmers/me`
- `PATCH /farmers/:id/status`
- `PATCH /farmers/:id/revoke`

---

## Default Farmer Registration Behaviour

- role: `farmer`
- status: `pending`
- requires admin approval before certification

---

## Authorization Rules

- Admin routes require `role = admin`
- Farmer routes require `role = farmer`

Unauthorised requests return an **access denied** response.

---

## Running Locally

### 1. Clone Repository

```bash
git clone https://github.com/cheboi/farmers-backend.git
cd FARMERS-BACKEND
npm install
npm install
```
