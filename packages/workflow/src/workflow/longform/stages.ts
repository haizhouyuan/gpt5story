import pRetry from 'p-retry';
import type { LongformStageRuntime } from './context.js';
import type {
  LongformStageId,
  LongformStageResult,
  LongformStageResultMap,
  LongformStageConfig,
  LongformStageState,
} from './types.js';
import type { LongformWorkflowRequest } from './types.js';
import { registerDefaultExecutors } from './stages/executors.js';

export type LongformStageExecutor<K extends LongformStageId> = (
  runtime: LongformStageRuntime,
  request: LongformWorkflowRequest,
) => Promise<LongformStageResult<K>>;

export type LongformStageRegistry = {
  [K in LongformStageId]: LongformStageExecutor<K>;
};

export interface StageExecutionRecord<K extends LongformStageId> {
  config: LongformStageConfig;
  executor: LongformStageExecutor<K>;
}

export const buildDefaultRegistry = (): LongformStageRegistry => registerDefaultExecutors() as LongformStageRegistry;

export const executeStageWithRetry = async <K extends LongformStageId>(
  record: StageExecutionRecord<K>,
  runtime: LongformStageRuntime,
  request: LongformWorkflowRequest,
  state: LongformStageState,
): Promise<LongformStageResult<K>> => {
  const { executor, config } = record;
  const attempts = Math.max(config.retryAttempts ?? 1, 1);
  let lastAttempt = 0;
  const result = await pRetry(() => executor(runtime, request), {
    retries: attempts - 1,
    onFailedAttempt: (error) => {
      state.attempts = error.attemptNumber;
      state.errorMessage = error.message;
      lastAttempt = error.attemptNumber;
    },
  });
  state.attempts = Math.max(lastAttempt + 1, 1);
  state.errorMessage = undefined;
  return result;
};

export const mergeRegistry = (
  base: LongformStageRegistry,
  overrides?: Partial<LongformStageRegistry>,
): LongformStageRegistry => {
  if (!overrides) return base;
  return { ...base, ...overrides } as LongformStageRegistry;
};

export const mergeResults = (
  target: Partial<LongformStageResultMap>,
  stage: LongformStageId,
  result: LongformStageResult<LongformStageId>,
): Partial<LongformStageResultMap> => {
  return { ...target, [stage]: result };
};
