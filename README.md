# DevPulse – Internal Tech Issue & Feature Tracker

A collaborative backend platform for software teams to report bugs, suggest features, and coordinate resolutions. Users register as a **contributor** or **maintainer**, authenticate via JWT, and manage issues through a REST API.

## Live URL

- **API base:** https://level2-assignment2-eta.vercel.app
- **Health check:** `GET /` returns `server is running!`

## Features

- JWT-based authentication (signup & login) with bcrypt password hashing (12 salt rounds).
- Role-based authorization with two roles: `contributor` and `maintainer`.
- Full CRUD for issues: create, list (with filtering & sorting), read, update, and delete.
- Contributors can create issues and update their own issues while still `open`; maintainers can update or delete any issue.
- Centralized error handling with consistent HTTP status codes and a uniform response shape.
- Passwords are never returned in any response.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Node.js | Runtime |
| TypeScript | Language (strict mode) |
| Express.js | HTTP framework & modular routing |
| PostgreSQL | Relational database |
| @neondatabase/serverless | Postgres client (raw parameterized SQL via tagged templates) |
| bcrypt | Password hashing |
| jsonwebtoken | JWT generation & verification |
| tsup | Build/bundler |

## Project Structure

```
src/
├── app.ts                  # Express app, middleware, routes, central error handler
├── server.ts               # Entry point (DB init + listen)
├── config/
│   └── envConfig.ts        # Environment variable loading
├── db/
│   ├── index.ts            # DB connection + initDB
│   └── schema.ts           # Table creation (users, issues)
├── modules/
│   ├── auth/               # signup & login (route, controller, service)
│   └── issues/             # issue CRUD (route, controller, service, interfaces)
├── types/
│   └── types.ts            # Shared interfaces & types
└── utils/
    ├── AppError.ts         # Custom error class carrying a status code
    ├── jwt.ts              # signTokes / decodeToken
    └── sendResponse.ts     # Uniform JSON response helper
```

## Setup

1. **Clone & install**

   ```bash
   git clone https://github.com/sojibislam9878/l2-a2.git
   cd l2-a2
   npm install
   ```

2. **Create a `.env` file** in the project root:

   ```env
   PORT=5000
   DB_URL=your_postgres_connection_string
   ACCESS_TOKEN=your_jwt_secret
   ```

3. **Run in development**

   ```bash
   npm run dev
   ```

4. **Build & run in production**

   ```bash
   npm run build
   npm start
   ```

The server creates the `users` and `issues` tables automatically on startup if they do not already exist.

## Authentication

After logging in, attach the returned token to protected requests using the `Authorization` header (raw token, no `Bearer` prefix):

```
Authorization: <JWT_TOKEN>
```

## API Endpoints

### Auth

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | Public | Register a new user (`contributor` or `maintainer`) |
| POST | `/api/auth/login` | Public | Authenticate and receive a JWT |

### Issues

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/issues` | Authenticated | Create a bug or feature request |
| GET | `/api/issues` | Public | List all issues (supports `sort`, `type`, `status` query params) |
| GET | `/api/issues/:id` | Public | Get a single issue with reporter details |
| PATCH | `/api/issues/:id` | Maintainer (any) / Contributor (own, while `open`) | Update title, description, or type |
| DELETE | `/api/issues/:id` | Maintainer only | Delete an issue |

**Query parameters for `GET /api/issues`:**

| Param | Values | Default |
| --- | --- | --- |
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | (none) |
| `status` | `open`, `in_progress`, `resolved` | (none) |

## Response Format

**Success**

```json
{
  "success": true,
  "message": "Operation description",
  "data": {}
}
```

**Error**

```json
{
  "success": false,
  "message": "Error description"
}
```

## HTTP Status Codes

| Code | Usage |
| --- | --- |
| 200 | Successful GET, PATCH, DELETE |
| 201 | Resource created (POST) |
| 400 | Validation error, invalid input, duplicate resource |
| 401 | Missing or invalid JWT |
| 403 | Valid token but insufficient role |
| 404 | Resource not found |
| 409 | Business-logic conflict (e.g. editing a non-open issue) |
| 500 | Unexpected server or database error |

## Database Schema

### `users`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | SERIAL PRIMARY KEY | Auto-increment |
| `name` | VARCHAR(150) NOT NULL | Display name |
| `email` | VARCHAR(200) UNIQUE NOT NULL | Login email |
| `password` | TEXT NOT NULL | bcrypt hash, never returned |
| `role` | VARCHAR(20) NOT NULL DEFAULT `'contributor'` | `contributor` or `maintainer` |
| `created_at` | TIMESTAMP DEFAULT NOW() | |
| `updated_at` | TIMESTAMP DEFAULT NOW() | |

### `issues`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | SERIAL PRIMARY KEY | Auto-increment |
| `title` | VARCHAR(150) NOT NULL | Max 150 chars |
| `description` | TEXT NOT NULL | Minimum 20 characters |
| `type` | VARCHAR(20) NOT NULL | `bug` or `feature_request` |
| `status` | VARCHAR(20) NOT NULL DEFAULT `'open'` | `open`, `in_progress`, `resolved` |
| `reporter_id` | INTEGER NOT NULL | References a user (validated in application logic) |
| `created_at` | TIMESTAMP DEFAULT NOW() | |
| `updated_at` | TIMESTAMP DEFAULT NOW() | |

## Deployment

Deployed on **Vercel** with **NeonDB** as the PostgreSQL provider. The build output (`dist/server.js`) is served via the configuration in `vercel.json`.
