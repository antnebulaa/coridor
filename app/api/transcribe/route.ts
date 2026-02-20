import { NextResponse } from 'next/server';
import getCurrentUser from '@/app/actions/getCurrentUser';

// POST /api/transcribe — Transcribe audio via OpenAI Whisper
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Forward to OpenAI Whisper API
    const whisperForm = new FormData();
    whisperForm.append('file', audioFile, audioFile.name);
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'fr');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperForm,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Transcribe] Whisper error:', err);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
    }

    const data = await res.json();

    // Audio is NOT stored — RGPD compliant
    return NextResponse.json({ text: data.text });
  } catch (error: unknown) {
    console.error('[Transcribe] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
