import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY?.trim() });

// POST /api/transcribe  (FormData with audio blob in field "audio")
// Returns { text: string }
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob | null;

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    // Convert Blob to ArrayBuffer then to File for Groq SDK
    const arrayBuffer = await audioBlob.arrayBuffer();
    const contentType = audioBlob.type || 'audio/webm';

    // Pick extension based on content type
    const ext = contentType.includes('ogg')
      ? 'ogg'
      : contentType.includes('mp4') || contentType.includes('m4a')
      ? 'm4a'
      : contentType.includes('mpeg') || contentType.includes('mp3')
      ? 'mp3'
      : contentType.includes('webm')
      ? 'webm'
      : contentType.includes('wav')
      ? 'wav'
      : 'webm';

    const file = new File([arrayBuffer], `voice.${ext}`, { type: contentType });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
    });

    return NextResponse.json({ text: transcription.text?.trim() || '' });
  } catch (err) {
    console.error('Transcription error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
