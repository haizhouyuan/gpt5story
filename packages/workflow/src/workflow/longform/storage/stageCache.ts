import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type {
  LongformStageId,
  LongformStageResultMap,
  LongformStageResult,
} from '../types.js';

const cacheDir = () => process.env.GPT5STORY_LONGFORM_CACHE;

const stageCacheSchema = z.object({
  traceId: z.string(),
  stage: z.string(),
  timestamp: z.string(),
  data: z.any(),
});

export const hasCacheConfigured = () => Boolean(cacheDir());

const getStageFilePath = (traceId: string, stage: LongformStageId) => {
  const root = cacheDir();
  if (!root) return undefined;
  return path.resolve(root, `${traceId}_${stage}.json`);
};

export const writeStageCache = async <K extends LongformStageId>(
  traceId: string,
  stage: K,
  payload: LongformStageResult<K>,
): Promise<void> => {
  const root = cacheDir();
  if (!root) return;
  await fs.promises.mkdir(root, { recursive: true });
  const filePath = getStageFilePath(traceId, stage);
  if (!filePath) return;
  const record = {
    traceId,
    stage,
    timestamp: new Date().toISOString(),
    data: payload,
  };
  await fs.promises.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
};

export const readStageCache = async <K extends LongformStageId>(
  traceId: string,
  stage: K,
): Promise<LongformStageResult<K> | undefined> => {
  const filePath = getStageFilePath(traceId, stage);
  if (!filePath) return undefined;
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    const parsed = stageCacheSchema.parse(JSON.parse(raw));
    if (parsed.traceId !== traceId || parsed.stage !== stage) {
      return undefined;
    }
    return parsed.data as LongformStageResult<K>;
  } catch {
    return undefined;
  }
};

export const readAllStageCache = async (
  traceId: string,
): Promise<Partial<LongformStageResultMap>> => {
  const root = cacheDir();
  if (!root) return {};
  try {
    const files = await fs.promises.readdir(root);
    const prefix = `${traceId}_`;
    const entries = await Promise.all(files
      .filter((file) => file.startsWith(prefix) && file.endsWith('.json'))
      .map(async (file) => {
        const filePath = path.join(root, file);
        try {
          const raw = await fs.promises.readFile(filePath, 'utf-8');
          const parsed = stageCacheSchema.parse(JSON.parse(raw));
          return parsed;
        } catch {
          return undefined;
        }
      }));
    const result: Partial<LongformStageResultMap> = {};
    for (const entry of entries) {
      if (!entry) continue;
      const stage = entry.stage as LongformStageId;
      (result as Record<LongformStageId, unknown>)[stage] = entry.data;
    }
    return result;
  } catch {
    return {};
  }
};

export const clearTraceCache = async (traceId: string): Promise<void> => {
  const root = cacheDir();
  if (!root) return;
  try {
    const files = await fs.promises.readdir(root);
    await Promise.all(files
      .filter((file) => file.startsWith(`${traceId}_`) && file.endsWith('.json'))
      .map((file) => fs.promises.unlink(path.join(root, file))));
  } catch {
    // ignore
  }
};
