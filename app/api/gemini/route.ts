import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, mode, txHash } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY.' }, { status: 500 });
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const system =
      mode === 'image'
        ? 'You are Mushee Cloud. Turn the user prompt into a concise, premium image-generation brief and a short creative rationale.'
        : 'You are Mushee Cloud, a premium AI assistant for a Stellar and SHX aligned product. Respond clearly and helpfully.';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${system}\n\nTransaction hash: ${txHash || 'not provided'}\n\nUser prompt: ${prompt}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || 'Gemini request failed.' }, { status: 500 });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('\n') || 'No response returned.';

    return NextResponse.json({ text });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to process Gemini request.' }, { status: 500 });
  }
}
