import { describe, it, expect } from 'vitest';
import {
  storyWorkflowRequestSchema,
  storyWorkflowResponseSchema,
  saveStoryRequestSchema,
  ttsSynthesisRequestSchema,
  storyOutlinePlanSchema,
  storyReviewNoteSchema,
  storyRevisionPlanSchema,
  storyTreeSchema,
} from '../src/index.js';

describe('story schema', () => {
  it('validates a minimal request payload', () => {
    const result = storyWorkflowRequestSchema.safeParse({
      topic: '神秘的小兔子',
      turnIndex: 0,
      historyContent: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid request payload', () => {
    const result = storyWorkflowRequestSchema.safeParse({
      topic: '',
      turnIndex: -1,
      historyContent: '',
    });
    expect(result.success).toBe(false);
  });

  it('validates workflow response structure', () => {
    const validation = storyWorkflowResponseSchema.safeParse({
      segment: {
        content: '故事文本內容充滿想像力與懸念。',
        isEnding: false,
        choices: [
          { text: '選擇 A', intent: 'A' },
          { text: '選擇 B' },
        ],
      },
      traceId: 'trace-123',
    });
    expect(validation.success).toBe(true);
  });

  it('validates save story payload and rejects short content', () => {
    expect(saveStoryRequestSchema.safeParse({
      topic: '小王子與玫瑰',
      content: '這是一段很長的故事內容……'.repeat(10),
    }).success).toBe(true);

    expect(saveStoryRequestSchema.safeParse({
      topic: '短故事',
      content: '太短了',
    }).success).toBe(false);
  });

  it('validates tts request limits', () => {
    expect(ttsSynthesisRequestSchema.safeParse({
      text: '請把這段話轉成音檔',
      speed: 1.2,
    }).success).toBe(true);

    expect(ttsSynthesisRequestSchema.safeParse({
      text: '',
      speed: 3,
    }).success).toBe(false);
  });

  it('validates outline, review note and revision plan structures', () => {
    expect(
      storyOutlinePlanSchema.safeParse({
        topic: '森林冒險',
        acts: [
          { title: 'Act 1', summary: '建立背景', beats: ['介紹主角', '受邀進森林'] },
        ],
        clues: [{ id: 'cl-1', description: '神秘腳印', payoff: '揭示真兇' }],
        misdirections: [
          {
            id: 'md-1',
            technique: '命名誤導',
            description: '稱呼守護者為「暗影」',
            resolution: '其實是保護者',
          },
        ],
      }).success,
    ).toBe(true);

    expect(
      storyReviewNoteSchema.safeParse({
        id: 'rv-1',
        severity: 'warn',
        message: '第 2 章缺乏伏筆',
      }).success,
    ).toBe(true);

    expect(
      storyRevisionPlanSchema.safeParse({
        id: 'rp-1',
        summary: '補足伏筆與節奏',
        actions: ['在第一章增加提示', '調整節奏'],
      }).success,
    ).toBe(true);

    expect(
      storyTreeSchema.safeParse({
        topic: '森林冒險',
        root: {
          id: 'root',
          title: '開端',
          content: '主角走進森林。',
          choices: [
            { label: '左轉', nextId: 'left' },
            { label: '右轉', nextId: 'right' },
          ],
          children: [
            {
              id: 'left',
              title: '左邊小徑',
              content: '遇到神秘精靈。',
              choices: [],
              ending: true,
            },
          ],
        },
      }).success,
    ).toBe(true);
  });
});
