import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import type { RunnableLike } from '@langchain/core/runnables';
import type {
  LongformStageId,
  LongformStageResultMap,
  LongformWorkflowRequest,
} from './types.js';
import type { LongformStageExecutor } from './stages.js';
import { buildDefaultRegistry, mergeRegistry } from './stages.js';
import { LongformWorkflowContext } from './context.js';
import { Stage6ReviewBlockerError } from './stages/executors.js';
import { getStage5MaxAutoRevisions } from './config.js';
import type { LongformStageConfig } from './types.js';

const StageAnnotation = Annotation.Root({
  request: Annotation<LongformWorkflowRequest>(),
  artifacts: Annotation<Partial<LongformStageResultMap>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  stage5Attempts: Annotation<number>({ reducer: (_, right) => right ?? 0, default: () => 0 }),
  stage6Attempts: Annotation<number>({ reducer: (_, right) => right ?? 0, default: () => 0 }),
  route: Annotation<'retry' | 'advance' | null>({ reducer: (_, right) => right ?? null, default: () => null }),
});

type StageState = typeof StageAnnotation.State;
type StageUpdate = typeof StageAnnotation.Update;

const STAGE_ORDER: LongformStageId[] = [
  'stage0ProjectInit',
  'stage1MiracleBlueprint',
  'stage2aCastAndProps',
  'stage2bClueMatrix',
  'stage3Structure',
  'stage4SceneCards',
  'stage5LongformDraft',
  'stage6Review',
  'stage7Polish',
  'qualityGateEvaluation',
];

type ExecutorMap = Record<LongformStageId, LongformStageExecutor<LongformStageId>>;

type StageConfigMap = Record<LongformStageId, LongformStageConfig>;

const totalAllowedAttempts = (maxAutoRetries: number) => Math.max(1, 1 + Math.max(maxAutoRetries, 0));

const createGenericNode = <K extends LongformStageId>(
  stage: K,
  executor: LongformStageExecutor<K>,
  context: LongformWorkflowContext,
  config: LongformStageConfig,
) => {
  return async (state: StageState): Promise<StageUpdate> => {
    const runtime = context.createStageRuntime();
    const maxAttempts = Math.max(config.retryAttempts ?? 1, 1);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      runtime.emit({ stage, status: 'start', timestamp: new Date().toISOString(), meta: { attempt } });
      if (config.dependsOn) {
        const missing = config.dependsOn.filter((dep) => !context.artifacts.get(dep));
        if (missing.length > 0) {
          const message = `Missing dependencies: ${missing.join(', ')}`;
          runtime.emit({
            stage,
            status: 'error',
            timestamp: new Date().toISOString(),
            message,
            meta: { attempt },
          });
          throw new Error(message);
        }
      }
      try {
        const result = await executor(runtime, state.request);
        context.artifacts.save(stage, result as never);

        const artifacts = { ...state.artifacts, [stage]: result };
        runtime.emit({ stage, status: 'success', timestamp: new Date().toISOString(), meta: { attempt } });

        if (stage === 'stage5LongformDraft') {
          return { artifacts, stage5Attempts: state.stage5Attempts + 1, route: null };
        }
        if (stage === 'stage6Review') {
          return { artifacts, stage6Attempts: state.stage6Attempts + 1, route: 'advance', request: { ...state.request } };
        }
        return { artifacts };
      } catch (error) {
        runtime.emit({
          stage,
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : String(error),
          meta: { attempt },
        });

        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }
    throw new Error(`Stage ${stage} failed after ${maxAttempts} attempts`);
  };
};

