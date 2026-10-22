# NeoSec

**A full-stack authentication system with JWT login and an admin-approval workflow.**

Users register with an email and password, but cannot access the app until an admin approves the account. Built with a React frontend and an Express + PostgreSQL backend.

> Developed as part of CSE471 coursework.

---

## Features

- User registration with email and password
- **Admin approval workflow:** new accounts start unapproved and see a "pending approval" message on login
- JWT-based authentication
- Password hashing with bcryptjs (10 salt rounds)
- Input validation on all routes (express-validator)
- Protected dashboard showing user information and approval status
- Role support (`user` / `admin`)
- Responsive UI with clear error handling
- CORS restricted to configured origins

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Create React App), axios, plain CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL with Sequelize ORM |
| Auth | JSON Web Tokens, bcryptjs |
| Validation | express-validator |
| Dev tooling | nodemon |

## How Authentication Works

```mermaid
sequenceDiagram
    participant U as User
    participant C as React client
    participant S as Express server
    participant D as PostgreSQL

    U->>C: Register (email, password)
    C->>S: POST /api/auth/register
    S->>D: Save user (hashed password, isApproved = false)
    S-->>C: "Please wait for admin approval"

    U->>C: Login
    C->>S: POST /api/auth/login
    S->>D: Verify credentials
    S-->>C: JWT + user (approval status included)
    C->>C: Store token, redirect to dashboard

    C->>S: GET /api/auth/me (Authorization: Bearer token)
    S-->>C: Current user
```

1. **Registration:** email + password (minimum 6 characters, must match confirmation). The account is created unapproved and requires admin approval.
2. **Login:** the server returns a JWT, which the client stores in `localStorage`. Unapproved users see a pending message.
3. **Requests:** axios attaches the token automatically. A `401` response clears the stored token.
4. **Dashboard:** shows user information, approval status, and a logout button.

## Project Structure

```
neosec/
├── client/                      # React frontend
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   └── src/
│       ├── components/Auth/
│       │   ├── Login.js
│       │   └── Register.js
│       ├── services/api.js      # centralized API calls (axios)
│       ├── App.js
│       ├── index.js
│       └── index.css            # global styles
└── server/                      # Express backend
    ├── config/db.js             # Sequelize configuration
    ├── controllers/authController.js
    ├── middleware/auth.js       # JWT verification
    ├── models/User.js
    ├── routes/authRoutes.js
    ├── validations/authValidation.js
    └── app.js                   # entry point
```

## Getting Started

**Prerequisites:** Node.js (v14 or higher; an LTS version is recommended), npm or yarn, and a PostgreSQL database (local or cloud).

### 1. Backend

```bash
cd server
npm install
copy .env.example .env      # on macOS/Linux: cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://username:password@host:port/database
ALLOWED_ORIGINS=http://localhost:3000
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
```

Start the server:

```bash
npm run dev
```

In development, tables are created automatically on startup.

### 2. Frontend

```bash
cd client
npm install
npm start
```

The app opens at http://localhost:3000. By default it calls `http://localhost:5000/api`. To use a different API URL, create `client/.env` and restart the dev server:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## API Reference

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a new user |
| `POST` | `/auth/login` | Public | Log in and receive a JWT |
| `GET` | `/auth/me` | Bearer token | Get the current user |
| `GET` | `/health` | Public | Server health check |

**Register**
```json
// request
{ "email": "user@example.com", "password": "password123" }
// response
{ "success": true, "message": "Registration successful! Please wait for admin approval." }
```

**Login**
```json
// request
{ "email": "user@example.com", "password": "password123" }
// response
{ "success": true, "token": "jwt_token", "user": { } }
```

**Current user:** send `Authorization: Bearer <token>`.

## Data Model

**User**

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | String | Unique, required |
| `password` | String | Hashed, required |
| `isApproved` | Boolean | Default `false` |
| `role` | Enum | `user` or `admin`, default `user` |
| `createdAt` / `updatedAt` | Timestamp | Automatic |

## Security

- Passwords are hashed with bcryptjs and never stored in plain text
- JWT authentication middleware protects private routes
- Input validation on every route
- CORS limited to `ALLOWED_ORIGINS`
- Secrets live in `.env` files, which must never be committed (keep `.env` in `.gitignore`)

## Scripts

| Where | Command | Purpose |
|---|---|---|
| `server` | `npm run dev` | Start with auto-restart (nodemon) |
| `server` | `npm start` | Start for production |
| `client` | `npm start` | Start the dev server |
| `client` | `npm run build` | Create an optimized production build in `build/` |
| `client` | `npm test` | Run tests |

## Troubleshooting

- **CORS errors:** make sure the backend is running, `ALLOWED_ORIGINS` includes `http://localhost:3000`, and the client API URL matches the backend URL.
- **Login not working:** check the browser console and network tab, and confirm the backend is running and the API URL is correct.
- **Database connection issues:** verify `DATABASE_URL`, check the PostgreSQL service is running, and check SSL requirements for cloud databases.
- **Port 5000 already in use:** change `PORT` in `server/.env`, or stop the other process.
- **JWT errors:** confirm `JWT_SECRET` is set and check token expiry settings.
- **Frontend build errors:** delete `node_modules` and `package-lock.json`, run `npm install`, and if needed `npm cache clean --force`.

## Known Limitations and Future Work

- The JWT is stored in `localStorage`, which is exposed to XSS. Moving it to an `httpOnly` cookie would be safer.
- The schema is created with Sequelize `sync()`; production deployments should use migrations.
- Possible additions: an admin panel for approving users, password reset, rate limiting on login, and automated tests.

## Screenshots

_Add screenshots of the register, login, and dashboard pages here._

## License

Part of CSE471 coursework. _Add a license if you publish this publicly._
