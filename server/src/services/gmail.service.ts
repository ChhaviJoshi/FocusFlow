import type { InboxItem } from '../types/index.js';
import { SourceType } from '../types/index.js';
import { getIntegrationDecrypted, updateAccessToken } from '../db/queries/integrations.queries.js';
import { refreshGoogleToken } from './auth.service.js';

/**
 * Gmail service — fetches emails server-side using the stored Google OAuth token.
 * No CORS issues since this runs on the server.
 */

/**
 * Fetch recent Gmail messages for a user.
 * Handles token refresh transparently if the access token has expired.
 */
export async function fetchGmailItems(userId: string): Promise<InboxItem[]> {
  const integration = await getIntegrationDecrypted(userId, 'google');
  if (!integration) return [];

  let token = integration.decryptedAccessToken;

  // Try fetching; if 401, refresh token and retry
  let response = await callGmailApi(token);

  if (response.status === 401 && integration.decryptedRefreshToken) {
    // Token expired — refresh it
    console.log('[Gmail] Access token expired, refreshing...');
    const refreshed = await refreshGoogleToken(integration.decryptedRefreshToken);
    token = refreshed.accessToken;

    // Persist the refreshed token
    await updateAccessToken(userId, 'google', token, refreshed.expiresAt);

    // Retry with new token
    response = await callGmailApi(token);
  }

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
  }

  const listData: any = await response.json();
  if (!listData.messages || listData.messages.length === 0) return [];

  // Fetch details for each message (limited to 10 to avoid rate limits)
  const detailPromises = listData.messages.slice(0, 10).map(async (msg: any) => {
    try {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!detailRes.ok) return null;
      const data: any = await detailRes.json();

      const headers = data.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
      const sender = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';

      return {
        id: `gmail-${data.id}`,
        source: SourceType.EMAIL,
        sender,
        subject,
        content: data.snippet || '',
        timestamp: new Date(parseInt(data.internalDate)).toISOString(),
        read: !data.labelIds?.includes('UNREAD'),
      } satisfies InboxItem;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(detailPromises);
  return results.filter((item): item is InboxItem => item !== null);
}

async function callGmailApi(token: string): Promise<Response> {
  return fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10',
    { headers: { Authorization: `Bearer ${token}` } }
  );
}
