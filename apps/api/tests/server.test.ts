import request from 'supertest';
import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { closeClient } from '../src/config/db.js';
import { clearStories } from '../src/repositories/storyRepository.js';
import { clearExecutions } from '../src/repositories/workflowRepository.js';
import { clearModelConfig } from '../src/repositories/modelConfigRepository.js';

let app: ReturnType<typeof createApp>;
let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
});

beforeEach(() => {
  app = createApp();
});

afterEach(async () => {
  await clearStories();
  await clearExecutions();
  await clearModelConfig();
});

afterAll(async () => {
  await closeClient();
  await mongo.stop();
});

describe('API routes', () => {
  it('responds to health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('generates a story segment', async () => {
    const res = await request(app)
      .post('/api/generate-story')
      .send({ topic: '魔法森林歷險記', turnIndex: 0, historyContent: '' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.segment).toBeDefined();
    expect(res.body.meta.outline).toBeDefined();
    expect(res.body.meta.events.length).toBeGreaterThan(0);

    const traceId = res.body.data.traceId;
    const workflowRes = await request(app).get(`/api/workflows/${traceId}`);
    expect(workflowRes.status).toBe(200);
    expect(workflowRes.body.data.traceId).toBe(traceId);
  });

  it('saves, reads, lists and deletes a story snapshot', async () => {
    const saveRes = await request(app)
      .post('/api/save-story')
      .send({ topic: '星際冒險', content: '這是一段超過二十字的故事內容，描述孩子的冒險。' });
    expect(saveRes.status).toBe(201);
    const storyId = saveRes.body.data.id as string;
    expect(storyId).toBeDefined();

    const listRes = await request(app).get('/api/get-stories');
    expect(listRes.body.data).toHaveLength(1);

    const getRes = await request(app).get(`/api/get-story/${storyId}`);
    expect(getRes.body.data.id).toBe(storyId);

    const deleteRes = await request(app).delete(`/api/delete-story/${storyId}`);
    expect(deleteRes.status).toBe(200);

    const afterDelete = await request(app).get(`/api/get-story/${storyId}`);
    expect(afterDelete.status).toBe(404);
  });

  it('returns mock TTS audio data', async () => {
    const res = await request(app)
      .post('/api/tts')
      .send({ text: '請轉換成語音的句子。' });
    expect(res.status).toBe(200);
    expect(res.body.data.audioUrl).toMatch(/^data:audio\//);
    expect(res.body.data.provider).toBeDefined();
    expect(res.body.data.durationMs).toBeGreaterThan(0);
  });

  it('lists workflows and model configuration', async () => {
    const res = await request(app)
      .post('/api/generate-story')
      .send({ topic: '森林調查', turnIndex: 0, historyContent: '' });
    expect(res.status).toBe(200);

    const list = await request(app).get('/api/workflows');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);

    const models = await request(app).get('/api/models');
    expect(models.status).toBe(200);

    const updated = await request(app)
      .put('/api/models')
      .send({ planningModel: 'custom/planning', temperaturePlanning: 0.3 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.planningModel).toBe('custom/planning');
  });

  it('creates and retries workflow via management endpoints', async () => {
    const createRes = await request(app)
      .post('/api/workflows')
      .send({ topic: '管理端測試', turnIndex: 0, historyContent: '' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const traceId = createRes.body.data.traceId as string;
    expect(traceId).toBeDefined();
    expect(createRes.body.meta.stageStates.length).toBeGreaterThan(0);

    const activityRes = await request(app).get(`/api/workflows/${traceId}/stage-activity`);
    expect(activityRes.status).toBe(200);
    expect(activityRes.body.data.stageStates.length).toBeGreaterThan(0);

    const retryRes = await request(app)
      .post(`/api/workflows/${traceId}/retry`)
      .send({ historyContent: '', turnIndex: 0 });
    expect(retryRes.status).toBe(201);
    expect(retryRes.body.meta.retriedFrom).toBe(traceId);
  });

  it('rejects banned topics', async () => {
    const res = await request(app)
      .post('/api/generate-story')
      .send({ topic: '成人冒險故事', turnIndex: 0, historyContent: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('CONTENT_VIOLATION');
  });

  it('generates full story tree and stores record', async () => {
    const res = await request(app)
      .post('/api/generate-full-story')
      .send({ topic: '森林寶藏' });
    expect(res.status).toBe(200);
    expect(res.body.data.tree.root).toBeDefined();
    const traceId = res.body.data.traceId;
    const record = await request(app).get(`/api/workflows/${traceId}`);
    expect(record.status).toBe(200);
    expect(record.body.data.storyTree).toBeDefined();
  });

  it('creates asynchronous TTS task', async () => {
    const createRes = await request(app)
      .post('/api/tts/tasks')
      .send({ text: '請轉換這句話' });
    expect(createRes.status).toBe(202);
    const taskId = createRes.body.data.id;
    const status1 = await request(app).get(`/api/tts/tasks/${taskId}`);
    expect(status1.body.data.status).toBeDefined();
    if (status1.body.data.status === 'pending') {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const status2 = await request(app).get(`/api/tts/tasks/${taskId}`);
      expect(['success', 'error', 'pending']).toContain(status2.body.data.status);
    }
  });
});
