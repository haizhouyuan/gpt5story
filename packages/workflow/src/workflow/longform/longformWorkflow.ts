import { LlmProvider, type LlmExecutor } from '../../llm/provider.js';
import type { WorkflowEventListener } from '../../events/workflowEventBus.js';
import { WorkflowEventBus } from '../../events/workflowEventBus.js';
import {
  LONGFORM_STAGE_SEQUENCE,
  type LongformStageId,
  type LongformStageResultMap,
  type LongformStageState,
  type LongformWorkflowResult,
  type LongformWorkflowRequest,
  type LongformStageEvent,
  type LongformStageConfig,
} from './types.js';
import {
  LongformWorkflowContext,
  MemoryArtifactStore,
  CachedArtifactStore,
  type LongformArtifactStore,
} from './context.js';
import {
  buildDefaultRegistry,
  mergeRegistry,
  type LongformStageRegistry,
} from './stages.js';
import { buildLongformGraph } from './langGraphBuilder.js';
import { appendQaBoardEntry } from './qaBoard.js';
import { getQaBoardRoot } from './config.js';
import {
  hasCacheConfigured,
  readAllStageCache,
} from './storage/stageCache.js';
import { v4 as uuid } from 'uuid';

export interface LongformWorkflowOptions {
  stageExecutors?: Partial<LongformStageRegistry>;
  stageConfigs?: Partial<Record<LongformStageId, Partial<LongformStageConfig>>>;
  llm?: LlmExecutor;
  artifactStore?: LongformArtifactStore;
  bus?: WorkflowEventBus<LongformStageId>;
  onEvent?: WorkflowEventListener<LongformStageId>;
}

const DEFAULT_STAGE_META: Record<LongformStageId, LongformStageConfig> = {
  stage0ProjectInit: { id: 'stage0ProjectInit', label: 'Stage0 · Project Init', retryAttempts: 2 },
  stage1MiracleBlueprint: { id: 'stage1MiracleBlueprint', label: 'Stage1 · Miracle Blueprint', retryAttempts: 2, dependsOn: ['stage0ProjectInit'] },
  stage2aCastAndProps: { id: 'stage2aCastAndProps', label: 'Stage2A · Cast & Props', retryAttempts: 2, dependsOn: ['stage1MiracleBlueprint'] },
  stage2bClueMatrix: { id: 'stage2bClueMatrix', label: 'Stage2B · Clue Matrix', retryAttempts: 2, dependsOn: ['stage2aCastAndProps'] },
  stage3Structure: { id: 'stage3Structure', label: 'Stage3 · Structure Plan', retryAttempts: 2, dependsOn: ['stage2bClueMatrix'] },
  stage4SceneCards: { id: 'stage4SceneCards', label: 'Stage4 · Scene Cards', retryAttempts: 2, dependsOn: ['stage3Structure'] },
  stage5LongformDraft: { id: 'stage5LongformDraft', label: 'Stage5 · Longform Draft', retryAttempts: 1, dependsOn: ['stage4SceneCards'] },
  stage6Review: { id: 'stage6Review', label: 'Stage6 · Review', retryAttempts: 1, dependsOn: ['stage5LongformDraft'] },
  stage7Polish: { id: 'stage7Polish', label: 'Stage7 · Polish', retryAttempts: 1, dependsOn: ['stage6Review'] },
  qualityGateEvaluation: { id: 'qualityGateEvaluation', label: 'Quality Gate Evaluation', retryAttempts: 1, dependsOn: ['stage7Polish'] },
};

const mergeStageConfigs = (
  overrides?: Partial<Record<LongformStageId, Partial<LongformStageConfig>>>,
): Record<LongformStageId, LongformStageConfig> => {
  if (!overrides) return DEFAULT_STAGE_META;
  const merged: Record<LongformStageId, LongformStageConfig> = { ...DEFAULT_STAGE_META };
  for (const stageId of LONGFORM_STAGE_SEQUENCE) {
    if (overrides[stageId]) {
      merged[stageId] = { ...merged[stageId], ...overrides[stageId], id: stageId };
    }
  }
  return merged;
};

