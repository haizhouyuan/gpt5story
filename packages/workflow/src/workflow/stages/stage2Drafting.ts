import type { StoryChoice, StorySegment, StoryDraft } from '@gpt5story/shared';
import { storyChoiceSchema, storySegmentSchema } from '@gpt5story/shared';
import { buildDraftPrompt } from '../../prompts/storyPrompts.js';
import type { BaseStageContext, Stage1Result, Stage2Result } from './types.js';
import { sanitizeJsonBlock } from '../utils.js';
import type { LlmExecutor } from '../../llm/provider.js';

interface DraftParseResult {
  segment: StorySegment;
  draft?: StoryDraft;
}

const parseDraftOutput = (
  raw: string,
  fallbackChoices: StoryChoice[],
): DraftParseResult => {
  const result: StorySegment = {
    content: raw,
    isEnding: false,
    choices: fallbackChoices.slice(0, 3),
  };
  let draft: StoryDraft | undefined;

  const sanitized = sanitizeJsonBlock(raw);
  try {
    const parsed = JSON.parse(sanitized) as {
      storySegment?: StorySegment;
      storyDraft?: StoryDraft;
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
    if (parsed?.storyDraft && Array.isArray(parsed.storyDraft.chapters)) {
      draft = {
        ...parsed.storyDraft,
        chapters: parsed.storyDraft.chapters.map((chapter, index) => ({
          title: chapter.title ?? `章節 ${index + 1}`,
          summary: chapter.summary ?? chapter.content.slice(0, 50),
          content: chapter.content,
          wordCount: chapter.wordCount ?? chapter.content.replace(/\s/g, '').length,
          cluesEmbedded: chapter.cluesEmbedded,
          redHerringsEmbedded: chapter.redHerringsEmbedded,
        })),
        overallWordCount: parsed.storyDraft.overallWordCount
          ?? parsed.storyDraft.chapters.reduce(
            (acc, chapter) => acc + (chapter.wordCount ?? chapter.content.replace(/\s/g, '').length),
            0,
          ),
      };
    }
  } catch (error) {
    // ignore
  }
  return { segment: result, draft };
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

    const { segment, draft: parsedDraft } = parseDraftOutput(rawDraft, fallbackChoices);
    storySegmentSchema.parse(segment);

    const fallbackDraft: StoryDraft = parsedDraft ?? {
      chapters: [
        {
          title: `互動段落 ${request.turnIndex + 1}`,
          summary: stage1.narrativeBrief.split('\n')[0] ?? stage1.outline.topic,
          content: segment.content,
          wordCount: segment.content.replace(/\s/g, '').length,
          cluesEmbedded: stage1.outline.clues.map((clue) => clue.description),
          redHerringsEmbedded: stage1.outline.misdirections.map((mis) => mis.description),
        },
      ],
      overallWordCount: segment.content.replace(/\s/g, '').length,
      narrativeStyle: stage1.outline.tone,
      continuityNotes: [],
      revisionNotes: [],
    };

    bus.emit({ stage: 'drafting', status: 'success', timestamp: new Date().toISOString(), meta: { isEnding: segment.isEnding } });
    return { segment, rawDraft, draft: fallbackDraft };
  } catch (error) {
    bus.emit({
      stage: 'drafting',
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
    });

    const { segment: fallbackSegment } = parseDraftOutput('（模型暫時不可用，返回簡要草稿。）', fallbackChoices);
    const fallbackDraft: StoryDraft = {
      chapters: [
        {
          title: `互動段落 ${request.turnIndex + 1}`,
          summary: stage1.narrativeBrief.split('\n')[0] ?? stage1.outline.topic,
          content: fallbackSegment.content,
          wordCount: fallbackSegment.content.replace(/\s/g, '').length,
          cluesEmbedded: stage1.outline.clues.map((clue) => clue.description),
          redHerringsEmbedded: stage1.outline.misdirections.map((mis) => mis.description),
        },
      ],
      overallWordCount: fallbackSegment.content.replace(/\s/g, '').length,
      narrativeStyle: stage1.outline.tone,
      continuityNotes: ['模型輸出不可用，已回退為預設段落'],
      revisionNotes: [],
    };
    return { segment: fallbackSegment, rawDraft: fallbackSegment.content, draft: fallbackDraft };
  }
};
