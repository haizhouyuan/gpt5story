import type { LongformStageExecutor } from '../stages.js';
import type { LongformWorkflowRequest, ReviewReport } from '../types.js';
import {
  projectCardSchema,
  miracleBlueprintSchema,
  castAndPropsSchema,
  clueMatrixSchema,
  structurePlanSchema,
  sceneDesignSchema,
  longformDraftSchema,
  reviewReportSchema,
  polishedDraftSchema,
  evaluationReportSchema,
} from '../schema.js';
import { invokeAndParse } from '../helpers.js';
import { buildStage1MiraclePrompt } from '../../../prompts/longform/stage1.js';
import { buildStage2ACastPrompt } from '../../../prompts/longform/stage2A.js';
import { buildStage2BCluePrompt } from '../../../prompts/longform/stage2B.js';
import { buildStage3StructurePrompt } from '../../../prompts/longform/stage3.js';
import { buildStage4ScenePrompt } from '../../../prompts/longform/stage4.js';
import { buildStage5DraftPrompt } from '../../../prompts/longform/stage5.js';
import { buildStage6ReviewPrompt } from '../../../prompts/longform/stage6.js';
import { buildStage7PolishPrompt } from '../../../prompts/longform/stage7.js';
import { buildQualityEvaluationPrompt } from '../../../prompts/longform/evaluation.js';
import { renderMarkdown } from '../markdown.js';
import { persistMarkdownArtifact } from '../storage.js';
import {
  getMarkdownOutputRoot,
  shouldFailOnStage6Warn,
} from '../config.js';

const DEFAULT_PROJECT_CARD = projectCardSchema.parse({
  projectId: 'longform-default',
  titleCandidates: ['雾夜钟楼的七级台阶', '消失的铜怀表', '糖纸拼成的地图'],
  series: '蛋蛋侦探事件簿',
  genreTags: ['本格', '少年视角', '温情'],
  themes: ['雾夜', '怀表', '糖纸'],
  targetWordCount: 5000,
  definitionOfDone: [
    '成稿字数4800-5200字',
    '第一人称“蛋蛋”叙述，全程口吻统一',
    '案件闭环：凶手/动机/手法/时间线/证据链清晰可回溯',
    '有效线索≥8处且前半程露出≥4处',
    '揭晓前设置读者挑战段落，结尾给出完整推理展示',
    '无超自然或常识违背的关键设定',
  ],
  risks: [
    { id: 'R1', risk: '线索难度失衡导致读者无从下手', mitigation: '小范围内测并调整线索露出与误导比例' },
    { id: 'R2', risk: '童真语气削弱推理严谨性', mitigation: '用孩童比喻呈现客观细节，必要处由成年人对白补充信息' },
    { id: 'R3', risk: '节奏拖沓或转折突兀', mitigation: '三幕结构与场景节拍表，删冗句并保留每幕小悬念' },
    { id: 'R4', risk: '校园题材触及敏感或阴暗氛围过重', mitigation: '降低暴力与阴暗描写，强调温情动机与成长收束' },
  ],
  successMetrics: [
    { metric: '字数达标', target: '5000±10%' },
    { metric: '伏笔回收率', target: '≥95%' },
    { metric: '读者提前识破率', target: '20%-40%（内测样本≥5人）' },
    { metric: '口吻一致性评分', target: '≥4/5（读者主观评价）' },
    { metric: '逻辑漏洞数', target: '≤1处（经校对与内测反馈）' },
  ],
});

export class Stage6ReviewBlockerError extends Error {
  constructor(readonly review: ReviewReport, readonly level: 'mustFix' | 'warn') {
    const detail = level === 'mustFix'
      ? review.mustFix.join('; ')
      : review.warnings.join('; ');
    super(level === 'mustFix' ? `Stage6 审校未通过：${detail}` : `Stage6 审校存在警告：${detail}`);
    this.name = 'Stage6ReviewBlockerError';
  }
}

export const runStage0ProjectInit: LongformStageExecutor<'stage0ProjectInit'> = async (
  _runtime,
  request,
) => {
  if (request.overrides?.stage0ProjectInit) return projectCardSchema.parse(request.overrides.stage0ProjectInit);
  return DEFAULT_PROJECT_CARD;
};

export const runStage1MiracleBlueprint: LongformStageExecutor<'stage1MiracleBlueprint'> = async (
  runtime,
  request,
) => {
  if (request.overrides?.stage1MiracleBlueprint) {
    return miracleBlueprintSchema.parse(request.overrides.stage1MiracleBlueprint);
  }

  const projectCard = runtime.artifacts.get('stage0ProjectInit') ?? DEFAULT_PROJECT_CARD;
  const prompt = buildStage1MiraclePrompt({ projectCard, synopsis: request.instructions });
  return invokeAndParse(runtime, 'stage1MiracleBlueprint', prompt, miracleBlueprintSchema);
};

