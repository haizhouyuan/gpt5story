import type {
  StoryOutlinePlan,
  StoryReviewNote,
  StoryRevisionPlan,
  StoryWorkflowRequest,
  StorySegment,
  DetectiveOutline,
  StoryDraft,
  ValidationReport,
  RevisionPlanSummary,
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
  detectiveOutline: DetectiveOutline;
}

export interface Stage2Result {
  segment: StorySegment;
  rawDraft: string;
  draft: StoryDraft;
}

export interface Stage3Result {
  reviewNotes: StoryReviewNote[];
  validationReport: ValidationReport;
}

export interface Stage4Result {
  revisionPlan: StoryRevisionPlan;
  finalSegment: StorySegment;
  revisionSummary: RevisionPlanSummary;
}
