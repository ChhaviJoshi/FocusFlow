/**
 * Centralized API client for communicating with the backend.
 *
 * Key design decisions:
 * - `credentials: 'include'` ensures the session cookie is sent with every request
 * - All responses are JSON-parsed with error handling
 * - Throws on non-2xx responses with the server's error message
 */

const API_BASE = "/api";
const AUTH_BASE = "/auth";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "include", // Send session cookie with every request
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

// ---- Auth ----

export async function getCurrentUser() {
  return request<{
    user: {
      id: string;
      email: string;
      name: string;
      avatarUrl: string | null;
    };
    integrations: Array<{
      provider: string;
      connected: boolean;
      connectedAt: string;
    }>;
  }>(`${AUTH_BASE}/me`);
}

export async function logout() {
  return request<{ success: boolean }>(`${AUTH_BASE}/logout`, {
    method: "POST",
  });
}

// Google OAuth is a redirect, not a fetch call
export function getGoogleAuthUrl(): string {
  return `${AUTH_BASE}/google`;
}

// ---- Inbox ----

export async function fetchInbox() {
  return request<{
    items: Array<{
      id: string;
      source: string;
      sender: string;
      subject: string;
      content: string;
      timestamp: string;
      read: boolean;
      nativeUrl?: string | null;
    }>;
    sources: Record<string, number>;
    total: number;
  }>(`${API_BASE}/inbox`);
}

// ---- Analysis ----

export async function analyzeItems(
  items: Array<{
    id: string;
    source: string;
    sender: string;
    subject: string;
    content: string;
    timestamp: string;
    read: boolean;
  }>,
) {
  return request<{
    result: {
      topPriorities: Array<{
        id: string;
        originalItemId: string;
        title: string;
        summary: string;
        urgencyScore: number;
        importanceScore: number;
        reason: string;
        suggestedAction: string;
        category: string;
      }>;
      productivityScore: number;
      distribution: {
        urgent: number;
        important: number;
        routine: number;
        noise: number;
      };
      itemClassifications: Array<{
        itemId: string;
        category: string;
      }>;
      lowConfidence: boolean;
    };
    cached: boolean;
  }>(`${API_BASE}/analyze`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

// ---- Tasks ----

export async function updateTask(
  taskId: string,
  status: "completed" | "dismissed",
) {
  return request<{ task: unknown }>(`${API_BASE}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function updateTaskByOriginalItemId(
  originalItemId: string,
  status: "completed" | "dismissed",
) {
  return request<{ task: unknown }>(
    `${API_BASE}/tasks/by-item/${encodeURIComponent(originalItemId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export async function getTasks(
  status?: "pending" | "completed" | "dismissed",
  limit: number = 200,
) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (status) params.set("status", status);

  return request<{
    tasks: Array<{
      id: string;
      original_item_id: string | null;
      status: "pending" | "completed" | "dismissed";
      created_at: string;
      completed_at: string | null;
    }>;
  }>(`${API_BASE}/tasks?${params.toString()}`);
}

// ---- Integrations ----

export async function disconnectIntegration(provider: string) {
  return request<{ success: boolean }>(`${API_BASE}/integrations/${provider}`, {
    method: "DELETE",
  });
}

export async function getIntegrations() {
  return request<{
    integrations: Array<{
      provider: string;
      connected: boolean;
      metadata: Record<string, unknown>;
      connectedAt: string;
    }>;
  }>(`${API_BASE}/integrations`);
}

export async function getSlackOAuthAuthUrl() {
  return request<{ authUrl: string }>(
    `${API_BASE}/integrations/slack/oauth/start`,
  );
}

export async function getJiraOAuthAuthUrl() {
  return request<{ authUrl: string }>(
    `${API_BASE}/integrations/jira/oauth/start`,
  );
}