export const runStage2aCastAndProps: LongformStageExecutor<'stage2aCastAndProps'> = async (
  runtime,
  request,
) => {
  if (request.overrides?.stage2aCastAndProps) {
    return castAndPropsSchema.parse(request.overrides.stage2aCastAndProps);
  }

  const projectCard = runtime.artifacts.get('stage0ProjectInit') ?? DEFAULT_PROJECT_CARD;
  const miracleBlueprint = runtime.artifacts.get('stage1MiracleBlueprint');
  const prompt = buildStage2ACastPrompt({
    projectCard,
    miracleBlueprintSummary: miracleBlueprint?.logline ?? '',
  });

  return invokeAndParse(runtime, 'stage2aCastAndProps', prompt, castAndPropsSchema);
};

export const runStage2bClueMatrix: LongformStageExecutor<'stage2bClueMatrix'> = async (
  runtime,
  request,
) => {
  if (request.overrides?.stage2bClueMatrix) {
    return clueMatrixSchema.parse(request.overrides.stage2bClueMatrix);
  }

  const projectCard = runtime.artifacts.get('stage0ProjectInit') ?? DEFAULT_PROJECT_CARD;
  const miracleBlueprint = runtime.artifacts.get('stage1MiracleBlueprint');
  const castAndProps = runtime.artifacts.get('stage2aCastAndProps');
  if (!miracleBlueprint || !castAndProps) {
    throw new Error('缺少 Stage1 或 Stage2A 结果，无法生成线索矩阵');
  }
  const prompt = buildStage2BCluePrompt({
    projectCard,
    miracleBlueprint,
    castAndProps,
  });
  return invokeAndParse(runtime, 'stage2bClueMatrix', prompt, clueMatrixSchema);
};

export const runStage3Structure: LongformStageExecutor<'stage3Structure'> = async (
  runtime,
  request,
) => {
  if (request.overrides?.stage3Structure) {
    return structurePlanSchema.parse(request.overrides.stage3Structure);
  }
  const projectCard = runtime.artifacts.get('stage0ProjectInit') ?? DEFAULT_PROJECT_CARD;
  const miracleBlueprint = runtime.artifacts.get('stage1MiracleBlueprint');
  const castAndProps = runtime.artifacts.get('stage2aCastAndProps');
  const clueMatrix = runtime.artifacts.get('stage2bClueMatrix');
  if (!miracleBlueprint || !castAndProps || !clueMatrix) {
    throw new Error('缺少 Stage1/Stage2 结果，无法生成结构计划');
  }
  const prompt = buildStage3StructurePrompt({ projectCard, miracleBlueprint, castAndProps, clueMatrix });
  return invokeAndParse(runtime, 'stage3Structure', prompt, structurePlanSchema);
};

export const runStage4SceneCards: LongformStageExecutor<'stage4SceneCards'> = async (
  runtime,
  request,
) => {
  if (request.overrides?.stage4SceneCards) {
    return sceneDesignSchema.parse(request.overrides.stage4SceneCards);
  }
  const structurePlan = runtime.artifacts.get('stage3Structure');
  const clueMatrix = runtime.artifacts.get('stage2bClueMatrix');
  if (!structurePlan || !clueMatrix) {
    throw new Error('缺少 Stage2B 或 Stage3 结果，无法生成场景卡');
  }
  const prompt = buildStage4ScenePrompt({ structurePlan, clueMatrix });
  return invokeAndParse(runtime, 'stage4SceneCards', prompt, sceneDesignSchema);
};

export const runStage5LongformDraft: LongformStageExecutor<'stage5LongformDraft'> = async (
  runtime,
  request,
) => {
  if (request.overrides?.stage5LongformDraft) {
    return longformDraftSchema.parse(request.overrides.stage5LongformDraft);
  }
  const projectCard = runtime.artifacts.get('stage0ProjectInit') ?? DEFAULT_PROJECT_CARD;
  const structurePlan = runtime.artifacts.get('stage3Structure');
  const scenes = runtime.artifacts.get('stage4SceneCards');
  const clueMatrix = runtime.artifacts.get('stage2bClueMatrix');
  if (!structurePlan || !scenes || !clueMatrix) {
    throw new Error('缺少 Stage2B/Stage3/Stage4 结果，无法生成初稿');
  }
  const revision = request.revisionContext?.stage5;
  const prompt = buildStage5DraftPrompt({
    projectCard,
    structurePlan,
    scenes,
    clueMatrix,
    revision: revision
      ? {
        attempt: revision.attempt,
        maxAttempts: revision.maxAttempts,
        previousDraft: revision.previousDraft,
        feedback: revision.feedback,
      }
      : undefined,
  });
  return invokeAndParse(runtime, 'stage5LongformDraft', prompt, longformDraftSchema);
};

