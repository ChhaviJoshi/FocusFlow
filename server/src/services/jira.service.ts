import type { InboxItem } from '../types/index.js';
import { SourceType } from '../types/index.js';
import { getIntegrationDecrypted } from '../db/queries/integrations.queries.js';

/**
 * Jira service — fetches assigned issues server-side.
 * CORS is no longer an issue because this runs on the backend.
 *
 * Uses Basic auth (email:apiToken) as required by Jira Cloud REST API v3.
 */

export async function fetchJiraItems(userId: string): Promise<InboxItem[]> {
  const integration = await getIntegrationDecrypted(userId, 'jira');
  if (!integration) return [];

  const metadata = integration.metadata as { domain?: string; email?: string } || {};
  const domain = metadata.domain;
  const email = metadata.email;
  const apiToken = integration.decryptedAccessToken;

  if (!domain || !email) {
    console.warn('[Jira] Missing domain or email in integration metadata');
    return [];
  }

  try {
    // Basic auth: base64(email:apiToken)
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    const response = await fetch(
      `https://${domain}/rest/api/3/search?jql=assignee=currentUser() AND resolution=Unresolved&maxResults=10`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[Jira] API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: any = await response.json();

    return (data.issues || []).map((issue: any) => ({
      id: `jira-${issue.id}`,
      source: SourceType.JIRA,
      sender: issue.fields?.reporter?.displayName || 'Jira',
      subject: issue.key,
      content: issue.fields?.summary || 'No summary',
      timestamp: issue.fields?.created || new Date().toISOString(),
      read: false,
    } satisfies InboxItem));
  } catch (err) {
    console.error('[Jira] Fetch error:', err);
    return [];
  }
}
