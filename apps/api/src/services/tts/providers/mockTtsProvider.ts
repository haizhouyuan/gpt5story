import { randomUUID } from 'crypto';
import type { TtsProvider, TtsSynthesisParams, TtsSynthesisResult } from '../types.js';

export class MockTtsProvider implements TtsProvider {
  readonly id = 'mock';

  readonly capabilities = {
    voices: [
      { id: 'mock-default', name: 'Mock Voice', language: 'zh-CN' },
    ],
    speedRange: [0.5, 2],
    pitchRange: [0.5, 2],
    formats: ['mp3'],
    defaultVoice: 'mock-default',
  };

  async synthesize(params: TtsSynthesisParams): Promise<TtsSynthesisResult> {
    const base = Buffer.from(`MOCK-${params.text}`).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base}`;
    const durationMs = Math.max(1000, params.text.length * 50);
    return {
      requestId: randomUUID(),
      provider: this.id,
      audioUrl,
      format: 'mp3',
      durationMs,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
  }
}
