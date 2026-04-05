# FocusFlow — AI-Powered Task Prioritization Engine

<div align="center">

**An AI-powered contextual task prioritization engine that analyzes incoming communications and surfaces a dynamic daily priority list.**

[Live Demo](https://ai.studio/apps/drive/1UtQo2tC5QtRcZ_SDd5focZC7ny_3agGQ) · [Migration Guide](./MIGRATION.md) · [System Design](./docs/SYSTEM_DESIGN.md)

</div>

---

## Features

- 🧠 **AI-Powered Prioritization** — Gemini 2.5 Flash analyzes all incoming items and ranks them by urgency and importance
- 🔗 **Multi-Source Integration** — Aggregates Gmail, Google Calendar, Slack, and Jira into a single inbox
- 📊 **Workload Analytics** — Interactive donut chart showing task distribution across Urgent/Important/Routine/Noise
- 🔐 **Secure Authentication** — Google OAuth 2.0 with encrypted token storage (AES-256-GCM)
- ⚡ **Smart Caching** — Redis caches AI responses for 20 minutes (content-hash keyed)
- 🛡️ **Prompt Injection Protection** — Sanitizes all inbox content before AI processing
- 📱 **Responsive Design** — Works on desktop and mobile

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite 6 (dev server + build)
- TailwindCSS (via CDN)
- Recharts (data visualization)
- Lucide React (icons)

### Backend
- Node.js + Express + TypeScript
- PostgreSQL (users, integrations, analysis history, tasks)
- Redis (session storage + AI response cache)
- Google OAuth 2.0 (`google-auth-library`)
- Gemini 2.5 Flash (`@google/genai`)
- Zod (runtime validation)
- Helmet (security headers)

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  React SPA  │────▶│  Express Backend │────▶│  External APIs   │
│  Port 3000  │     │    Port 3001     │     │  Gmail, Calendar │
│             │◀────│                  │◀────│  Slack, Jira     │
└─────────────┘     │  ┌────────────┐  │     │  Gemini AI       │
   (Vite proxy)     │  │ PostgreSQL │  │     └──────────────────┘
                    │  │   Redis    │  │
                    │  └────────────┘  │
                    └──────────────────┘
```

## Quick Start

### Prerequisites

- Node.js ≥ 18
- Docker + Docker Compose
- Google Cloud project with OAuth 2.0 credentials
- Gemini API key

### Setup

```bash
# 1. Install dependencies
npm run setup

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start Postgres + Redis
docker-compose up -d

# 4. Start dev servers (frontend + backend)
npm run dev:all
```

Open `http://localhost:3000` and sign in with Google.

### Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URI (`http://localhost:3001/auth/google/callback`) |
| `GEMINI_API_KEY` | API key from Google AI Studio |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SESSION_SECRET` | Random 64-char secret for session encryption |
| `ENCRYPTION_KEY` | Random 64-hex-char key for AES-256-GCM token encryption |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start frontend only (port 3000) |
| `npm run dev:server` | Start backend only (port 3001) |
| `npm run dev:all` | Start both frontend and backend |
| `npm run build` | Build frontend for production |
| `npm run setup` | Install all dependencies (frontend + server) |
| `npm run db:migrate` | Run database migrations |

## API Endpoints

### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/google` | No | Initiate Google OAuth flow |
| `GET` | `/auth/google/callback` | No | OAuth callback handler |
| `GET` | `/auth/me` | Yes | Get current user profile |
| `POST` | `/auth/logout` | Yes | Destroy session |

### Core API
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/inbox` | Yes | Fetch aggregated inbox from all sources |
| `POST` | `/api/analyze` | Yes | Run AI analysis (cached) |
| `GET` | `/api/analyze` | Yes | Get analysis history |
| `PATCH` | `/api/tasks/:id` | Yes | Update task status |
| `GET` | `/api/tasks` | Yes | List tasks |

### Integrations
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/integrations` | Yes | List connected integrations |
| `POST` | `/api/integrations/slack` | Yes | Save Slack token |
| `POST` | `/api/integrations/jira` | Yes | Save Jira credentials |
| `DELETE` | `/api/integrations/:provider` | Yes | Disconnect integration |

## Project Structure

```
focusflow/
├── src/                        # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── Analytics.tsx       # Workload distribution chart
│   │   ├── Dashboard.tsx       # Main dashboard view
│   │   ├── ErrorBoundary.tsx   # Error recovery UI
│   │   ├── LoginScreen.tsx     # Google OAuth sign-in
│   │   ├── PermissionScreen.tsx# Integration setup
│   │   ├── PriorityCard.tsx    # AI-prioritized task card
│   │   ├── SourceIcon.tsx      # Integration source icons
│   │   └── StreamItem.tsx      # Inbox stream item
│   ├── services/
│   │   └── api.ts              # Backend API client
│   ├── App.tsx                 # Root component + auth state
│   ├── types.ts                # Frontend type definitions
│   └── constants.ts            # Mock data (fallback)
│
├── server/                     # Backend (Express + TypeScript)
│   └── src/
│       ├── config/             # Database, Redis, session, env config
│       ├── controllers/        # Request handlers
│       ├── db/                 # Schema + query functions
│       ├── middleware/         # Auth, error handler, rate limiter
│       ├── routes/             # Express route definitions
│       ├── services/           # Business logic (Gmail, Slack, Gemini, etc.)
│       ├── validators/         # Zod schemas + prompt sanitizer
│       └── types/              # Server-side type definitions
│
├── docker-compose.yml          # Postgres + Redis for dev
├── .env.example                # Environment variable template
└── MIGRATION.md                # Prototype → production changes
```

## Security

- **No client-side secrets** — Gemini API key and OAuth tokens never leave the server
- **Encrypted token storage** — AES-256-GCM encryption for all stored tokens
- **httpOnly session cookies** — Not accessible via JavaScript (XSS resistant)
- **Prompt injection sanitization** — Strips known attack patterns before AI processing
- **Zod validation** — Runtime validation on all AI responses
- **Rate limiting** — 10 analysis requests per minute per user
- **Helmet** — Security headers (CSP, HSTS, etc.)
- **CORS** — Restricted to frontend origin only

## License

MIT
