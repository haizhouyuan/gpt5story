import { runStoryValidators } from '../../validators/storyValidators.js';
import type { StoryReviewNote, ValidationReport } from '@gpt5story/shared';
import type { BaseStageContext, Stage1Result, Stage2Result, Stage3Result } from './types.js';

const buildValidationReport = (notes: StoryReviewNote[]): ValidationReport => {
  const counts = { pass: 0, warn: 0, fail: 0 };
  const results = notes.map((note) => {
    const status = note.severity === 'error'
      ? 'fail'
      : note.severity === 'warn'
        ? 'warn'
        : 'pass';
    counts[status as keyof typeof counts] += 1;
    return {
      ruleId: note.ruleId ?? note.id,
      status,
      details: note.severity === 'info'
        ? undefined
        : [{
            message: note.message,
            meta: note.chapterRef ? { chapterRef: note.chapterRef } : undefined,
          }],
    };
  });

  if (results.length === 0) {
    counts.pass = 1;
    results.push({
      ruleId: 'default-quality-check',
      status: 'pass',
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: counts,
    results,
  };
};

export const runStage3Review = async (
  ctx: BaseStageContext,
  stage1: Stage1Result,
  stage2: Stage2Result,
): Promise<Stage3Result> => {
  const { bus } = ctx;
  bus.emit({ stage: 'review', status: 'start', timestamp: new Date().toISOString() });
  try {
    const notes = runStoryValidators({ outline: stage1.outline, segment: stage2.segment });
    const severity = notes.some((note) => note.severity === 'error') ? 'error' : 'success';
    bus.emit({ stage: 'review', status: severity === 'error' ? 'error' : 'success', timestamp: new Date().toISOString(), meta: { notes: notes.length } });
    return { reviewNotes: notes, validationReport: buildValidationReport(notes) };
  } catch (error) {
    bus.emit({ stage: 'review', status: 'error', timestamp: new Date().toISOString(), message: error instanceof Error ? error.message : String(error) });
    return {
      reviewNotes: [],
      validationReport: {
        generatedAt: new Date().toISOString(),
        summary: { pass: 0, warn: 0, fail: 1 },
        results: [
          {
            ruleId: 'review-execution-error',
            status: 'fail',
            details: [{
              message: error instanceof Error ? error.message : String(error),
            }],
          },
        ],
      },
    };
  }
};
