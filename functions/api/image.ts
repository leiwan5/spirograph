import { generatePng, generateSvg } from '@spirograph/core';

interface CfContext {
  request: Request;
}

/** GET /api/image?format=png|svg&ring=...&rolling=...&pen=...&size=... */
export async function onRequest(context: CfContext): Promise<Response> {
  const url = new URL(context.request.url);
  const format = url.searchParams.get('format');
  if (format !== 'png' && format !== 'svg') {
    return new Response('format param must be png or svg', { status: 400 });
  }
  try {
    if (format === 'svg') {
      return new Response(generateSvg(url.search), {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    return new Response(generatePng(url.search), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[api/image] generation failed:', err);
    return new Response('image generation failed', { status: 500 });
  }
}
