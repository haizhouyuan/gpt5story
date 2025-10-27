import type { StoryRevisionPlan, RevisionPlanSummary, ValidationReport } from '@gpt5story/shared';
import type { BaseStageContext, Stage2Result, Stage3Result, Stage4Result } from './types.js';
import { containsBannedOutput } from '../../utils/contentSafety.js';

const buildRevisionPlan = (notes: Stage3Result['reviewNotes']): StoryRevisionPlan => {
  if (!notes.length) {
    return {
      id: 'revision-0',
      summary: '內容質量達標，無需重大修訂',
      actions: ['保持節奏與線索一致性'],
    };
  }
  const actions = notes.map((note) => `處理 ${note.severity.toUpperCase()}：${note.message}`);
  return {
    id: `revision-${Date.now()}`,
    summary: '根據審校意見進行調整',
    actions,
  };
};

const buildRevisionSummary = (
  plan: StoryRevisionPlan,
  notes: Stage3Result['reviewNotes'],
  validation: ValidationReport,
): RevisionPlanSummary => {
  const mustFixFromNotes = notes
    .filter((note) => note.severity === 'error')
    .map((note) => ({
      id: note.id,
      detail: note.message,
      category: 'review',
      chapterRef: note.chapterRef,
    }));

  const warningsFromNotes = notes
    .filter((note) => note.severity === 'warn')
    .map((note) => ({
      id: note.id,
      detail: note.message,
      category: 'review',
      chapterRef: note.chapterRef,
    }));

  const failsFromValidation = validation.results
    .filter((result) => result.status === 'fail')
    .map((result) => ({
      id: result.ruleId,
      detail: result.details?.[0]?.message ?? 'Validation fail',
      category: 'validation',
    }));

  const warnsFromValidation = validation.results
    .filter((result) => result.status === 'warn')
    .map((result) => ({
      id: result.ruleId,
      detail: result.details?.[0]?.message ?? 'Validation warning',
      category: 'validation',
    }));

  const uniqueSuggestions = Array.from(
    new Set(plan.actions.length ? plan.actions : ['持續監測段落品質與節奏']),
  );

  return {
    mustFix: [...mustFixFromNotes, ...failsFromValidation],
    warnings: [...warningsFromNotes, ...warnsFromValidation],
    suggestions: uniqueSuggestions,
    generatedAt: validation.generatedAt,
  };
};

export const runStage4Revision = async (
  ctx: BaseStageContext,
  stage2: Stage2Result,
  stage3: Stage3Result,
): Promise<Stage4Result> => {
  const { bus } = ctx;
  bus.emit({ stage: 'revision', status: 'start', timestamp: new Date().toISOString() });
  try {
    const revisionPlan = buildRevisionPlan(stage3.reviewNotes);
    const finalContent = stage3.reviewNotes.length
      ? `${stage2.segment.content}\n\n【修訂建議】\n${revisionPlan.actions.join('\n')}`
      : stage2.segment.content;
    const sanitized = containsBannedOutput(finalContent)
      ? '【內容經審查被移除，請重新生成】'
      : finalContent;
    const finalSegment = {
      ...stage2.segment,
      content: sanitized,
    };
    const revisionSummary = buildRevisionSummary(
      revisionPlan,
      stage3.reviewNotes,
      stage3.validationReport,
    );
    bus.emit({ stage: 'revision', status: 'success', timestamp: new Date().toISOString(), meta: { actions: revisionPlan.actions.length } });
    return {
      revisionPlan,
      finalSegment,
      revisionSummary,
    };
  } catch (error) {
    bus.emit({ stage: 'revision', status: 'error', timestamp: new Date().toISOString(), message: error instanceof Error ? error.message : String(error) });
    return {
      revisionPlan: {
        id: 'revision-fallback',
        summary: '修訂階段遇到問題，建議人工檢查',
        actions: ['請檢視模型輸出與審校意見'],
      },
      finalSegment: stage2.segment,
      revisionSummary: {
        mustFix: [{
          id: 'revision-fallback',
          detail: error instanceof Error ? error.message : String(error),
          category: 'system',
        }],
        warnings: [],
        suggestions: ['人工審閱輸出內容並重新執行工作流'],
        generatedAt: new Date().toISOString(),
      },
    };
  }
};
