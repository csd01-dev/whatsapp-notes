import { NextRequest, NextResponse } from 'next/server';
import { saveCalendarTokens } from '@/lib/calendar';

// GET /api/auth/google/callback?code=...&state=...
// Exchanges authorization code for tokens and stores them
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?calendar=error`);
  }

  // Decode state to get userId
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
    userId = decoded.userId;
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?calendar=error`);
  }

  // Exchange code for tokens
  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token || !tokens.refresh_token) {
    return NextResponse.redirect(`${appUrl}/dashboard?calendar=error`);
  }

  // Fetch user's Google email
  let email: string | undefined;
  try {
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    email = profile.email;
  } catch { /* ignore */ }

  await saveCalendarTokens(userId, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in ?? 3600,
    email,
  });

  return NextResponse.redirect(`${appUrl}/dashboard?calendar=connected`);
}
