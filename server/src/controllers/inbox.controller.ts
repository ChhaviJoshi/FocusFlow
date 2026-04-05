import type { Request, Response } from 'express';
import { fetchGmailItems } from '../services/gmail.service.js';
import { fetchCalendarItems } from '../services/calendar.service.js';
import { fetchSlackItems } from '../services/slack.service.js';
import { fetchJiraItems } from '../services/jira.service.js';
import type { InboxItem } from '../types/index.js';

/**
 * Aggregates inbox items from all connected integrations.
 * Fetches in parallel for speed, but individual source failures
 * don't block other sources (graceful degradation).
 */
export async function getInbox(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;

  // Fetch all sources in parallel — each one handles its own errors
  const [gmailItems, calendarItems, slackItems, jiraItems] = await Promise.all([
    fetchGmailItems(userId).catch((err) => {
      console.warn('[Inbox] Gmail fetch failed:', err.message);
      return [] as InboxItem[];
    }),
    fetchCalendarItems(userId).catch((err) => {
      console.warn('[Inbox] Calendar fetch failed:', err.message);
      return [] as InboxItem[];
    }),
    fetchSlackItems(userId).catch((err) => {
      console.warn('[Inbox] Slack fetch failed:', err.message);
      return [] as InboxItem[];
    }),
    fetchJiraItems(userId).catch((err) => {
      console.warn('[Inbox] Jira fetch failed:', err.message);
      return [] as InboxItem[];
    }),
  ]);

  const allItems = [...gmailItems, ...calendarItems, ...slackItems, ...jiraItems];

  // Sort by timestamp, newest first
  allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({
    items: allItems,
    sources: {
      gmail: gmailItems.length,
      calendar: calendarItems.length,
      slack: slackItems.length,
      jira: jiraItems.length,
    },
    total: allItems.length,
  });
}
