import { v4 as uuid } from 'uuid';
import type {
  StoryWorkflowRequest,
  StoryWorkflowResponse,
  StoryOutlinePlan,
  StoryReviewNote,
  StoryRevisionPlan,
  DetectiveOutline,
  StoryDraft,
  ValidationReport,
  RevisionPlanSummary,
  WorkflowStageState,
  WorkflowTelemetry,
  StageLog,
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
  detectiveOutline: DetectiveOutline;
  draft: StoryDraft;
  reviewNotes: StoryReviewNote[];
  validationReport: ValidationReport;
  revisionPlan: StoryRevisionPlan;
  revisionSummary: RevisionPlanSummary;
  stageStates: WorkflowStageState[];
  telemetry: WorkflowTelemetry;
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
    const stageSequence: WorkflowStageEvent['stage'][] = ['planning', 'drafting', 'review', 'revision'];
    const stageStates: WorkflowStageState[] = stageSequence.map((stage) => ({
      stage,
      status: 'pending',
    }));
    const stageLogs: StageLog[] = [];
    const stageTimers = new Map<string, number>();

    const unsubscribe = this.bus.subscribe((event) => {
      const state = stageStates.find((item) => item.stage === event.stage);
      if (!state) {
        return;
      }
      if (event.status === 'start') {
        state.status = 'running';
        state.startedAt = event.timestamp;
        stageTimers.set(event.stage, Number.isNaN(Date.parse(event.timestamp)) ? Date.now() : Date.parse(event.timestamp));
        return;
      }
      state.status = event.status === 'error' ? 'failed' : 'completed';
      state.finishedAt = event.timestamp;
      if (state.status === 'failed') {
        state.errorMessage = event.message;
      }
      const startMs = stageTimers.get(event.stage)
        ?? (state.startedAt ? (Number.isNaN(Date.parse(state.startedAt)) ? Date.now() : Date.parse(state.startedAt)) : Date.now());
      const endMs = Number.isNaN(Date.parse(event.timestamp)) ? Date.now() : Date.parse(event.timestamp);
      const durationMs = Math.max(endMs - startMs, 0);
      stageTimers.delete(event.stage);

      stageLogs.push({
        stage: event.stage,
        stageId: event.stage,
        durationMs,
        notes: event.message ? [event.message] : undefined,
        meta: event.meta,
        timestamp: event.timestamp,
      });
    });

    const stage1 = await runStage1Planning(ctx);
    const stage2 = await runStage2Drafting(ctx, stage1);
    const stage3 = await runStage3Review(ctx, stage1, stage2);
    const stage4 = await runStage4Revision(ctx, stage2, stage3);
    unsubscribe();

    const response: StoryWorkflowResponse = {
      segment: stage4.finalSegment,
      traceId: ctx.traceId,
    };
    const telemetry: WorkflowTelemetry = {
      stages: stageLogs,
    };

    return {
      response,
      outline: stage1.outline,
      detectiveOutline: stage1.detectiveOutline,
      draft: stage2.draft,
      reviewNotes: stage3.reviewNotes,
      validationReport: stage3.validationReport,
      revisionPlan: stage4.revisionPlan,
      revisionSummary: stage4.revisionSummary,
      stageStates,
      telemetry,
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
