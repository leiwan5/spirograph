import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generatePng, generateSvg } from '../src/server/image';

/** GET /api/image?format=png|svg&ring=...&rolling=...&pen=...&size=... */
export default function handler(req: VercelRequest, res: VercelResponse): void {
  const format = String(req.query.format ?? '');
  if (format !== 'png' && format !== 'svg') {
    res.status(400).json({ error: 'format 参数必须为 png 或 svg' });
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    if (format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.send(generateSvg(String(req.url ?? '')));
    } else {
      res.setHeader('Content-Type', 'image/png');
      res.send(Buffer.from(generatePng(String(req.url ?? ''))));
    }
  } catch (err) {
    console.error('[api/image] 生成失败:', err);
    res.status(500).send('image generation failed');
  }
}
