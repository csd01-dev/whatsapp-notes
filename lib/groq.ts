import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY?.trim() });

/**
 * Transcribe a WhatsApp voice note.
 * @param mediaUrl  - Twilio media URL (requires Basic auth to download)
 * @param contentType - MIME type from Twilio (e.g. audio/ogg)
 */
export async function transcribeAudio(
  mediaUrl: string,
  contentType = 'audio/ogg'
): Promise<string | null> {
  try {
    // Twilio media URLs require HTTP Basic auth
    const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const token = process.env.TWILIO_AUTH_TOKEN?.trim();
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');

    const audioResponse = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!audioResponse.ok) {
      console.error('Failed to download audio:', audioResponse.status);
      return null;
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    // Pick a reasonable file extension from the content type
    const ext = contentType.includes('ogg')
      ? 'ogg'
      : contentType.includes('mp4') || contentType.includes('m4a')
      ? 'm4a'
      : contentType.includes('mpeg') || contentType.includes('mp3')
      ? 'mp3'
      : contentType.includes('webm')
      ? 'webm'
      : 'ogg';

    const file = new File([audioBuffer], `voice.${ext}`, { type: contentType });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      // Detect language automatically — works great for English and Hindi
    });

    return transcription.text?.trim() || null;
  } catch (error) {
    console.error('Groq transcription error:', error);
    return null;
  }
}
