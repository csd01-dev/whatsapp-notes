import { NextRequest } from 'next/server';
import { processWhatsAppMessage } from '@/lib/claude';
import { getOrCreateUser } from '@/lib/notes';
import { sendWhatsAppMessage } from '@/lib/twilio';
import { transcribeAudio } from '@/lib/groq';

// Twilio sends POST with application/x-www-form-urlencoded
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const from = formData.get('From') as string;         // "whatsapp:+919876543210"
    const body = (formData.get('Body') as string) ?? '';
    const numMedia = parseInt((formData.get('NumMedia') as string) ?? '0', 10);
    const mediaUrl = formData.get('MediaUrl0') as string | null;
    const mediaType = formData.get('MediaContentType0') as string | null;

    if (!from) {
      return new Response('Missing From field', { status: 400 });
    }

    // Strip "whatsapp:" prefix for storage
    const phone = from.replace('whatsapp:', '');
    const user = await getOrCreateUser(phone);

    let messageText = body.trim();
    let source: 'text' | 'voice' = 'text';

    // ── Handle media ──
    if (numMedia > 0 && mediaUrl) {
      if (mediaType?.startsWith('audio/')) {
        // Voice note → transcribe
        const transcript = await transcribeAudio(mediaUrl, mediaType);
        if (!transcript) {
          await sendWhatsAppMessage(
            from,
            "Sorry, I couldn't transcribe that voice note. Please try again or type it out."
          );
          return new Response('', { status: 200 });
        }
        messageText = transcript;
        source = 'voice';
      } else if (mediaType?.startsWith('image/')) {
        await sendWhatsAppMessage(
          from,
          "I can't process images yet. Please send text or a voice note!"
        );
        return new Response('', { status: 200 });
      } else if (mediaType?.startsWith('video/')) {
        await sendWhatsAppMessage(
          from,
          "Video messages aren't supported. Please send text or a voice note!"
        );
        return new Response('', { status: 200 });
      }
    }

    if (!messageText) {
      await sendWhatsAppMessage(
        from,
        "I received your message but couldn't read it. Please send text or a voice note."
      );
      return new Response('', { status: 200 });
    }

    // ── Process with Claude ──
    const reply = await processWhatsAppMessage(user.id, messageText, source);

    // ── Send reply ──
    await sendWhatsAppMessage(from, reply);

    return new Response('', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to Twilio so it doesn't retry — log the error instead
    return new Response('', { status: 200 });
  }
}

// Twilio sometimes sends a GET to verify the endpoint
export async function GET() {
  return new Response('WhatsApp Notes webhook is live.', { status: 200 });
}
