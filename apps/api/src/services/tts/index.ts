import { TtsManager } from './ttsManager.js';
import type { CreateTaskOptions, TtsSynthesisResult } from './types.js';
import { MockTtsProvider } from './providers/mockTtsProvider.js';
import { TencentTtsProvider } from './providers/tencentTtsProvider.js';
import { getTaskById, listTasks } from './taskRegistry.js';

let manager: TtsManager | null = null;

const resolveProvider = () => {
  const preferred = (process.env.TTS_PROVIDER || '').toLowerCase();
  if (preferred === 'mock') {
    return new MockTtsProvider();
  }
  try {
    return new TencentTtsProvider();
  } catch (error) {
    console.warn('[tts] Tencent provider unavailable, fallback to mock:', (error as Error).message);
    return new MockTtsProvider();
  }
};

export const getTtsManager = (): TtsManager => {
  if (!manager) {
    manager = new TtsManager(resolveProvider(), {
      cacheTtlMs: Number.parseInt(process.env.TTS_CACHE_TTL ?? '300', 10) * 1000,
    });
  }
  return manager;
};

export const synthesizeSync = async (params: CreateTaskOptions): Promise<TtsSynthesisResult> => {
  const mgr = getTtsManager();
  return mgr.synthesize({ ...params });
};

export const createTtsTask = (params: CreateTaskOptions) => {
  const mgr = getTtsManager();
  return mgr.createTask({ ...params });
};

export const getTtsTask = getTaskById;
export const listTtsTasks = listTasks;
