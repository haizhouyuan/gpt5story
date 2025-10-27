import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app';

let app: ReturnType<typeof createApp>;

describe('Detective story API', () => {
  beforeEach(() => {
    app = createApp();
  });

  it('responds to health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('generates a short detective story', async () => {
    const res = await request(app)
      .post('/api/generate-story')
      .send({ topic: '霧夜古堡', historyContent: '', turnIndex: 0 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.story).toBeDefined();
    expect(res.body.data.traceId).toBeDefined();
  });
});
