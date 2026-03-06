import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/twilio';

// POST /api/cron/reminders
// Called by Vercel Cron every 5 minutes.
// Finds tasks due within the next 15 minutes (or already overdue within last 5 min)
// that haven't had a reminder sent yet, and sends a WhatsApp message.
export async function GET(request: NextRequest) {
  // Verify the cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  // Window: tasks due between 5 min ago (catch just-missed) and 15 min from now
  const windowStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

  // Fetch pending tasks with due_dates in the reminder window
  const { data: tasks, error } = await supabase
    .from('wa_tasks')
    .select('id, title, due_date, user_id')
    .eq('is_completed', false)
    .is('reminder_sent_at', null)
    .gte('due_date', windowStart)
    .lte('due_date', windowEnd);

  if (error) {
    console.error('Cron reminders error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // For each task, look up the user's phone and send a WhatsApp reminder
  let sent = 0;
  const sentIds: string[] = [];

  await Promise.all(
    tasks.map(async (task) => {
      try {
        const { data: user } = await supabase
          .from('wa_users')
          .select('phone')
          .eq('id', task.user_id)
          .single();

        if (!user?.phone) return;

        const dueDate = new Date(task.due_date);
        const minutesLeft = Math.round((dueDate.getTime() - now.getTime()) / 60000);
        const timeStr = dueDate.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'short',
        });

        const message =
          minutesLeft <= 0
            ? `⏰ Reminder: *${task.title}* was due at ${timeStr}`
            : `⏰ Reminder: *${task.title}* is due in ${minutesLeft} min (${timeStr})`;

        const to = user.phone.startsWith('whatsapp:')
          ? user.phone
          : `whatsapp:${user.phone}`;

        await sendWhatsAppMessage(to, message);
        sentIds.push(task.id);
        sent++;
      } catch (err) {
        console.error(`Failed to send reminder for task ${task.id}:`, err);
      }
    })
  );

  // Mark reminders as sent
  if (sentIds.length > 0) {
    await supabase
      .from('wa_tasks')
      .update({ reminder_sent_at: now.toISOString() })
      .in('id', sentIds);
  }

  return NextResponse.json({ sent, task_ids: sentIds });
}
