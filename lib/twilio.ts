import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const FROM = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
const MAX_LENGTH = 4000; // WhatsApp limit is 4096 chars

/**
 * Send a WhatsApp message via Twilio REST API.
 * @param to  - e.g. "whatsapp:+919876543210"
 * @param body - message text
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  // Truncate if too long
  const text =
    body.length > MAX_LENGTH ? body.slice(0, MAX_LENGTH - 3) + '...' : body;

  await client.messages.create({ from: FROM, to, body: text });
}
