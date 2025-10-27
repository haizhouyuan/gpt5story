import type { StoryChoice, StorySegment } from '@gpt5story/shared';
import { storyChoiceSchema, storySegmentSchema } from '@gpt5story/shared';
import { buildDraftPrompt } from '../../prompts/storyPrompts.js';
import type { BaseStageContext, Stage1Result, Stage2Result } from './types.js';
import { sanitizeJsonBlock } from '../utils.js';
import type { LlmExecutor } from '../../llm/provider.js';
import { WorkflowEventBus } from '../../events/workflowEventBus.js';

const parseDraftOutput = (
  raw: string,
  fallbackChoices: StoryChoice[],
): StorySegment => {
  const result: StorySegment = {
    content: raw,
    isEnding: false,
    choices: fallbackChoices.slice(0, 3),
  };

  const sanitized = sanitizeJsonBlock(raw);
  try {
    const parsed = JSON.parse(sanitized) as {
      storySegment?: StorySegment;
    };
    if (parsed?.storySegment) {
      result.content = parsed.storySegment.content ?? result.content;
      result.isEnding = parsed.storySegment.isEnding ?? result.isEnding;
      if (Array.isArray(parsed.storySegment.choices) && parsed.storySegment.choices.length > 0) {
        result.choices = parsed.storySegment.choices
          .slice(0, 3)
          .map((choice) => storyChoiceSchema.parse(choice));
      }
    }
  } catch (error) {
    // ignore
  }
  return result;
};

export const runStage2Drafting = async (
  ctx: BaseStageContext,
  stage1: Stage1Result,
): Promise<Stage2Result> => {
  const { request, memory, llm, bus } = ctx;

  bus.emit({ stage: 'drafting', status: 'start', timestamp: new Date().toISOString(), meta: { topic: request.topic } });

  const prompt = buildDraftPrompt({
    topic: request.topic,
    turnIndex: request.turnIndex,
    selectedChoice: request.selectedChoice,
    outlineBeats: stage1.outline.acts.flatMap((act) => act.beats.slice(0, 2)),
    memory,
  });

  const fallbackChoices: StoryChoice[] = [
    { text: '繼續探索新的線索', intent: 'progress' },
    { text: '與朋友分享心得', intent: 'social' },
    { text: '暫時休息觀察', intent: 'reflect' },
  ];

  try {
    const rawDraft = await llm.draft({
      system: prompt.system,
      user: `${prompt.user}\n\n# Outline Brief\n${stage1.narrativeBrief}`,
    });

    const segment = parseDraftOutput(rawDraft, fallbackChoices);
    storySegmentSchema.parse(segment);

    bus.emit({ stage: 'drafting', status: 'success', timestamp: new Date().toISOString(), meta: { isEnding: segment.isEnding } });
    return { segment, rawDraft };
  } catch (error) {
    bus.emit({
      stage: 'drafting',
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
    });

    const segment = parseDraftOutput('（模型暫時不可用，返回簡要草稿。）', fallbackChoices);
    return { segment, rawDraft: segment.content };
  }
};
