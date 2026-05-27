-- FocusFlow Database Schema
-- Run with: docker-compose up (auto-applied on first start)
-- Or manually: psql -U focusflow -d focusflow -f schema.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    name          VARCHAR(255) NOT NULL,
    display_name  VARCHAR(255),
    secondary_emails JSONB DEFAULT '[]'::jsonb,
    linked_accounts  JSONB DEFAULT '{}'::jsonb,
    avatar_url    TEXT,
    password_hash TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Connected integrations (tokens encrypted at application level)
-- ============================================================================
CREATE TABLE IF NOT EXISTS integrations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider      VARCHAR(50) NOT NULL,           -- 'google', 'slack', 'jira'
    access_token  TEXT NOT NULL,                   -- AES-256-GCM encrypted
    refresh_token TEXT,                            -- AES-256-GCM encrypted
    metadata      JSONB DEFAULT '{}',             -- provider-specific config (e.g. jira domain)
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    -- One integration per provider per user
    UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);

-- ============================================================================
-- AI Analysis history
-- ============================================================================
CREATE TABLE IF NOT EXISTS analyses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inbox_item_count    INT NOT NULL,
    productivity_score  INT NOT NULL,
    distribution        JSONB NOT NULL,           -- { urgent, important, routine, noise }
    analysis_result     JSONB NOT NULL,           -- full AnalysisResult object
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- ============================================================================
-- Task tracking (individual prioritized tasks from an analysis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id       UUID REFERENCES analyses(id) ON DELETE SET NULL,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_item_id  VARCHAR(255),               -- links back to the source inbox item id
    native_url        TEXT,                       -- absolute deep-link to source item
    title             VARCHAR(500) NOT NULL,
    status            VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending', 'completed', 'dismissed')),
    urgency_score     NUMERIC(4,3) CHECK (urgency_score BETWEEN 0 AND 1),
    importance_score  NUMERIC(4,3) CHECK (importance_score BETWEEN 0 AND 1),
    due_at            TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============================================================================
-- Password reset tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_resets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);

-- ============================================================================
-- Backfill for existing databases
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_emails JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_accounts JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

UPDATE users SET secondary_emails = '[]'::jsonb WHERE secondary_emails IS NULL;
UPDATE users SET linked_accounts = '{}'::jsonb WHERE linked_accounts IS NULL;
