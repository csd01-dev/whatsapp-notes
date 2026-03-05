import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/notes';
import { processWhatsAppMessage } from '@/lib/claude';

// POST /api/chat  { phone, message }
// Returns { reply: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json({ error: 'phone and message required' }, { status: 400 });
    }

    const user = await getOrCreateUser(phone);
    const reply = await processWhatsAppMessage(user.id, message, 'text');

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json(
      { reply: "Sorry, something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
