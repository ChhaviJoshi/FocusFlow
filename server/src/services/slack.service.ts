import type { InboxItem } from '../types/index.js';
import { SourceType } from '../types/index.js';
import { getIntegrationDecrypted } from '../db/queries/integrations.queries.js';

/**
 * Slack service — fetches messages server-side.
 * CORS is no longer an issue because this runs on the backend.
 *
 * Current implementation fetches from conversations.list → conversations.history.
 * Uses the first public channel found. A more complete implementation would
 * let the user choose which channels to monitor.
 */

export async function fetchSlackItems(userId: string): Promise<InboxItem[]> {
  const integration = await getIntegrationDecrypted(userId, 'slack');
  if (!integration) return [];

  const token = integration.decryptedAccessToken;

  try {
    // Step 1: Get list of channels the bot is in
    const channelsRes = await fetch(
      'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=5',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const channelsData: any = await channelsRes.json();
    if (!channelsData.ok) {
      console.warn('[Slack] conversations.list failed:', channelsData.error);
      return [];
    }

    const channels = channelsData.channels || [];
    if (channels.length === 0) return [];

    // Step 2: Fetch recent messages from each channel (limit 3 per channel)
    const allItems: InboxItem[] = [];

    for (const channel of channels.slice(0, 3)) {
      const historyRes = await fetch(
        `https://slack.com/api/conversations.history?channel=${channel.id}&limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const historyData: any = await historyRes.json();
      if (!historyData.ok) continue;

      const messages = historyData.messages || [];
      for (const msg of messages) {
        // Skip bot messages and system messages
        if (msg.subtype) continue;

        allItems.push({
          id: `slack-${msg.ts}`,
          source: SourceType.SLACK,
          sender: msg.user || 'Slack User',
          subject: `#${channel.name}`,
          content: msg.text || '',
          timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
          read: false,
        });
      }
    }

    return allItems;
  } catch (err) {
    console.error('[Slack] Fetch error:', err);
    return [];
  }
}
