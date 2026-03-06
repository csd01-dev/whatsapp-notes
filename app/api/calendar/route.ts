import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/notes';
import { isCalendarConnected, listUpcomingEvents } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';

// GET /api/calendar?phone=...  → { connected, events[] }
export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  try {
    const user = await getOrCreateUser(phone);
    const connected = await isCalendarConnected(user.id);
    if (!connected) return NextResponse.json({ connected: false, events: [] });

    const events = await listUpcomingEvents(user.id, 5);
    return NextResponse.json({ connected: true, events });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/calendar?phone=...  → clears stored Google tokens
export async function DELETE(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  try {
    const user = await getOrCreateUser(phone);
    await supabase
      .from('wa_users')
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
        google_email: null,
      })
      .eq('id', user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
