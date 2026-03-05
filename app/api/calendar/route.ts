import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/notes';
import { isCalendarConnected, listUpcomingEvents } from '@/lib/calendar';

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
