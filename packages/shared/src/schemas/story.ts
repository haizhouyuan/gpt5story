import { z } from 'zod';

export const storyChoiceSchema = z.object({
  text: z.string().min(1, 'choice text is required'),
  intent: z.string().optional(),
});

export const storySegmentSchema = z.object({
  content: z.string().min(10, 'story content too short'),
  isEnding: z.boolean(),
  choices: z.array(storyChoiceSchema).min(0).max(3),
});

export const storyActOutlineSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  beats: z.array(z.string().min(1)).min(1),
});

export const storyCluePlanSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  payoff: z.string().min(1),
  foreshadowingBeat: z.string().optional(),
});

export const storyMisdirectionPlanSchema = z.object({
  id: z.string().min(1),
  technique: z.string().min(1),
  description: z.string().min(1),
  resolution: z.string().min(1),
});

export const storyOutlinePlanSchema = z.object({
  topic: z.string().min(1),
  acts: z.array(storyActOutlineSchema).min(1),
  clues: z.array(storyCluePlanSchema),
  misdirections: z.array(storyMisdirectionPlanSchema),
  tone: z.string().optional(),
  targetAudience: z.string().optional(),
});

export const storyReviewNoteSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(['info', 'warn', 'error']),
  message: z.string().min(1),
  chapterRef: z.string().optional(),
  ruleId: z.string().optional(),
});

export const storyRevisionPlanSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  actions: z.array(z.string().min(1)).min(1),
});

export const storyTreeNodeSchema: z.ZodType<any> = z.lazy(() => z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  choices: z.array(z.object({
    label: z.string().min(1),
    nextId: z.string().min(1),
  })).max(3),
  ending: z.boolean().optional(),
  children: z.array(storyTreeNodeSchema).optional(),
}));

export const storyTreeSchema = z.object({
  topic: z.string().min(1),
  root: storyTreeNodeSchema,
  meta: z.record(z.unknown()).optional(),
});

export const storyWorkflowMetadataSchema = z.object({
  topic: z.string().min(1, 'topic is required'),
  turnIndex: z.number().int().nonnegative(),
  maxTurns: z.number().int().positive().optional(),
});

export const storyWorkflowRequestSchema = storyWorkflowMetadataSchema.extend({
  historyContent: z.string().default(''),
  selectedChoice: z.string().optional(),
});

export const storyWorkflowResponseSchema = z.object({
  segment: storySegmentSchema,
  traceId: z.string().optional(),
});

export const storySnapshotSchema = z.object({
  id: z.string(),
  topic: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.string().min(1),
  traceId: z.string().optional(),
  segments: z.array(storySegmentSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const saveStoryRequestSchema = z.object({
  topic: z.string().min(1, 'topic is required'),
  content: z.string().min(20, 'content too short'),
  traceId: z.string().optional(),
  segments: z.array(storySegmentSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const saveStoryResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
});

export const ttsSynthesisRequestSchema = z.object({
  text: z.string().min(1, 'text is required'),
  voiceId: z.string().optional(),
  speed: z.number().min(0.5).max(2).optional(),
  pitch: z.number().min(0.5).max(2).optional(),
});

export const ttsSynthesisResponseSchema = z.object({
  audioUrl: z.string().url(),
  format: z.string().default('audio/mpeg'),
  durationMs: z.number().nonnegative(),
  provider: z.string(),
  traceId: z.string().optional(),
});

export type StoryChoiceSchema = z.infer<typeof storyChoiceSchema>;
export type StorySegmentSchema = z.infer<typeof storySegmentSchema>;
export type StoryWorkflowRequestSchema = z.infer<typeof storyWorkflowRequestSchema>;
export type StoryWorkflowResponseSchema = z.infer<typeof storyWorkflowResponseSchema>;
export type StoryActOutlineSchema = z.infer<typeof storyActOutlineSchema>;
export type StoryCluePlanSchema = z.infer<typeof storyCluePlanSchema>;
export type StoryMisdirectionPlanSchema = z.infer<typeof storyMisdirectionPlanSchema>;
export type StoryOutlinePlanSchema = z.infer<typeof storyOutlinePlanSchema>;
export type StoryReviewNoteSchema = z.infer<typeof storyReviewNoteSchema>;
export type StoryRevisionPlanSchema = z.infer<typeof storyRevisionPlanSchema>;
export type StoryTreeNodeSchema = z.infer<typeof storyTreeNodeSchema>;
export type StoryTreeSchema = z.infer<typeof storyTreeSchema>;
export type StorySnapshotSchema = z.infer<typeof storySnapshotSchema>;
export type SaveStoryRequestSchema = z.infer<typeof saveStoryRequestSchema>;
export type SaveStoryResponseSchema = z.infer<typeof saveStoryResponseSchema>;
export type TtsSynthesisRequestSchema = z.infer<typeof ttsSynthesisRequestSchema>;
export type TtsSynthesisResponseSchema = z.infer<typeof ttsSynthesisResponseSchema>;
