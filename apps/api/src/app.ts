import express, { type Request, type Response, type NextFunction } from 'express';
import cors, { type CorsOptions } from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  storyWorkflowRequestSchema,
  storyWorkflowResponseSchema,
  saveStoryRequestSchema,
  saveStoryResponseSchema,
  ttsSynthesisRequestSchema,
  ttsSynthesisResponseSchema,
  type StorySnapshot,
  type StoryWorkflowRequest,
} from '@gpt5story/shared';
import { createStoryWorkflow, createStoryTreeWorkflow } from '@gpt5story/workflow';
import { v4 as uuid } from 'uuid';
import {
  insertStory,
  listStories,
  getStoryById,
  deleteStoryById,
} from './repositories/storyRepository.js';
import {
  insertExecution,
  listExecutions,
  getExecutionByTraceId,
} from './repositories/workflowRepository.js';
import {
  getModelConfig,
  updateModelConfig,
} from './repositories/modelConfigRepository.js';
import {
  createTtsTask,
  getTtsTask,
} from './services/ttsTaskService.js';

export interface CreateAppOptions {
  cors?: CorsOptions;
}

export const createApp = (options: CreateAppOptions = {}) => {
  const app = express();
  const storyStore = new Map<string, StorySnapshot>();

  const generateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: Number.parseInt(process.env.GPT5STORY_RATE_LIMIT ?? '10', 10),
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(cors(options.cors ?? {}));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      message: 'GPT-5 Story API ready',
    });
  });

  app.post('/api/generate-story', generateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = storyWorkflowRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        details: parseResult.error.flatten(),
      });
    }

    const payload: StoryWorkflowRequest = parseResult.data;

    if (containsBannedKeyword(payload.topic)) {
      return res.status(400).json({ success: false, error: 'CONTENT_VIOLATION', message: 'topic_contains_restricted_content' });
    }

    try {
      const workflow = createStoryWorkflow();
      const execution = await workflow.invoke(payload);
      const parsed = storyWorkflowResponseSchema.parse(execution.response);

      const traceId = parsed.traceId ?? uuid();

      await insertExecution({
        traceId,
        topic: payload.topic,
        createdAt: new Date().toISOString(),
        outline: execution.outline,
        reviewNotes: execution.reviewNotes,
        revisionPlan: execution.revisionPlan,
        events: execution.events,
      });

      return res.json({
        success: true,
        data: { ...parsed, traceId },
        meta: {
          outline: execution.outline,
          reviewNotes: execution.reviewNotes,
          revisionPlan: execution.revisionPlan,
          events: execution.events,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_RESPONSE',
          details: error.flatten(),
        });
      }
      return next(error);
    }
  });

  app.get('/api/generate-story/stream', generateLimiter, async (req: Request, res: Response) => {
    const topic = String(req.query.topic ?? '');
    if (!topic) {
      return res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'topic_required' });
    }
    if (containsBannedKeyword(topic)) {
      return res.status(400).json({ success: false, error: 'CONTENT_VIOLATION', message: 'topic_contains_restricted_content' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const payload: StoryWorkflowRequest = {
      topic,
      turnIndex: Number.parseInt(String(req.query.turnIndex ?? '0'), 10) || 0,
      historyContent: String(req.query.historyContent ?? ''),
      selectedChoice: typeof req.query.selectedChoice === 'string' ? req.query.selectedChoice : undefined,
    };

    const workflow = createStoryWorkflow(undefined, {
      onEvent: (event) => {
        res.write(`data: ${JSON.stringify({ type: 'event', event })}\n\n`);
      },
    });

    try {
      const execution = await workflow.invoke(payload);
      const traceId = execution.response.traceId ?? uuid();
      await insertExecution({
        traceId,
        topic: payload.topic,
        createdAt: new Date().toISOString(),
        outline: execution.outline,
        reviewNotes: execution.reviewNotes,
        revisionPlan: execution.revisionPlan,
        events: execution.events,
      });
      res.write(`data: ${JSON.stringify({ type: 'result', data: { ...execution.response, traceId }, meta: { outline: execution.outline, reviewNotes: execution.reviewNotes, revisionPlan: execution.revisionPlan } })}\n\n`);
      res.write('event: end\n');
      res.write('data: done\n\n');
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: (error as Error)?.message ?? 'unexpected_error' })}\n\n`);
    } finally {
      res.end();
    }
  });

  app.post('/api/save-story', async (req: Request, res: Response) => {
    const parsed = saveStoryRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }

    const id = uuid();
    const createdAt = new Date().toISOString();
    const snapshot: StorySnapshot = {
      id,
      topic: parsed.data.topic,
      content: parsed.data.content,
      createdAt,
      traceId: parsed.data.traceId,
      segments: parsed.data.segments,
      metadata: parsed.data.metadata,
    };
    storyStore.set(id, snapshot);
    try {
      await insertStory(snapshot);
    } catch (error) {
      // 如果資料庫不可用，保留內存快照
    }
    const response = saveStoryResponseSchema.parse({ id, createdAt });
    return res.status(201).json({ success: true, data: response });
  });

  app.get('/api/get-stories', async (_req: Request, res: Response) => {
    try {
      const data = await listStories();
      if (!data.length && storyStore.size > 0) {
        return res.json({ success: true, data: Array.from(storyStore.values()) });
      }
      return res.json({ success: true, data });
    } catch (error) {
      return res.json({ success: true, data: Array.from(storyStore.values()) });
    }
  });

  app.get('/api/get-story/:id', async (req: Request, res: Response) => {
    const cached = storyStore.get(req.params.id);
    let story: StorySnapshot | null | undefined = cached;
    if (!story) {
      try {
        story = await getStoryById(req.params.id);
      } catch (error) {
        story = undefined;
      }
    }
    if (!story) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    return res.json({ success: true, data: story });
  });

  app.delete('/api/delete-story/:id', async (req: Request, res: Response) => {
    const existed = storyStore.delete(req.params.id);
    let deleted = existed;
    try {
      deleted = await deleteStoryById(req.params.id);
    } catch (error) {
      // ignore
    }
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    return res.json({ success: true });
  });

  app.get('/api/workflows', async (_req: Request, res: Response) => {
    try {
      const executions = await listExecutions();
      return res.json({ success: true, data: executions });
    } catch (error) {
      return res.status(503).json({ success: false, error: 'WORKFLOW_STORAGE_UNAVAILABLE', message: (error as Error)?.message });
    }
  });

  app.get('/api/workflows/:traceId', async (req: Request, res: Response) => {
    try {
      const execution = await getExecutionByTraceId(req.params.traceId);
      if (!execution) {
        return res.status(404).json({ success: false, error: 'WORKFLOW_NOT_FOUND' });
      }
      return res.json({ success: true, data: execution });
    } catch (error) {
      return res.status(503).json({ success: false, error: 'WORKFLOW_STORAGE_UNAVAILABLE', message: (error as Error)?.message });
    }
  });

  const modelConfigUpdateSchema = z.object({
    provider: z.enum(['openrouter', 'openai', 'custom']).optional(),
    planningModel: z.string().optional(),
    draftingModel: z.string().optional(),
    temperaturePlanning: z.number().min(0).max(2).optional(),
    temperatureDrafting: z.number().min(0).max(2).optional(),
  });

  app.get('/api/models', async (_req: Request, res: Response) => {
    try {
      const cfg = await getModelConfig();
      return res.json({ success: true, data: cfg });
    } catch (error) {
      return res.status(503).json({ success: false, error: 'MODEL_CONFIG_UNAVAILABLE', message: (error as Error)?.message });
    }
  });

  app.put('/api/models', async (req: Request, res: Response) => {
    const validation = modelConfigUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: 'INVALID_REQUEST', details: validation.error.flatten() });
    }
    try {
      const next = await updateModelConfig(validation.data);
      return res.json({ success: true, data: next });
    } catch (error) {
      return res.status(503).json({ success: false, error: 'MODEL_CONFIG_UNAVAILABLE', message: (error as Error)?.message });
    }
  });

  app.post('/api/generate-full-story', generateLimiter, async (req: Request, res: Response) => {
    const topic = typeof req.body.topic === 'string' ? req.body.topic : '';
    if (!topic) {
      return res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'topic_required' });
    }
    if (containsBannedKeyword(topic)) {
      return res.status(400).json({ success: false, error: 'CONTENT_VIOLATION', message: 'topic_contains_restricted_content' });
    }

    try {
      const treeWorkflow = createStoryTreeWorkflow();
      const execution = await treeWorkflow.invoke(topic);

      const traceId = uuid();
      await insertExecution({
        traceId,
        topic,
        createdAt: new Date().toISOString(),
        outline: {
          topic,
          acts: [],
          clues: [],
          misdirections: [],
        },
        reviewNotes: [],
        revisionPlan: {
          id: 'tree-default',
          summary: '一次性故事樹無需修訂',
          actions: [],
        },
        events: [],
        storyTree: execution.tree,
      });

      return res.json({ success: true, data: { traceId, tree: execution.tree } });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'TREE_GENERATION_FAILED', message: (error as Error)?.message ?? 'unexpected_error' });
    }
  });

  app.post('/api/tts', (req: Request, res: Response) => {
    const parsed = ttsSynthesisRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }

    // 模擬音頻輸出：實際上應該調用 TTS 服務
    const fakeAudioData = Buffer.from('Simulated audio output for demo', 'utf8').toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${fakeAudioData}`;
    const synthResponse = ttsSynthesisResponseSchema.parse({
      audioUrl,
      format: 'audio/mpeg',
      durationMs: Math.max(1000, parsed.data.text.length * 50),
      provider: 'mock-tts',
    });

    return res.json({ success: true, data: synthResponse });
  });

  app.get('/api/tts/voices', (_req: Request, res: Response) => {
    return res.json({
      success: true,
      data: [
        { id: 'mock-child-soft', name: '童趣柔和', gender: 'female', language: 'zh-CN' },
        { id: 'mock-storyteller', name: '故事講述者', gender: 'male', language: 'zh-CN' },
      ],
    });
  });

  app.post('/api/tts/tasks', (req: Request, res: Response) => {
    const parsed = ttsSynthesisRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    }
    const task = createTtsTask(parsed.data.text);
    return res.status(202).json({ success: true, data: task });
  });

  app.get('/api/tts/tasks/:id', (req: Request, res: Response) => {
    const task = getTtsTask(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'TASK_NOT_FOUND' });
    }
    return res.json({ success: true, data: task });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'unexpected_error';
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message });
  });

  return app;
};

const BANNED_KEYWORDS = (process.env.GPT5STORY_BANNED_KEYWORDS ?? '成人,暴力,血腥').split(',').map((w) => w.trim()).filter(Boolean);

const containsBannedKeyword = (input: string): boolean => {
  const lower = input.toLowerCase();
  return BANNED_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
};
