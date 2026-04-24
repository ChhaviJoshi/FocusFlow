# FocusFlow

Full-stack AI prioritization app that aggregates Gmail, Google Calendar, Slack, and Jira signals, then ranks what to do next using Gemini.

## Current Status

FocusFlow is running as a React + Express + PostgreSQL + Redis system with:

- Session-based auth (Google identity login)
- Google identity and data scopes captured in one OAuth login flow
- OAuth integration flows for Slack and Jira
- Encrypted token storage (AES-256-GCM)
- Inbox aggregation across providers
- AI prioritization with schema-validated output
- Task persistence, completion tracking, and analysis history

## Architecture

```text
Frontend (Vite + React, port 3000)
   -> proxies /api, /auth, /health to backend in dev

Backend (Express + TypeScript, port 3001)
   -> PostgreSQL (users, integrations, analyses, tasks)
   -> Redis (sessions + AI cache)
   -> External APIs (Google, Slack, Atlassian, Gemini)
```

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite 6
- Recharts
- Lucide React
- Tailwind utility classes (loaded via CDN in `index.html`)

### Backend

- Node.js + Express 4
- TypeScript
- PostgreSQL (`pg`)
- Redis (`redis`, `connect-redis`)
- `express-session`
- `google-auth-library`
- `@google/genai`
- `zod`
- `helmet`
- `express-rate-limit`

## Local Setup

### 1) Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local)
- Redis 7+ (local)
- Google OAuth app
- Gemini API key
- Slack OAuth app credentials
- Atlassian OAuth app credentials

### 2) Install dependencies

From repository root:

```bash
npm run setup
```

### 3) Configure environment

macOS/Linux:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Generate secure values:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use this output for both:

- `SESSION_SECRET`
- `ENCRYPTION_KEY` (must be exactly 64 hex chars)

### 3b) Set up ngrok for OAuth testing (Slack and Jira)

Slack and Jira OAuth require an HTTPS callback URL. For local development, use ngrok:

1. Install ngrok from ngrok.com and authenticate with your token
2. Run: ngrok http 3001
3. Copy the generated https:// URL
4. Set in .env: SLACK_REDIRECT_URI and JIRA_REDIRECT_URI to:
   https://<your-ngrok-url>/api/integrations/slack/oauth/callback
   https://<your-ngrok-url>/api/integrations/jira/oauth/callback
5. Update these same URLs in your Slack app dashboard and Atlassian developer console
6. Note: ngrok URL changes each restart on the free plan - update all three places when it does

### 4) Start PostgreSQL and Redis locally

Ensure local services are running on the default ports expected by `.env`:

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

If you use custom ports or credentials, update `DATABASE_URL` and `REDIS_URL` in `.env`.

### 5) Apply schema migration

```bash
npm run db:migrate
```

### 6) Start development servers

Single command:

```bash
npm run dev:all
```

Or separate terminals:

```bash
npm run dev
```

```bash
npm run dev:server
```

### 7) Open app

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:3001/health`

## Auth and Integration Flow

Google OAuth now performs both user sign-in and Google data-scope consent in one flow:

- `GET /auth/google`
- `GET /auth/google/callback`

Slack and Jira continue to use dedicated OAuth flows from Integrations settings.

## Required Environment Variables

See `.env.example` for full values.

Core variables:

- `PORT`, `NODE_ENV`, `FRONTEND_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI`
- `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, `JIRA_REDIRECT_URI`
- `GEMINI_API_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`

## API Surface

### Auth

- `GET /auth/google`
- `GET /auth/google/callback`
- `GET /auth/slack` (proxy to Slack OAuth start)
- `GET /auth/jira` (proxy to Jira OAuth start)
- `GET /auth/me` (auth required)
- `POST /auth/logout` (auth required)

### Inbox, Analysis, Tasks

- `GET /api/inbox` (auth required)
- `POST /api/analyze` (auth required, analysis limiter)
- `GET /api/analyze` (auth required)
- `GET /api/tasks` (auth required, supports `status` and `limit`)
- `PATCH /api/tasks/:id` (auth required)
- `PATCH /api/tasks/by-item/:originalItemId` (auth required)

### Integrations

- `GET /api/integrations` (auth required)
- `DELETE /api/integrations/:provider` (auth required)
- `GET /api/integrations/slack/oauth/start` (auth required)
- `GET /api/integrations/slack/oauth/callback`
- `GET /api/integrations/jira/oauth/start` (auth required)
- `GET /api/integrations/jira/oauth/callback`

## Scripts

### Root scripts

- `npm run setup` install root + server dependencies
- `npm run dev` run frontend
- `npm run dev:server` run backend
- `npm run dev:all` run both
- `npm run build` build frontend
- `npm run preview` preview frontend build
- `npm run db:migrate` run backend migration script

### Server scripts

- `npm run dev` watch server via `tsx`
- `npm run build` compile TypeScript to `server/dist`
- `npm run start` run compiled server
- `npm run migrate` apply schema SQL

## Security and Reliability Notes

- OAuth tokens are encrypted before DB storage.
- Session state is stored in Redis and cookie is `httpOnly`.
- CORS is restricted to configured frontend URL.
- AI prompt input is sanitized before Gemini call.
- Gemini response is validated against Zod schema.
- Rate limiting is enforced:
  - General API limiter: 100 requests/minute
  - Analysis limiter: 10 requests/minute (session user keyed when available)
- Cache failures do not fail requests (safe fallback to fresh analysis).

## Project Structure

```text
src/                          frontend app
server/src/                   backend app
   config/                     env, db, redis, session
   controllers/                route handlers
   db/                         schema + migration + query layer
   middleware/                 auth, rate limiting, error handling
   routes/                     api route definitions
   services/                   provider, auth, cache, crypto, ai services
   validators/                 sanitization + zod schemas
   types/                      backend type definitions
MIGRATION.md                  migration/change log
docs/SYSTEM_DESIGN.md         architecture notes
```

## Troubleshooting

- OAuth redirect mismatch:
  ensure callback URLs exactly match provider settings.
- `Missing required environment variable` on startup:
  compare `.env` with `.env.example`.
- 401 on authenticated API routes:
  verify Redis is running and browser is sending session cookie.
- PostgreSQL connection errors:
  verify local PostgreSQL is running and `DATABASE_URL` points to the right host/db/user/password.
- Redis connection errors:
  verify local Redis is running and `REDIS_URL` is reachable.
- Empty Gmail/Calendar inbox after login:
  re-run Google sign-in to refresh consent and token scopes.
- Jira returns no issues:
  verify cloud resource access and granted scopes.
- Slack/Jira OAuth redirect mismatch:
  ensure your ngrok URL is current and matches exactly in both `.env` and the provider dashboard.

## References

- `MIGRATION.md`
- `docs/SYSTEM_DESIGN.md`
