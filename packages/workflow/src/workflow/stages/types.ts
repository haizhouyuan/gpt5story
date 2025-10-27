import type {
  StoryOutlinePlan,
  StoryReviewNote,
  StoryRevisionPlan,
  StoryWorkflowRequest,
  StorySegment,
} from '@gpt5story/shared';
import type { StoryMemoryContext } from '../../memory/storyMemory.js';
import type { WorkflowEventBus } from '../../events/workflowEventBus.js';
import type { LlmExecutor } from '../../llm/provider.js';

export interface BaseStageContext {
  request: StoryWorkflowRequest;
  memory: StoryMemoryContext;
  traceId: string;
  bus: WorkflowEventBus;
  llm: LlmExecutor;
}

export interface Stage1Result {
  outline: StoryOutlinePlan;
  narrativeBrief: string;
}

export interface Stage2Result {
  segment: StorySegment;
  rawDraft: string;
}

export interface Stage3Result {
  reviewNotes: StoryReviewNote[];
}

export interface Stage4Result {
  revisionPlan: StoryRevisionPlan;
  finalSegment: StorySegment;
}
