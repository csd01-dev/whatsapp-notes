import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, updateNote, deleteNote } from '@/lib/notes';

// PATCH /api/notes/[id]  { phone, content?, summary?, tags? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { phone, content, summary, tags } = body;

    if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

    const user = await getOrCreateUser(phone);
    await updateNote(user.id, id, { content, summary, tags });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/notes/[id]?phone=+91...
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const phone = request.nextUrl.searchParams.get('phone');

    if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

    const user = await getOrCreateUser(phone);
    await deleteNote(user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
