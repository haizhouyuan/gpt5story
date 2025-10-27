import express, { type Request, type Response, type NextFunction } from 'express';
import cors, { type CorsOptions } from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import {
  storyWorkflowRequestSchema,
  storyWorkflowResponseSchema,
  type StoryWorkflowRequest,
} from '@gpt5story/shared';
import { createStoryWorkflow } from '@gpt5story/workflow';

export interface CreateAppOptions {
  cors?: CorsOptions;
}

export const createApp = (options: CreateAppOptions = {}) => {
  const app = express();
  const workflow = createStoryWorkflow();

  const generateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: Number.parseInt(process.env.GPT5STORY_RATE_LIMIT ?? '10', 10),
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(cors(options.cors ?? {}));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'GPT-5 Detective Story API ready' });
  });

  app.post('/api/generate-story', generateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    const parsedInput = storyWorkflowRequestSchema.safeParse(req.body);
    if (!parsedInput.success) {
      return res.status(400).json({ success: false, error: 'INVALID_REQUEST', details: parsedInput.error.flatten() });
    }

    const payload: StoryWorkflowRequest = parsedInput.data;

    if (containsBannedKeyword(payload.topic)) {
      return res.status(400).json({ success: false, error: 'CONTENT_VIOLATION', message: 'topic_contains_restricted_content' });
    }

    try {
      const execution = await workflow.invoke({ ...payload, turnIndex: 0 });
      const parsed = storyWorkflowResponseSchema.parse(execution.response);
      const traceId = parsed.traceId ?? uuid();

      return res.json({
        success: true,
        data: {
          traceId,
          story: execution.response.segment.content,
          outline: execution.outline,
          reviewNotes: execution.reviewNotes,
          revisionPlan: execution.revisionPlan,
          validationReport: execution.validationReport,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'INVALID_RESPONSE', details: error.flatten() });
      }
      return next(error);
    }
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
