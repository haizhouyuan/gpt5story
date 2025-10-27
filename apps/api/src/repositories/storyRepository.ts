import type { StorySnapshot } from '@gpt5story/shared';
import type { Collection } from 'mongodb';
import { getCollection } from '../config/db.js';

const COLLECTION_NAME = 'stories';

export const insertStory = async (snapshot: StorySnapshot) => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<StorySnapshot>;
  await col.insertOne(snapshot as StorySnapshot);
};

export const listStories = async (): Promise<StorySnapshot[]> => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<StorySnapshot>;
  return col
    .find({}, { sort: { createdAt: -1 } })
    .toArray();
};

export const getStoryById = async (id: string): Promise<StorySnapshot | null> => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<StorySnapshot>;
  return col.findOne({ id });
};

export const deleteStoryById = async (id: string): Promise<boolean> => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<StorySnapshot>;
  const res = await col.deleteOne({ id });
  return res.deletedCount === 1;
};

export const clearStories = async () => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<StorySnapshot>;
  await col.deleteMany({});
};
