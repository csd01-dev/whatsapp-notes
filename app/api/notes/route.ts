import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, saveNote, searchNotes, listRecentNotes } from '@/lib/notes';

// GET /api/notes?phone=+91...&search=query  → list or search notes
export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone');
  const search = request.nextUrl.searchParams.get('search');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);

  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  try {
    const user = await getOrCreateUser(phone);
    const notes = search
      ? await searchNotes(user.id, search, limit)
      : await listRecentNotes(user.id, limit);
    return NextResponse.json({ notes, userId: user.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/notes  { phone, content, summary, tags }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, content, summary, tags = [] } = body;

    if (!phone || !content) {
      return NextResponse.json({ error: 'phone and content required' }, { status: 400 });
    }

    const user = await getOrCreateUser(phone);
    const noteId = await saveNote(user.id, { content, summary: summary || content.slice(0, 80), tags });
    return NextResponse.json({ noteId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
