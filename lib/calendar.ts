import { supabase } from './supabase';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_URL = 'https://www.googleapis.com/calendar/v3';

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start: string;       // ISO datetime e.g. "2025-03-10T09:00:00+05:30"
  end: string;         // ISO datetime
  location?: string;
  attendees?: string[]; // email addresses
  meetLink?: string;   // Google Meet link (returned on created event)
}

// ─── Token management ─────────────────────────────────────────────────────────

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const { data: user } = await supabase
    .from('wa_users')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', userId)
    .single();

  if (!user?.google_refresh_token) return null;

  // Refresh if expired or expiring within 5 minutes
  const expiry = user.google_token_expiry ? new Date(user.google_token_expiry) : new Date(0);
  const needsRefresh = expiry.getTime() - Date.now() < 5 * 60 * 1000;

  if (!needsRefresh && user.google_access_token) {
    return user.google_access_token;
  }

  // Refresh the access token
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: user.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await res.json();
    if (!tokens.access_token) return null;

    const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);
    await supabase
      .from('wa_users')
      .update({
        google_access_token: tokens.access_token,
        google_token_expiry: newExpiry.toISOString(),
      })
      .eq('id', userId);

    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function saveCalendarTokens(
  userId: string,
  tokens: { access_token: string; refresh_token: string; expires_in: number; email?: string }
): Promise<void> {
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);
  await supabase
    .from('wa_users')
    .update({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      google_token_expiry: expiry.toISOString(),
      google_email: tokens.email ?? null,
    })
    .eq('id', userId);
}

export async function isCalendarConnected(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('wa_users')
    .select('google_refresh_token')
    .eq('id', userId)
    .single();
  return !!data?.google_refresh_token;
}

// ─── Calendar operations ──────────────────────────────────────────────────────

export async function createCalendarEvent(
  userId: string,
  event: CalendarEvent
): Promise<{ success: boolean; link?: string; meetLink?: string; error?: string }> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return { success: false, error: 'Calendar not connected' };
  }

  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: { dateTime: event.start, timeZone: 'Asia/Kolkata' },
    end: { dateTime: event.end, timeZone: 'Asia/Kolkata' },
  };

  if (event.attendees && event.attendees.length > 0) {
    body.attendees = event.attendees.map(email => ({ email }));
  }

  // Request Google Meet link
  body.conferenceData = {
    createRequest: {
      requestId: `meet-${Date.now()}`,
      conferenceSolutionKey: { type: 'hangoutsMeet' },
    },
  };

  const res = await fetch(
    `${GOOGLE_CALENDAR_URL}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.error?.message ?? 'Failed to create event' };
  }

  const meetLink = data.conferenceData?.entryPoints?.find(
    (e: Record<string, string>) => e.entryPointType === 'video'
  )?.uri;

  return {
    success: true,
    link: data.htmlLink,
    meetLink,
  };
}

export async function listUpcomingEvents(
  userId: string,
  maxResults = 5
): Promise<CalendarEvent[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  const now = new Date().toISOString();
  const res = await fetch(
    `${GOOGLE_CALENDAR_URL}/calendars/primary/events?` +
      new URLSearchParams({
        timeMin: now,
        maxResults: String(maxResults),
        singleEvents: 'true',
        orderBy: 'startTime',
        timeZone: 'Asia/Kolkata',
      }),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();

  return (data.items ?? []).map((item: Record<string, unknown>) => {
    const startObj = item.start as Record<string, string>;
    const endObj = item.end as Record<string, string>;
    return {
      id: item.id as string,
      title: item.summary as string ?? 'Untitled',
      description: item.description as string ?? '',
      start: startObj.dateTime ?? startObj.date ?? '',
      end: endObj.dateTime ?? endObj.date ?? '',
      location: item.location as string ?? '',
    };
  });
}
