import { runStoryValidators } from '../../validators/storyValidators.js';
import type { BaseStageContext, Stage1Result, Stage2Result, Stage3Result } from './types.js';

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
    return { reviewNotes: notes };
  } catch (error) {
    bus.emit({ stage: 'review', status: 'error', timestamp: new Date().toISOString(), message: error instanceof Error ? error.message : String(error) });
    return { reviewNotes: [] };
  }
};
