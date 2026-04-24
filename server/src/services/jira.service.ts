import type { InboxItem } from "../types/index.js";
import { SourceType } from "../types/index.js";
import {
  getIntegrationDecrypted,
  upsertIntegration,
} from "../db/queries/integrations.queries.js";
import { env } from "../config/env.js";

/**
 * Jira service — fetches assigned issues server-side.
 * CORS is no longer an issue because this runs on the backend.
 *
 * Uses Atlassian OAuth tokens against api.atlassian.com.
 */

type JiraMetadata = {
  cloudId?: string;
  cloudUrl?: string;
  cloudName?: string;
};

type JiraAccessibleResource = {
  id: string;
  name?: string;
  url?: string;
  scopes?: string[];
};

async function fetchJiraIssues(
  cloudId: string,
  accessToken: string,
): Promise<Response> {
  const apiUrl = new URL(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`,
  );
  apiUrl.searchParams.set(
    "jql",
    "assignee=currentUser() AND resolution=Unresolved",
  );
  apiUrl.searchParams.set("maxResults", "10");

  return fetch(apiUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
}

async function fetchAccessibleJiraResources(
  accessToken: string,
): Promise<JiraAccessibleResource[] | null> {
  const resourcesRes = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!resourcesRes.ok) {
    return null;
  }

  const resources = (await resourcesRes.json()) as JiraAccessibleResource[];
  return Array.isArray(resources) ? resources : null;
}

async function resolveAndPersistJiraCloudId(
  userId: string,
  accessToken: string,
): Promise<string | null> {
  const resources = await fetchAccessibleJiraResources(accessToken);
  if (!resources || resources.length === 0) {
    return null;
  }

  const selectedResource =
    resources.find(
      (resource) =>
        Array.isArray(resource.scopes) &&
        resource.scopes.includes("read:jira-work"),
    ) || resources[0];

  if (!selectedResource?.id) {
    return null;
  }

  const integration = await getIntegrationDecrypted(userId, "jira");
  if (!integration) {
    return null;
  }

  await upsertIntegration(
    userId,
    "jira",
    accessToken,
    integration.decryptedRefreshToken ?? null,
    {
      ...(integration.metadata as Record<string, unknown>),
      cloudId: selectedResource.id,
      cloudUrl: selectedResource.url ?? null,
      cloudName: selectedResource.name ?? null,
    },
    integration.expires_at,
  );

  return selectedResource.id;
}

async function refreshJiraToken(userId: string): Promise<string | null> {
  const integration = await getIntegrationDecrypted(userId, "jira");
  if (!integration?.decryptedRefreshToken) {
    return null;
  }

  const refreshRes = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: env.jiraClientId,
      client_secret: env.jiraClientSecret,
      refresh_token: integration.decryptedRefreshToken,
    }),
  });

  const refreshData = (await refreshRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!refreshRes.ok || !refreshData.access_token) {
    return null;
  }

  const expiresAt = refreshData.expires_in
    ? new Date(Date.now() + refreshData.expires_in * 1000)
    : null;

  const nextRefreshToken =
    refreshData.refresh_token ?? integration.decryptedRefreshToken;

  await upsertIntegration(
    userId,
    "jira",
    refreshData.access_token,
    nextRefreshToken,
    integration.metadata as Record<string, unknown>,
    expiresAt,
  );

  return refreshData.access_token;
}

export async function fetchJiraItems(userId: string): Promise<InboxItem[]> {
  const integration = await getIntegrationDecrypted(userId, "jira");
  if (!integration) return [];

  const metadata = (integration.metadata as JiraMetadata) || {};
  let cloudId = metadata.cloudId;
  const cloudUrl = metadata.cloudUrl;
  let accessToken = integration.decryptedAccessToken;

  if (!cloudId) {
    const resolvedCloudId = await resolveAndPersistJiraCloudId(
      userId,
      accessToken,
    );
    if (!resolvedCloudId) {
      console.warn("[Jira] Missing cloudId in integration metadata");
      return [];
    }
    cloudId = resolvedCloudId;
  }

  try {
    let response = await fetchJiraIssues(cloudId, accessToken);

    // Token expired/invalid: refresh and retry once.
    if (response.status === 401) {
      const refreshedAccessToken = await refreshJiraToken(userId);
      if (!refreshedAccessToken) {
        console.warn("[Jira] Token refresh failed");
        return [];
      }
      accessToken = refreshedAccessToken;
      response = await fetchJiraIssues(cloudId, accessToken);
    }

    // Cloud ID stale or inaccessible. Re-resolve cloud and retry once.
    if (response.status === 410 || response.status === 404) {
      const resolvedCloudId = await resolveAndPersistJiraCloudId(
        userId,
        accessToken,
      );
      if (!resolvedCloudId) {
        console.warn("[Jira] Failed to re-resolve cloudId after API error");
        return [];
      }
      cloudId = resolvedCloudId;
      response = await fetchJiraIssues(cloudId, accessToken);
    }

    if (!response.ok) {
      console.warn(
        `[Jira] API error: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data: any = await response.json();

    return (data.issues || []).map(
      (issue: any) =>
        ({
          id: `jira-${issue.id}`,
          source: SourceType.JIRA,
          sender: issue.fields?.reporter?.displayName || "Jira",
          subject: issue.key,
          content: issue.fields?.summary || "No summary",
          timestamp: issue.fields?.created || new Date().toISOString(),
          read: false,
          nativeUrl:
            typeof cloudUrl === "string" && issue.key
              ? `${cloudUrl.replace(/\/$/, "")}/browse/${issue.key}`
              : null,
        }) satisfies InboxItem,
    );
  } catch (err) {
    console.error("[Jira] Fetch error:", err);
    return [];
  }
}