const createStage6Node = (
  executor: LongformStageExecutor<'stage6Review'>,
  context: LongformWorkflowContext,
  config: LongformStageConfig,
) => {
  return async (state: StageState): Promise<StageUpdate> => {
    const runtime = context.createStageRuntime();
    const maxAttempts = Math.max(config.retryAttempts ?? 1, 1);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      runtime.emit({ stage: 'stage6Review', status: 'start', timestamp: new Date().toISOString(), meta: { attempt } });
      if (config.dependsOn) {
        const missing = config.dependsOn.filter((dep) => !context.artifacts.get(dep));
        if (missing.length > 0) {
          const message = `Missing dependencies: ${missing.join(', ')}`;
          runtime.emit({
            stage: 'stage6Review',
            status: 'error',
            timestamp: new Date().toISOString(),
            message,
            meta: { attempt },
          });
          throw new Error(message);
        }
      }
      try {
        const review = await executor(runtime, state.request);
        context.artifacts.save('stage6Review', review as never);

        const artifacts = { ...state.artifacts, stage6Review: review };
        const nextRequest: LongformWorkflowRequest = state.request.revisionContext?.stage5
          ? {
            ...state.request,
            revisionContext: { ...state.request.revisionContext, stage5: undefined },
          }
          : { ...state.request };

        runtime.emit({ stage: 'stage6Review', status: 'success', timestamp: new Date().toISOString(), meta: { attempt } });
        return {
          artifacts,
          stage6Attempts: state.stage6Attempts + 1,
          route: 'advance',
          request: nextRequest,
        };
      } catch (error) {
        if (error instanceof Stage6ReviewBlockerError) {
          const draft = state.artifacts.stage5LongformDraft ?? context.artifacts.get('stage5LongformDraft');
          if (!draft) {
            runtime.emit({
              stage: 'stage6Review',
              status: 'error',
              timestamp: new Date().toISOString(),
              message: 'Stage6 审校失败但未找到 Stage5 输出',
              meta: { attempt },
            });
            throw new Error('Stage6 审校失败但未找到 Stage5 输出');
          }

          const maxRetries = totalAllowedAttempts(getStage5MaxAutoRevisions());
          if (state.stage5Attempts >= maxRetries) {
            runtime.emit({
              stage: 'stage6Review',
              status: 'error',
              timestamp: new Date().toISOString(),
              message: error.message,
              meta: { attempt },
            });
            throw error;
          }

          const review = error.review;
          context.artifacts.save('stage6Review', review as never);

          const artifacts = { ...state.artifacts, stage6Review: review };
          const nextAttempt = state.stage5Attempts + 1;
          const nextRequest: LongformWorkflowRequest = {
            ...state.request,
            revisionContext: {
              ...state.request.revisionContext,
              stage5: {
                attempt: nextAttempt,
                maxAttempts: maxRetries,
                previousDraft: draft,
                feedback: review,
              },
            },
          };

          runtime.emit({
            stage: 'stage6Review',
            status: 'error',
            timestamp: new Date().toISOString(),
            message: error.message,
            meta: { attempt },
          });
          return {
            artifacts,
            request: nextRequest,
            stage6Attempts: state.stage6Attempts + 1,
            route: 'retry',
          };
        }

        runtime.emit({
          stage: 'stage6Review',
          status: 'error',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : String(error),
          meta: { attempt },
        });

        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error('Stage6 审校失败，超过最大重试次数');
  };
};

export interface BuildGraphOptions {
  request: LongformWorkflowRequest;
  executors?: Partial<ExecutorMap>;
  context: LongformWorkflowContext;
  stageConfigs: StageConfigMap;
}

export const buildLongformGraph = ({ request, executors, context, stageConfigs }: BuildGraphOptions) => {
  const registry = mergeRegistry(buildDefaultRegistry(), executors);
  const graph = new StateGraph(StageAnnotation);

  graph.addNode('initialize', (): StageUpdate => ({
    request,
    artifacts: request.overrides ? { ...request.overrides } : {},
    stage5Attempts: 0,
    stage6Attempts: 0,
    route: null,
  }));

  graph.addEdge(START, 'initialize');

  STAGE_ORDER.forEach((stageId, index) => {
    const node = stageId === 'stage6Review'
      ? createStage6Node(registry.stage6Review, context, stageConfigs.stage6Review)
      : createGenericNode(stageId, registry[stageId], context, stageConfigs[stageId]);
    graph.addNode(stageId, node as RunnableLike<StageState, StageUpdate>);
    if (stageId !== 'stage7Polish') {
      graph.addEdge(index === 0 ? 'initialize' : STAGE_ORDER[index - 1], stageId);
    }
  });

  graph.addConditionalEdges('stage6Review', (state: StageState) => {
    return state.route === 'retry' ? 'retry' : 'advance';
  }, {
    retry: 'stage5LongformDraft',
    advance: 'stage7Polish',
  });

  graph.addEdge(STAGE_ORDER[STAGE_ORDER.length - 1], END);

  return graph;
};
