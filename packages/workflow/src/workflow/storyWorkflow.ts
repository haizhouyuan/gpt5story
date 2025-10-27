import { v4 as uuid } from 'uuid';
import type {
  StoryWorkflowRequest,
  StoryWorkflowResponse,
  StoryOutlinePlan,
  StoryReviewNote,
  StoryRevisionPlan,
} from '@gpt5story/shared';
import { storyWorkflowRequestSchema } from '@gpt5story/shared';
import { buildMemoryContext } from '../memory/storyMemory.js';
import { LlmProvider, type LlmExecutor } from '../llm/provider.js';
import { WorkflowEventBus } from '../events/workflowEventBus.js';
import type { WorkflowStageEvent, WorkflowEventListener } from '../events/workflowEventBus.js';
import { runStage1Planning } from './stages/stage1Planning.js';
import { runStage2Drafting } from './stages/stage2Drafting.js';
import { runStage3Review } from './stages/stage3Review.js';
import { runStage4Revision } from './stages/stage4Revision.js';
import type { BaseStageContext } from './stages/types.js';

class FallbackLlmProvider implements LlmExecutor {
  async plan(): Promise<string> {
    return ['設置場景並呼應既有伏筆', '引入衝突或挑戰', '留下懸念引導選擇'].join('\n');
  }

  async draft(prompt: { user: string }): Promise<string> {
    return `${prompt.user}\n\n（此段內容為占位草稿，等待真實模型接入後生成。）`;
  }
}

const resolveLlmProvider = (override?: LlmExecutor): LlmExecutor => {
  if (override) return override;
  try {
    return new LlmProvider();
  } catch (error) {
    return new FallbackLlmProvider();
  }
};

const validateRequest = (input: StoryWorkflowRequest): StoryWorkflowRequest =>
  storyWorkflowRequestSchema.parse(input);

const prepareStageContext = (
  request: StoryWorkflowRequest,
  bus: WorkflowEventBus,
  llm: LlmExecutor,
): BaseStageContext => ({
  request,
  memory: buildMemoryContext(request.historyContent),
  traceId: uuid(),
  bus,
  llm,
});

export interface WorkflowExecutionResult {
  response: StoryWorkflowResponse;
  outline: StoryOutlinePlan;
  reviewNotes: StoryReviewNote[];
  revisionPlan: StoryRevisionPlan;
  events: WorkflowStageEvent[];
}

export interface StoryWorkflowEngineOptions {
  onEvent?: WorkflowEventListener;
}

export interface StoryWorkflowEngine {
  invoke(request: StoryWorkflowRequest): Promise<WorkflowExecutionResult>;
  getEvents(): WorkflowStageEvent[];
}

class StoryWorkflowEngineImpl implements StoryWorkflowEngine {
  private readonly bus = new WorkflowEventBus();

  private readonly llm: LlmExecutor;

  constructor(private readonly overrideLlm?: LlmExecutor, options?: StoryWorkflowEngineOptions) {
    this.llm = resolveLlmProvider(overrideLlm);
    if (options?.onEvent) {
      this.bus.subscribe(options.onEvent);
    }
  }

  async invoke(requestInput: StoryWorkflowRequest): Promise<WorkflowExecutionResult> {
    this.bus.clear();
    const request = validateRequest(requestInput);
    const ctx = prepareStageContext(request, this.bus, this.llm);

    const stage1 = await runStage1Planning(ctx);
    const stage2 = await runStage2Drafting(ctx, stage1);
    const stage3 = await runStage3Review(ctx, stage1, stage2);
    const stage4 = await runStage4Revision(ctx, stage2, stage3);

    const response: StoryWorkflowResponse = {
      segment: stage4.finalSegment,
      traceId: ctx.traceId,
    };

    return {
      response,
      outline: stage1.outline,
      reviewNotes: stage3.reviewNotes,
      revisionPlan: stage4.revisionPlan,
      events: this.bus.list(),
    };
  }

  getEvents(): WorkflowStageEvent[] {
    return this.bus.list();
  }
}

export const createStoryWorkflow = (
  overrideLlm?: LlmExecutor,
  options?: StoryWorkflowEngineOptions,
): StoryWorkflowEngine => new StoryWorkflowEngineImpl(overrideLlm, options);
