import type { Collection } from 'mongodb';
import { getCollection } from '../config/db.js';

export interface ModelConfig {
  id: string;
  provider: 'openrouter' | 'openai' | 'custom';
  planningModel: string;
  draftingModel: string;
  temperaturePlanning: number;
  temperatureDrafting: number;
  updatedAt: string;
}

const COLLECTION_NAME = 'model_configs';
const DOCUMENT_ID = 'default';

const defaultConfig = (): ModelConfig => ({
  id: DOCUMENT_ID,
  provider: process.env.OPENROUTER_API_KEY ? 'openrouter' : 'openai',
  planningModel: process.env.GPT5STORY_PLANNING_MODEL
    ?? (process.env.OPENROUTER_API_KEY ? 'openai/gpt-5' : 'gpt-4o-mini'),
  draftingModel: process.env.GPT5STORY_DRAFT_MODEL
    ?? (process.env.OPENROUTER_API_KEY ? 'openai/gpt-5' : 'gpt-4o-mini'),
  temperaturePlanning: Number.parseFloat(process.env.GPT5STORY_PLANNING_TEMPERATURE ?? '0.2'),
  temperatureDrafting: Number.parseFloat(process.env.GPT5STORY_DRAFT_TEMPERATURE ?? '0.7'),
  updatedAt: new Date().toISOString(),
});

export const getModelConfig = async (): Promise<ModelConfig> => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<ModelConfig>;
  const doc = await col.findOne({ id: DOCUMENT_ID });
  if (!doc) {
    const cfg = defaultConfig();
    await col.updateOne({ id: DOCUMENT_ID }, { $set: cfg }, { upsert: true });
    return cfg;
  }
  return doc;
};

export const updateModelConfig = async (partial: Partial<ModelConfig>): Promise<ModelConfig> => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<ModelConfig>;
  const current = await getModelConfig();
  const next: ModelConfig = {
    ...current,
    ...partial,
    id: DOCUMENT_ID,
    updatedAt: new Date().toISOString(),
  };
  await col.updateOne({ id: DOCUMENT_ID }, { $set: next }, { upsert: true });
  return next;
};

export const clearModelConfig = async () => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<ModelConfig>;
  await col.deleteMany({});
};
