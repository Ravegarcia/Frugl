import 'server-only';
import { GoogleGenAI } from '@google/genai';
import type { Hints, LaptopIdentifier, VisionResult } from './types';

const PROMPT =
  'You identify laptops from photos for a secondhand marketplace. ' +
  'Look at every photo, especially any close-up of a model sticker or label. ' +
  'Reply with JSON only, using these keys: ' +
  'brand (string or null), ' +
  'series (string or null, for example ThinkPad T14 or Latitude 5420), ' +
  'modelNumber (string or null: the model or part number printed on a label), ' +
  'visibleText (array of strings: every readable piece of text on the laptop or its labels), ' +
  'confidence (number from 0 to 1: how sure you are about the brand and series). ' +
  'Use null when you cannot tell. Never invent a model number that is not visible.';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const msg = String(e?.message ?? e);
      const retryable = ['429', '503', 'RESOURCE_EXHAUSTED', 'UNAVAILABLE'].some((c) => msg.includes(c));
      if (!retryable || i === tries - 1) break;
      await sleep(1500 * (i + 1));
    }
  }
  throw lastError;
}

export class GeminiIdentifier implements LaptopIdentifier {
  async identify({ images, hints = {} }: { images: Buffer[]; hints?: Hints }): Promise<VisionResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const used = Object.entries(hints).filter(([, v]) => v !== undefined && v !== '');
    const hintText = used.length ? ' The seller says (unverified): ' + used.map(([k, v]) => k + ' = ' + v).join(', ') + '.' : '';

    const parts: any[] = [{ text: PROMPT + hintText }];
    for (const img of images) parts.push({ inlineData: { mimeType: 'image/jpeg', data: img.toString('base64') } });

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      })
    );

    let raw: any = {};
    try {
      raw = JSON.parse(response.text ?? '{}');
    } catch {
      raw = {};
    }
    const conf = Number(raw.confidence);
    return {
      brand: str(raw.brand),
      series: str(raw.series),
      modelNumber: str(raw.modelNumber),
      visibleText: Array.isArray(raw.visibleText) ? raw.visibleText.map(String).slice(0, 40) : [],
      confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0,
      hintsUsed: used.map(([k]) => k),
    };
  }
}
