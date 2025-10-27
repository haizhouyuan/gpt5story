import type { TtsCacheDriver, TtsCacheEntry } from './types';

export class InMemoryTtsCache implements TtsCacheDriver {
  private readonly store = new Map<string, TtsCacheEntry>();

  async get(key: string): Promise<TtsCacheEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async set(entry: TtsCacheEntry): Promise<void> {
    this.store.set(entry.key, entry);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export const getCacheKey = (params: { text: string; voiceId?: string; speed?: number; pitch?: number; format?: string }) => {
  const payload = JSON.stringify({
    text: params.text,
    voiceId: params.voiceId ?? 'default',
    speed: params.speed ?? 1,
    pitch: params.pitch ?? 1,
    format: params.format ?? 'mp3',
  });
  return Buffer.from(payload).toString('base64url');
};