export class LongformStageExecutionError extends Error {
  constructor(
    readonly stage: LongformStageId,
    readonly state: LongformStageState,
    readonly artifacts: Partial<LongformStageResultMap>,
    readonly traceId: string,
    cause?: unknown,
  ) {
    const message = `Stage ${stage} failed: ${state.errorMessage ?? 'unknown error'}`;
    super(message);
    (this as Error & { cause?: unknown }).cause = cause;
    this.name = 'LongformStageExecutionError';
  }
}

export class LongformWorkflowEngine {
  private readonly registry: LongformStageRegistry;

  private readonly stageConfigs: Record<LongformStageId, LongformStageConfig>;

  private readonly llmExecutor: LlmExecutor;

  private readonly artifactStore: LongformArtifactStore;

  private readonly bus: WorkflowEventBus<LongformStageId>;

  private readonly teardown?: () => void;

  constructor(private readonly options: LongformWorkflowOptions = {}) {
    this.registry = mergeRegistry(buildDefaultRegistry(), options.stageExecutors);
    this.stageConfigs = mergeStageConfigs(options.stageConfigs);
    this.llmExecutor = options.llm ?? new LlmProvider();
    this.artifactStore = options.artifactStore ?? new MemoryArtifactStore();
    this.bus = options.bus ?? new WorkflowEventBus<LongformStageId>();
    this.teardown = options.onEvent ? this.bus.subscribe(options.onEvent) : undefined;
  }

  private async syncQaBoardIfConfigured(
    context: LongformWorkflowContext,
    stageStates: LongformStageState[],
    artifacts: Partial<LongformStageResultMap>,
  ): Promise<void> {
    const qaRoot = getQaBoardRoot();
    if (!qaRoot) {
      return;
    }

    const projectCard = artifacts.stage0ProjectInit;
    const review = artifacts.stage6Review;
    const evaluation = artifacts.qualityGateEvaluation;
    const polished = artifacts.stage7Polish;

    if (!projectCard || !review || !evaluation || !polished) {
      return;
    }

    const stage5State = stageStates.find((item) => item.stage === 'stage5LongformDraft');
    const stage6State = stageStates.find((item) => item.stage === 'stage6Review');

    const entry = {
      traceId: context.traceId,
      projectId: projectCard.projectId,
      createdAt: context.createdAt.toISOString(),
      titleCandidates: projectCard.titleCandidates,
      stage5Attempts: stage5State?.attempts ?? 0,
      stage6Attempts: stage6State?.attempts ?? 0,
      autoRevisionRounds: Math.max((stage5State?.attempts ?? 1) - 1, 0),
      reviewMustFix: review.mustFix.length,
      reviewWarnings: review.warnings.length,
      reviewMustFixDetail: review.mustFix,
      reviewWarningsDetail: review.warnings,
      totalWordCount: polished.finalDraft.totalWordCount,
      chapterCount: polished.finalDraft.chapters.length,
      evaluation,
      markdownPath: polished.markdownPath,
    } satisfies Parameters<typeof appendQaBoardEntry>[1];

    await appendQaBoardEntry(qaRoot, entry);
  }

