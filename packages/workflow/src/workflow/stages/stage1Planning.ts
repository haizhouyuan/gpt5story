import { v4 as uuid } from 'uuid';
import type { StoryOutlinePlan, DetectiveOutline } from '@gpt5story/shared';
import { storyOutlinePlanSchema } from '@gpt5story/shared';
import { buildPlanningPrompt } from '../../prompts/storyPrompts.js';
import type { BaseStageContext, Stage1Result } from './types.js';
import { sanitizeJsonBlock } from '../utils.js';

const FALLBACK_OUTLINE = (topic: string): StoryOutlinePlan => ({
  topic,
  tone: '童趣推理',
  acts: [
    {
      title: 'Act 1: 謎題揭幕',
      summary: '介紹舞台與主角，捕捉第一個謎團',
      beats: ['介紹場景與角色', '鋪陳核心謎題'],
    },
    {
      title: 'Act 2: 深入探索',
      summary: '透過線索與誤導強化懸念',
      beats: ['發現線索', '遭遇誤導', '逼近真相'],
    },
    {
      title: 'Act 3: 真相揭曉',
      summary: '用公平線索解開謎題並回收伏筆',
      beats: ['對質與推理', '回收伏筆', '迎接結局'],
    },
  ],
  clues: [
    {
      id: `cl-${uuid()}`,
      description: '神秘腳印',
      payoff: '指向真正的守護者',
    },
  ],
  misdirections: [
    {
      id: `md-${uuid()}`,
      technique: '命名誤導',
      description: '稱呼守護者為暗影',
      resolution: '其實是友方',
    },
  ],
});

const toDetectiveOutline = (plan: StoryOutlinePlan): DetectiveOutline => {
  const acts = plan.acts.map((act, actIndex) => ({
    act: actIndex + 1,
    focus: act.title,
    beats: act.beats.map((summary, beatIndex) => ({
      beat: beatIndex + 1,
      summary,
      cluesRevealed: beatIndex === 0 && plan.clues.length > 0
        ? plan.clues.map((clue) => clue.description)
        : undefined,
    })),
    payoff: act.summary,
  }));

  const clueMatrix = plan.clues.map((clue) => ({
    clue: clue.description,
    surfaceMeaning: clue.foreshadowingBeat,
    realMeaning: clue.payoff,
    appearsAtAct: acts.length ? Math.min(acts.length, 2) : undefined,
    isRedHerring: false,
  }));

  const redHerrings = plan.misdirections.map((item) => ({
    clue: item.description,
    surfaceMeaning: item.technique,
    realMeaning: item.resolution,
    isRedHerring: true,
  }));

  return {
    centralTrick: {
      summary: plan.topic,
      mechanism: plan.tone,
      fairnessNotes: plan.clues.map((clue) => clue.payoff),
    },
    acts,
    clueMatrix: [...clueMatrix, ...redHerrings],
    fairnessNotes: plan.clues.map((clue) => `線索 ${clue.id} 的回收：${clue.payoff}`),
    themes: plan.tone ? [plan.tone] : undefined,
    logicChecklist: plan.misdirections.map((item) => `誤導：${item.description}`),
    chapterAnchors: acts.flatMap((act) =>
      act.beats.map((beat) => ({
        chapter: `${act.act}-${beat.beat}`,
        label: beat.summary,
      })),
    ),
  };
};

const parseOutline = (raw: string, topic: string): StoryOutlinePlan => {
  const sanitized = sanitizeJsonBlock(raw);
  try {
    const obj = JSON.parse(sanitized);
    return storyOutlinePlanSchema.parse(obj);
  } catch (error) {
    return FALLBACK_OUTLINE(topic);
  }
};

export const runStage1Planning = async (
  ctx: BaseStageContext,
): Promise<Stage1Result> => {
  const { request, memory, llm, bus } = ctx;
  const prompt = buildPlanningPrompt({
    topic: request.topic,
    turnIndex: request.turnIndex,
    selectedChoice: request.selectedChoice,
    memory,
  });

  bus.emit({ stage: 'planning', status: 'start', timestamp: new Date().toISOString(), meta: { topic: request.topic } });

  try {
    const outlineRaw = await llm.plan(prompt);
    const outline = parseOutline(outlineRaw, request.topic);
    const narrativeBrief = outline.acts.map((act) => `${act.title}: ${act.summary}`).join('\n');
    bus.emit({ stage: 'planning', status: 'success', timestamp: new Date().toISOString(), meta: { acts: outline.acts.length } });
    return { outline, narrativeBrief, detectiveOutline: toDetectiveOutline(outline) };
  } catch (error) {
    bus.emit({
      stage: 'planning',
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
    });
    const outline = FALLBACK_OUTLINE(request.topic);
    return {
      outline,
      narrativeBrief: outline.acts.map((act) => act.summary).join('\n'),
      detectiveOutline: toDetectiveOutline(outline),
    };
  }
};