export const runStage6Review: LongformStageExecutor<'stage6Review'> = async (
  runtime,
  request,
) => {
  if (request.overrides?.stage6Review) {
    return reviewReportSchema.parse(request.overrides.stage6Review);
  }
  const projectCard = runtime.artifacts.get('stage0ProjectInit') ?? DEFAULT_PROJECT_CARD;
  const draft = runtime.artifacts.get('stage5LongformDraft');
  const clueMatrix = runtime.artifacts.get('stage2bClueMatrix');
  if (!draft || !clueMatrix) {
    throw new Error('缺少 Stage2B 或 Stage5 结果，无法执行审校');
  }
  const revision = request.revisionContext?.stage5;
  const prompt = buildStage6ReviewPrompt({
    projectCard,
    draft,
    clueMatrix,
    revision: revision
      ? {
        attempt: revision.attempt,
        previousReview: revision.feedback,
      }
      : undefined,
  });
  const review = await invokeAndParse(runtime, 'stage6Review', prompt, reviewReportSchema);
  if (review.mustFix.length > 0) {
    throw new Stage6ReviewBlockerError(review, 'mustFix');
  }
  if (shouldFailOnStage6Warn() && review.warnings.length > 0) {
    throw new Stage6ReviewBlockerError(review, 'warn');
  }
  return review;
};

export const runStage7Polish: LongformStageExecutor<'stage7Polish'> = async (
  runtime,
  request,
) => {
  if (request.overrides?.stage7Polish) {
    return polishedDraftSchema.parse(request.overrides.stage7Polish);
  }
  const projectCard = runtime.artifacts.get('stage0ProjectInit') ?? DEFAULT_PROJECT_CARD;
  const draft = runtime.artifacts.get('stage5LongformDraft');
  const review = runtime.artifacts.get('stage6Review');
  const clueMatrix = runtime.artifacts.get('stage2bClueMatrix');
  if (!draft || !review || !clueMatrix) {
    throw new Error('缺少 Stage2B/Stage5/Stage6 结果，无法润色');
  }
  const prompt = buildStage7PolishPrompt({ projectCard, draft, review, clueMatrix });
  const polished = await invokeAndParse(runtime, 'stage7Polish', prompt, polishedDraftSchema);
  const markdown = renderMarkdown(polished);
  const stage5AttemptCount = Math.max(
    runtime.bus.list().filter((event) => event.stage === 'stage5LongformDraft' && event.status === 'success').length,
    1,
  );
  let markdownPath: string | undefined;
  const markdownRoot = getMarkdownOutputRoot();
  if (markdownRoot) {
    try {
      const { relativePath } = await persistMarkdownArtifact({
        root: markdownRoot,
        traceId: runtime.traceId,
        content: markdown,
        createdAt: runtime.createdAt,
        attempt: stage5AttemptCount,
      });
      markdownPath = relativePath;
    } catch {
      markdownPath = undefined;
    }
  }
  return { ...polished, markdown, markdownPath };
};

export const runQualityGateEvaluation: LongformStageExecutor<'qualityGateEvaluation'> = async (
  runtime,
  request,
) => {
  if (request.overrides?.qualityGateEvaluation) {
    return evaluationReportSchema.parse(request.overrides.qualityGateEvaluation);
  }
  const projectCard = runtime.artifacts.get('stage0ProjectInit') ?? DEFAULT_PROJECT_CARD;
  const polished = runtime.artifacts.get('stage7Polish');
  const review = runtime.artifacts.get('stage6Review');
  const clueMatrix = runtime.artifacts.get('stage2bClueMatrix');
  if (!polished || !review || !clueMatrix) {
    throw new Error('缺少 Stage2B/Stage6/Stage7 结果，无法执行质量评估');
  }
  const prompt = buildQualityEvaluationPrompt({ projectCard, polished, review, clueMatrix });
  return invokeAndParse(runtime, 'qualityGateEvaluation', prompt, evaluationReportSchema);
};

export const registerDefaultExecutors = () => ({
  stage0ProjectInit: runStage0ProjectInit,
  stage1MiracleBlueprint: runStage1MiracleBlueprint,
  stage2aCastAndProps: runStage2aCastAndProps,
  stage2bClueMatrix: runStage2bClueMatrix,
  stage3Structure: runStage3Structure,
  stage4SceneCards: runStage4SceneCards,
  stage5LongformDraft: runStage5LongformDraft,
  stage6Review: runStage6Review,
  stage7Polish: runStage7Polish,
  qualityGateEvaluation: runQualityGateEvaluation,
});