  async invoke(requestInput: LongformWorkflowRequest): Promise<LongformWorkflowResult> {
    const providedTraceId = requestInput.traceId;
    const traceId = providedTraceId ?? uuid();
    const shouldLoadCache = (requestInput.resumeFromCache ?? true) && hasCacheConfigured();
    const cachedArtifacts = shouldLoadCache ? await readAllStageCache(traceId).catch(() => ({})) : {};
    const initialArtifacts = {
      ...cachedArtifacts,
      ...(requestInput.overrides ?? {}),
    } as Partial<LongformStageResultMap>;

    const request: LongformWorkflowRequest = {
      ...requestInput,
      traceId,
      resumeFromCache: shouldLoadCache && Object.keys(cachedArtifacts).length > 0,
      overrides: initialArtifacts,
    };

    const baseStore = this.options.artifactStore
      ?? (hasCacheConfigured()
        ? new CachedArtifactStore(traceId, initialArtifacts)
        : new MemoryArtifactStore(initialArtifacts));
    if (this.options.artifactStore && Object.keys(initialArtifacts).length > 0) {
      for (const [stage, value] of Object.entries(initialArtifacts) as Array<[
        LongformStageId,
        LongformStageResultMap[keyof LongformStageResultMap],
      ]>) {
        if (value !== undefined) {
          baseStore.save(stage, value as never);
        }
      }
    }

    const context = new LongformWorkflowContext(this.llmExecutor, {
      artifacts: baseStore,
      bus: this.bus,
      traceId,
      initialArtifacts: Object.keys(initialArtifacts).length > 0 ? initialArtifacts : undefined,
    });

    const graph = buildLongformGraph({ request, executors: this.registry, context, stageConfigs: this.stageConfigs });
    const compiled = graph.compile();

    try {
      await compiled.invoke({});
    } catch (error) {
      const telemetry = context.toTelemetry();
      const stageStates = deriveStageStates(telemetry.events);
      const artifacts = context.artifacts.dump();

      await this.syncQaBoardIfConfigured(context, stageStates, artifacts).catch(() => undefined);

      const lastErrorEvent = [...telemetry.events].reverse().find((event) => event.status === 'error');
      const failedStageId = lastErrorEvent?.stage ?? 'qualityGateEvaluation';
      const failedStageState = stageStates.find((item) => item.stage === failedStageId)
        ?? { stage: failedStageId, status: 'failed', attempts: 0 } as LongformStageState;

      throw new LongformStageExecutionError(
        failedStageId,
        failedStageState,
        artifacts,
        context.traceId,
        error,
      );
    }

    const telemetry = context.toTelemetry();
    const stageStates = deriveStageStates(telemetry.events);
    const artifacts = context.artifacts.dump();

    await this.syncQaBoardIfConfigured(context, stageStates, artifacts).catch(() => undefined);

    return {
      traceId: context.traceId,
      createdAt: context.createdAt.toISOString(),
      stages: stageStates,
      artifacts,
      telemetry,
    };
  }

  dispose() {
    this.teardown?.();
  }
}

export const createLongformWorkflow = (options: LongformWorkflowOptions = {}) => new LongformWorkflowEngine(options);

const deriveStageStates = (events: LongformStageEvent[]): LongformStageState[] => {
  return LONGFORM_STAGE_SEQUENCE.map((stage) => {
    const stageEvents = events.filter((event) => event.stage === stage);
    if (stageEvents.length === 0) {
      return { stage, status: 'pending', attempts: 0 };
    }

    const startEvents = stageEvents.filter((event) => event.status === 'start');
    const successEvents = stageEvents.filter((event) => event.status === 'success');
    const errorEvents = stageEvents.filter((event) => event.status === 'error');

    const attempts = Math.max(startEvents.length, successEvents.length + errorEvents.length, 0);
    const lastEvent = stageEvents[stageEvents.length - 1];
    const status: LongformStageState['status'] = lastEvent.status === 'error'
      ? 'failed'
      : lastEvent.status === 'success'
        ? 'completed'
        : 'running';

    const startedAt = startEvents[0]?.timestamp;
    const terminalEvent = errorEvents.length > 0
      ? errorEvents[errorEvents.length - 1]
      : successEvents[successEvents.length - 1];
    const finishedAt = terminalEvent?.timestamp;
    const errorMessage = status === 'failed' && errorEvents.length > 0
      ? errorEvents[errorEvents.length - 1]?.message
      : undefined;

    return {
      stage,
      status,
      attempts,
      startedAt,
      finishedAt,
      errorMessage,
    } satisfies LongformStageState;
  });
};
