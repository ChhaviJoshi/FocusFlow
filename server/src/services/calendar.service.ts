import type { InboxItem } from "../types/index.js";
import { SourceType } from "../types/index.js";
import {
  getIntegrationDecrypted,
  updateAccessToken,
} from "../db/queries/integrations.queries.js";
import { refreshGoogleToken } from "./auth.service.js";

/**
 * Google Calendar service — fetches upcoming events server-side.
 * Reuses the same Google OAuth token from the auth flow.
 */

export async function fetchCalendarItems(userId: string): Promise<InboxItem[]> {
  const integration = await getIntegrationDecrypted(userId, "google");
  if (!integration) return [];

  let token = integration.decryptedAccessToken;

  const now = new Date().toISOString();
  let response = await callCalendarApi(token, now);

  // Handle token refresh
  if (response.status === 401 && integration.decryptedRefreshToken) {
    console.log("[Calendar] Access token expired, refreshing...");
    const refreshed = await refreshGoogleToken(
      integration.decryptedRefreshToken,
    );
    token = refreshed.accessToken;
    await updateAccessToken(userId, "google", token, refreshed.expiresAt);
    response = await callCalendarApi(token, now);
  }

  if (!response.ok) {
    throw new Error(
      `Calendar API error: ${response.status} ${response.statusText}`,
    );
  }

  const data: any = await response.json();

  return (data.items || []).map(
    (event: any) =>
      ({
        id: `cal-${event.id}`,
        source: SourceType.CALENDAR,
        sender: event.organizer?.email || "Calendar",
        subject: event.summary || "No Title",
        content:
          event.description ||
          `Event at ${new Date(event.start?.dateTime || event.start?.date || "").toLocaleTimeString()}`,
        timestamp:
          event.start?.dateTime ||
          event.start?.date ||
          new Date().toISOString(),
        read: false,
        nativeUrl: event.htmlLink || null,
      }) satisfies InboxItem,
  );
}

async function callCalendarApi(
  token: string,
  timeMin: string,
): Promise<Response> {
  return fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=5&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}
