import { v4 as uuid } from 'uuid';
import { WorkflowEventBus } from '../../events/workflowEventBus.js';
import type { WorkflowEventListener } from '../../events/workflowEventBus.js';
import type { LlmExecutor } from '../../llm/provider.js';
import type {
  LongformStageId,
  LongformStageResultMap,
  LongformStageResult,
  LongformStageState,
  LongformWorkflowTelemetry,
  LongformStageEvent,
} from './types.js';
import {
  hasCacheConfigured,
  writeStageCache,
} from './storage/stageCache.js';

export interface LongformArtifactStore {
  save<K extends LongformStageId>(stage: K, result: LongformStageResult<K>): void;
  get<K extends LongformStageId>(stage: K): LongformStageResult<K> | undefined;
  dump(): Partial<LongformStageResultMap>;
}

export class MemoryArtifactStore implements LongformArtifactStore {
  private readonly artifacts = new Map<LongformStageId, LongformStageResult<LongformStageId>>();

  constructor(initial?: Partial<LongformStageResultMap>) {
    if (initial) {
      for (const [stage, value] of Object.entries(initial) as Array<[LongformStageId, LongformStageResult<LongformStageId>]>) {
        this.artifacts.set(stage, value);
      }
    }
  }

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

export class CachedArtifactStore extends MemoryArtifactStore {
  constructor(private readonly traceId: string, initial?: Partial<LongformStageResultMap>) {
    super(initial);
  }

  override save<K extends LongformStageId>(stage: K, result: LongformStageResult<K>) {
    super.save(stage, result);
    if (!hasCacheConfigured()) return;
    void writeStageCache(this.traceId, stage, result).catch(() => undefined);
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
  traceId?: string;
  initialArtifacts?: Partial<LongformStageResultMap>;
}

export class LongformWorkflowContext implements LongformRuntimeContext {
  readonly traceId: string;

  readonly createdAt = new Date();

  readonly artifacts: LongformArtifactStore;

  readonly bus: WorkflowEventBus<LongformStageId>;

  constructor(readonly llm: LlmExecutor, options: LongformWorkflowContextOptions = {}) {
    this.traceId = options.traceId ?? uuid();
    if (options.artifacts) {
      this.artifacts = options.artifacts;
      if (options.initialArtifacts) {
        for (const [stage, value] of Object.entries(options.initialArtifacts) as Array<[LongformStageId, LongformStageResult<LongformStageId>]>) {
          this.artifacts.save(stage, value);
        }
      }
    } else if (hasCacheConfigured()) {
      this.artifacts = new CachedArtifactStore(this.traceId, options.initialArtifacts);
    } else {
      this.artifacts = new MemoryArtifactStore(options.initialArtifacts);
    }
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
