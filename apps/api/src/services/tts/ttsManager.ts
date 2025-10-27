import { getCacheKey, InMemoryTtsCache } from './cache.js';
import type {
  TtsManagerOptions,
  TtsProvider,
  TtsSynthesisParams,
  TtsSynthesisResult,
} from './types.js';
import { startTask, completeTask, failTask, type TtsTaskRecord } from './taskRegistry.js';

export class TtsManager {
  private readonly provider: TtsProvider;

  private readonly cache = new InMemoryTtsCache();

  private readonly cacheTtlMs: number;

  constructor(provider: TtsProvider, options: TtsManagerOptions = {}) {
    this.provider = provider;
    this.cacheTtlMs = options.cacheTtlMs ?? 5 * 60 * 1000;
  }

  getCapabilities() {
    return this.provider.capabilities;
  }

  async synthesize(params: TtsSynthesisParams): Promise<TtsSynthesisResult> {
    const cacheKey = getCacheKey({
      text: params.text,
      voiceId: params.voiceId,
      speed: params.speed,
      pitch: params.pitch,
      format: params.format,
    });

    const cached = await this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.result, cached: true };
    }

    const result = await this.provider.synthesize(params);
    await this.cache.set({
      key: cacheKey,
      expiresAt: Date.now() + this.cacheTtlMs,
      result,
    });
    return result;
  }

  createTask(params: TtsSynthesisParams): TtsTaskRecord {
    const cacheKey = getCacheKey({
      text: params.text,
      voiceId: params.voiceId,
      speed: params.speed,
      pitch: params.pitch,
      format: params.format,
    });
    const task = startTask({
      cacheKey,
      provider: this.provider.id,
      textLength: params.text.length,
      voiceId: params.voiceId,
      metadata: params.metadata,
    });

    setImmediate(async () => {
      try {
        const result = await this.synthesize(params);
        completeTask(task.id, {
          requestId: result.requestId,
          cached: Boolean(result.cached),
          audioUrl: result.audioUrl,
          durationMs: result.durationMs,
        });
      } catch (error) {
        failTask(task.id, error as Error);
      }
    });

    return task;
  }
}
