# FocusFlow — System Design

## Architecture Overview

FocusFlow is a full-stack productivity app that ingests a user's inbox (email, Slack, Jira, calendar), runs AI-powered prioritisation via Google Gemini, and surfaces an actionable task list.

```
┌──────────────┐      ┌───────────────────────────────────────────────────────┐
│  React SPA   │◄────►│  Express API Server (Node 20)                        │
│  (Vite)      │      │                                                       │
│  port 3000   │      │  ┌─────────┐  ┌──────────┐  ┌────────────────────┐   │
│              │      │  │ Routes  │─►│Controllers│─►│ Services           │   │
│              │      │  │         │  │           │  │  • auth.service    │   │
│              │      │  │         │  │           │  │  • gemini.service  │   │
│              │      │  │         │  │           │  │  • cache.service   │   │
│              │      │  │         │  │           │  │  • crypto.service  │   │
│              │      │  └─────────┘  └──────────┘  └────────────────────┘   │
│              │      │                    │                                   │
│              │      │          ┌─────────┴──────────┐                       │
│              │      │          ▼                    ▼                        │
│              │      │   ┌───────────┐       ┌───────────┐                   │
│              │      │   │PostgreSQL │       │   Redis    │                   │
│              │      │   │  (users,  │       │ (sessions, │                   │
│              │      │   │  tasks,   │       │  AI cache) │                   │
│              │      │   │  integs)  │       │            │                   │
│              │      │   └───────────┘       └───────────┘                   │
│              │      │         port 3001                                      │
└──────────────┘      └───────────────────────────────────────────────────────┘
                              │              │
                              ▼              ▼
                     ┌──────────────┐ ┌──────────────┐
                     │ Google APIs  │ │  Gemini AI   │
                     │ (OAuth,Gmail)│ │ (2.5 Flash)  │
                     └──────────────┘ └──────────────┘
```

**Key layers:**

| Layer | Responsibility |
|---|---|
| **React SPA** | UI shell, dashboard, login. Communicates with the API via `fetch` with `credentials: 'include'`. |
| **Express API** | Routes, controllers, middleware (helmet, CORS, rate-limiter, session). |
| **Services** | Business logic — OAuth token exchange, Gemini prompt construction, AES encryption, Redis caching. |
| **Database** | PostgreSQL for durable state; Redis for ephemeral state (sessions, AI cache). |

---

## Data Flow

### 1. Authentication (Google OAuth 2.0)

```
Browser ──GET /auth/google──► Express ──302──► Google consent screen
Google ──callback with code──► GET /auth/google/callback
  └─ exchangeCodeForTokens(code)
  └─ getGoogleUserProfile(id_token)
  └─ upsertUser(email, name, avatar)
  └─ upsertIntegration('google', encrypt(access_token), encrypt(refresh_token))
  └─ req.session.userId = user.id   (stored in Redis via connect-redis)
  └─ 302 → frontend dashboard
```

### 2. Inbox Fetch → Gemini Analysis → Task Persistence

```
POST /api/analyze   { items: InboxItem[] }
  │
  ├─ 1. sanitizeInboxItem() on every item (prompt-injection defence)
  ├─ 2. generate deterministic cache key = SHA-256(userId + item content)
  ├─ 3. Redis GET → cache hit?  → return cached AnalysisResult
  │                 → cache miss → continue ▼
  ├─ 4. Gemini 2.5 Flash (structured JSON output, Zod-validated response)
  ├─ 5. Redis SETEX result (TTL 20 min)
  ├─ 6. INSERT INTO analyses (...)
  ├─ 7. Bulk INSERT INTO tasks (user_id, analysis_id, title, urgency_score, importance_score)
  └─ 8. Return { result, cached: false }
```

---

## Database Schema Summary

Four tables in PostgreSQL, all using UUIDv4 primary keys via `pgcrypto`:

| Table | Purpose | Key columns |
|---|---|---|
| `users` | User accounts (from Google profile) | `id`, `email`, `name`, `avatar_url` |
| `integrations` | OAuth tokens per provider, encrypted at rest | `user_id`, `provider`, `access_token` (AES-256-GCM), `refresh_token`, `metadata` (JSONB), `expires_at` |
| `analyses` | Historical AI analysis runs | `user_id`, `inbox_item_count`, `productivity_score`, `distribution` (JSONB), `analysis_result` (JSONB) |
| `tasks` | Individual prioritised tasks derived from an analysis | `user_id`, `analysis_id`, `title`, `urgency_score` (1-10), `importance_score` (1-10), `status` (pending/completed/dismissed) |

Referential integrity: `integrations`, `analyses`, and `tasks` cascade-delete on user removal. Tasks set `analysis_id` to NULL if the parent analysis is deleted.

---

## Redis Caching Strategy

Redis serves two purposes:

### Session Storage
- **Store:** `connect-redis` with key prefix `focusflow:sess:`
- **TTL:** 7 days (matches cookie `maxAge`)
- **Why Redis over JWT?** Sessions can be invalidated server-side instantly on logout.

### AI Response Cache
- **Store:** `cache.service.ts` with key prefix `focusflow:analysis:`
- **Key:** `SHA-256(userId + sorted item IDs + content)` — deterministic, so identical inbox content is a cache hit.
- **TTL:** 20 minutes — ensures fresh results when inbox changes, but avoids redundant Gemini calls for rapid dashboard refreshes.
- **Failure mode:** Cache read/write errors are caught and logged; the app falls back to a fresh Gemini call. Cache never breaks the happy path.

---

## Token Encryption Approach

All OAuth tokens (Google `access_token`, `refresh_token`, future Slack/Jira tokens) are encrypted **before** database insertion and decrypted **only** when needed for an outbound API call.

| Property | Value |
|---|---|
| Algorithm | AES-256-GCM (authenticated encryption) |
| Key | 32-byte key from `ENCRYPTION_KEY` env var (64 hex chars) |
| IV | 16 random bytes per encryption, stored with ciphertext |
| Auth tag | 16 bytes, prevents tampering |
| Storage format | `iv:authTag:ciphertext` (hex, colon-separated) |

**Why AES-256-GCM?** It provides both confidentiality and integrity — if ciphertext is tampered with, decryption throws instead of silently returning garbage.

---

## P2 Roadmap Items

### Slack OAuth ("Add to Workspace")
- **Status:** Route skeletons wired at `GET /api/integrations/slack/oauth/start` and `GET /api/integrations/slack/oauth/callback`.
- **Remaining work:**
  - Register a Slack app and obtain `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`.
  - Add required scopes (`channels:read`, `chat:write`, `users:read`).
  - Implement token exchange in the callback and store via `upsertIntegration('slack', ...)`.
  - Add a Slack inbox fetcher service that pulls recent DMs/mentions.

### Jira OAuth (OAuth 2.0 3LO)
- **Status:** Route skeletons wired at `GET /api/integrations/jira/oauth/start` and `GET /api/integrations/jira/oauth/callback`.
- **Remaining work:**
  - Register an Atlassian OAuth 2.0 (3LO) app; obtain `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET`.
  - Request scopes: `read:jira-work`, `read:jira-user`.
  - Implement token exchange + accessible-resources lookup.
  - Add a Jira inbox fetcher for assigned/watched issues.

### Other P2 Items
- **Webhook-based real-time updates** — subscribe to Gmail push notifications instead of polling.
- **Background job queue** — move Gemini calls to a Bull/BullMQ worker so the API responds immediately.
- **Multi-tenant workspace support** — team-level dashboards and shared priority views.
- **Mobile PWA polish** — offline task list via service worker + IndexedDB.
