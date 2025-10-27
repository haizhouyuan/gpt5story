import { MongoClient, Collection } from 'mongodb';

const DEFAULT_DB_NAME = 'gpt5story';

let clientPromise: Promise<MongoClient> | null = null;

const getMongoUri = (): string | null => {
  return process.env.MONGODB_URI ?? null;
};

const createClient = async (): Promise<MongoClient> => {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }
  const client = new MongoClient(uri, { maxPoolSize: 5 });
  await client.connect();
  return client;
};

const getClient = async (): Promise<MongoClient> => {
  if (!clientPromise) {
    clientPromise = createClient();
  }
  return clientPromise;
};

export const getCollection = async (collectionName: string): Promise<Collection> => {
  const client = await getClient();
  const dbName = process.env.MONGODB_DB ?? DEFAULT_DB_NAME;
  const db = client.db(dbName);
  return db.collection(collectionName);
};

export const closeClient = async () => {
  if (clientPromise) {
    const client = await clientPromise;
    await client.close();
    clientPromise = null;
  }
};
