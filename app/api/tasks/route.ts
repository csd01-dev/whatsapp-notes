import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/notes';
import { createTask, listTasks } from '@/lib/tasks';

// GET /api/tasks?phone=+91...&filter=pending
export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone');
  const filter = (request.nextUrl.searchParams.get('filter') ?? 'all') as
    | 'all'
    | 'pending'
    | 'completed'
    | 'today';

  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  try {
    const user = await getOrCreateUser(phone);
    const tasks = await listTasks(user.id, filter);
    return NextResponse.json({ tasks });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/tasks  { phone, title, description?, due_date?, priority? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, title, description, due_date, priority } = body;

    if (!phone || !title) {
      return NextResponse.json({ error: 'phone and title required' }, { status: 400 });
    }

    const user = await getOrCreateUser(phone);
    const taskId = await createTask(user.id, { title, description, due_date, priority });
    return NextResponse.json({ taskId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
