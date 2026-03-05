import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/notes';
import { updateTask, deleteTask, toggleTaskComplete } from '@/lib/tasks';

// PATCH /api/tasks/[id]  { phone, title?, description?, due_date?, priority?, is_completed? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { phone, is_completed, ...updates } = body;

    if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

    const user = await getOrCreateUser(phone);

    // If only toggling completion, use the toggle function
    if (typeof is_completed === 'boolean' && Object.keys(updates).length === 0) {
      await toggleTaskComplete(user.id, id, is_completed);
    } else {
      await updateTask(user.id, id, { ...updates, is_completed });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]?phone=+91...
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const phone = request.nextUrl.searchParams.get('phone');

    if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

    const user = await getOrCreateUser(phone);
    await deleteTask(user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
