import { randomUUID } from 'crypto';

export type TaskStatus = 'pending' | 'success' | 'error';

export interface TtsTaskRecord {
  id: string;
  cacheKey: string;
  provider: string;
  status: TaskStatus;
  sessionId?: string;
  voiceId?: string;
  textLength?: number;
  metadata?: Record<string, unknown>;
  requestId?: string;
  audioUrl?: string;
  durationMs?: number;
  cached?: boolean;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

interface TaskStartParams {
  cacheKey: string;
  provider: string;
  sessionId?: string;
  voiceId?: string;
  textLength?: number;
  metadata?: Record<string, unknown>;
}

interface TaskSuccessParams {
  requestId: string;
  cached: boolean;
  audioUrl: string;
  durationMs?: number;
}

const TASK_TTL_MS = Number.parseInt(process.env.TTS_TASK_REGISTRY_TTL_MS || `${60 * 60 * 1000}`, 10);

const registry = new Map<string, TtsTaskRecord>();

const cleanupExpired = (now: number = Date.now()) => {
  for (const [taskId, record] of registry.entries()) {
    if (now - record.updatedAt > TASK_TTL_MS) {
      registry.delete(taskId);
    }
  }
};

export const startTask = (params: TaskStartParams): TtsTaskRecord => {
  cleanupExpired();

  const task: TtsTaskRecord = {
    id: randomUUID(),
    cacheKey: params.cacheKey,
    provider: params.provider,
    status: 'pending',
    sessionId: params.sessionId,
    voiceId: params.voiceId,
    textLength: params.textLength,
    metadata: params.metadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  registry.set(task.id, task);
  return task;
};

export const completeTask = (taskId: string, params: TaskSuccessParams): TtsTaskRecord | undefined => {
  const record = registry.get(taskId);
  if (!record) return undefined;

  record.status = 'success';
  record.requestId = params.requestId;
  record.audioUrl = params.audioUrl;
  record.durationMs = params.durationMs;
  record.cached = params.cached;
  record.updatedAt = Date.now();

  registry.set(taskId, record);
  return record;
};

export const failTask = (taskId: string, error: Error | string): TtsTaskRecord | undefined => {
  const record = registry.get(taskId);
  if (!record) return undefined;

  record.status = 'error';
  record.error = typeof error === 'string' ? error : error.message;
  record.updatedAt = Date.now();

  registry.set(taskId, record);
  return record;
};

export const getTaskById = (taskId: string): TtsTaskRecord | undefined => {
  cleanupExpired();
  return registry.get(taskId);
};

export const listTasks = (): TtsTaskRecord[] => {
  cleanupExpired();
  return Array.from(registry.values()).sort((a, b) => b.updatedAt - a.updatedAt);
};
