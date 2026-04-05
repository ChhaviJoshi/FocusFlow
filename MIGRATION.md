# FocusFlow — Migration Guide (Prototype → Production)

This document explains what changed from the AI Studio prototype to the production-ready full-stack application, and how to run the project locally.

## What Changed

### Architecture

| Aspect | Prototype | Production |
|---|---|---|
| **Backend** | None (pure SPA) | Node.js + Express (TypeScript) |
| **Auth** | Fake login form (cosmetic) | Google OAuth 2.0 via `google-auth-library` |
| **Sessions** | None | Redis-backed `express-session` with `httpOnly` cookies |
| **Database** | None | PostgreSQL (users, integrations, analyses, tasks) |
| **Caching** | None | Redis (AI response caching, 20min TTL) |
| **API Calls** | Direct from browser | Proxied through backend (no CORS, no key exposure) |
| **Gemini API Key** | Exposed in client JS bundle | Server-side `.env` only |
| **OAuth Tokens** | Plain text in React state | AES-256-GCM encrypted in PostgreSQL |
| **Slack/Jira** | Always failed (CORS) | Work correctly via server-side proxy |
| **AI Response** | `as AnalysisResult` (unsafe cast) | Zod runtime validation |
| **Error Handling** | None | React ErrorBoundary + Express error handler |
| **Rate Limiting** | None | Per-user rate limiting (10 analysis/min) |

### File Structure Change

Frontend source files moved from project root into `src/`:
```
Before:                    After:
├── App.tsx               ├── src/
├── index.tsx             │   ├── App.tsx
├── components/           │   ├── index.tsx
├── services/             │   ├── components/
├── types.ts              │   ├── services/api.ts  (NEW)
├── constants.ts          │   ├── types.ts
                          │   └── constants.ts
                          ├── server/              (NEW — entire backend)
```

### Files Removed from Frontend
- `services/geminiService.ts` → Moved to `server/src/services/gemini.service.ts`
- `services/integrationService.ts` → Split into `server/src/services/gmail.service.ts`, `calendar.service.ts`, `slack.service.ts`, `jira.service.ts`

### Files Added to Frontend
- `src/services/api.ts` — Centralized backend API client
- `src/components/ErrorBoundary.tsx` — React error boundary

### Files Modified on Frontend
- `App.tsx` — Auth state management, loading screen, ErrorBoundary wrapper
- `LoginScreen.tsx` — Replaced fake form with Google OAuth button
- `PermissionScreen.tsx` — Google auto-connected; Slack/Jira save to backend
- `Dashboard.tsx` — Calls backend APIs instead of direct external calls
- `vite.config.ts` — Added dev proxy for `/api` and `/auth`
- `package.json` — Removed `@google/genai`, added `concurrently`
- `tsconfig.json` — Updated paths for `src/` structure
- `index.html` — Updated script src to `src/index.tsx`

---

## How to Run Locally

### Prerequisites

- **Node.js** ≥ 18
- **Docker** + Docker Compose (for PostgreSQL and Redis)
- **Google Cloud Console** project with:
  - OAuth 2.0 Client ID (Web application type)
  - Gmail API enabled
  - Google Calendar API enabled
  - Authorized redirect URI: `http://localhost:3001/auth/google/callback`
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

### Step 1: Clone and Install

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..
```

Or use the shortcut:
```bash
npm run setup
```

### Step 2: Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and fill in your values:
# - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from Google Cloud Console
# - GEMINI_API_KEY from AI Studio
# - Generate SESSION_SECRET and ENCRYPTION_KEY using:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port 5432 (auto-runs schema.sql on first start)
- **Redis** on port 6379

### Step 4: Run Database Migration (if not using Docker first-start)

```bash
npm run db:migrate
```

### Step 5: Start Development Servers

```bash
# Start both frontend (port 3000) and backend (port 3001)
npm run dev:all
```

Or run them separately:
```bash
# Terminal 1 — Backend
npm run dev:server

# Terminal 2 — Frontend
npm run dev
```

### Step 6: Open the App

Navigate to `http://localhost:3000` and click "Sign in with Google".

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Google OAuth redirect fails | Ensure `http://localhost:3001/auth/google/callback` is in your Google Cloud Console authorized redirect URIs |
| "Missing required environment variable" | Check your `.env` file has all variables from `.env.example` |
| PostgreSQL connection refused | Run `docker-compose up -d` and wait for health check |
| Session not persisting | Check Redis is running: `docker-compose ps` |
| Slack/Jira still failing | Ensure you've entered valid tokens on the Permissions screen — they're now saved to the database |
