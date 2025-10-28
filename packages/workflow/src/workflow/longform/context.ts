import { v4 as uuid } from 'uuid';
import type { WorkflowEventListener, WorkflowEventBus } from '../../events/workflowEventBus.js';
import type { LlmExecutor } from '../../llm/provider.js';
import type {
  LongformStageId,
  LongformStageResultMap,
  LongformStageResult,
  LongformStageState,
  LongformWorkflowTelemetry,
  LongformStageEvent,
} from './types.js';

export interface LongformArtifactStore {
  save<K extends LongformStageId>(stage: K, result: LongformStageResult<K>): void;
  get<K extends LongformStageId>(stage: K): LongformStageResult<K> | undefined;
  dump(): Partial<LongformStageResultMap>;
}

export class MemoryArtifactStore implements LongformArtifactStore {
  private readonly artifacts = new Map<LongformStageId, LongformStageResult<LongformStageId>>();

  save<K extends LongformStageId>(stage: K, result: LongformStageResult<K>) {
    this.artifacts.set(stage, result as LongformStageResult<LongformStageId>);
  }

  get<K extends LongformStageId>(stage: K): LongformStageResult<K> | undefined {
    return this.artifacts.get(stage) as LongformStageResult<K> | undefined;
  }

  dump(): Partial<LongformStageResultMap> {
    const out: Partial<LongformStageResultMap> = {};
    for (const [stage, value] of this.artifacts.entries()) {
      (out as Record<LongformStageId, unknown>)[stage] = value;
    }
    return out;
  }
}

export interface LongformRuntimeContext {
  readonly traceId: string;
  readonly llm: LlmExecutor;
  readonly artifacts: LongformArtifactStore;
  readonly bus: WorkflowEventBus<LongformStageId>;
  readonly createdAt: Date;
}

export interface LongformStageRuntime extends LongformRuntimeContext {
  emit(event: Omit<LongformStageEvent, 'timestamp'> & { timestamp?: string }): void;
}

export interface LongformWorkflowContextOptions {
  artifacts?: LongformArtifactStore;
  bus?: WorkflowEventBus<LongformStageId>;
}

export class LongformWorkflowContext implements LongformRuntimeContext {
  readonly traceId = uuid();

  readonly createdAt = new Date();

  readonly artifacts: LongformArtifactStore;

  readonly bus: WorkflowEventBus<LongformStageId>;

  constructor(readonly llm: LlmExecutor, options: LongformWorkflowContextOptions) {
    this.artifacts = options.artifacts ?? new MemoryArtifactStore();
    this.bus = options.bus ?? new WorkflowEventBus<LongformStageId>();
  }

  createStageRuntime(): LongformStageRuntime {
    return {
      traceId: this.traceId,
      createdAt: this.createdAt,
      llm: this.llm,
      artifacts: this.artifacts,
      bus: this.bus,
      emit: (event) => this.bus.emit(event),
    };
  }

  attachListener(listener: WorkflowEventListener<LongformStageId>) {
    return this.bus.subscribe(listener);
  }

  toTelemetry(): LongformWorkflowTelemetry {
    return {
      events: this.bus.list(),
    };
  }
}

export const createInitialStageStates = (stageIds: LongformStageId[]): LongformStageState[] =>
  stageIds.map((stage) => ({ stage, status: 'pending', attempts: 0 }));
