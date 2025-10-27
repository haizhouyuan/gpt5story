import { describe, it, expect } from 'vitest';
import { createStoryWorkflow } from '../src/workflow/storyWorkflow';
import { MockLlmProvider } from './__mocks__/llmProvider';

describe('story workflow pipeline', () => {
  it('produces a structured segment with trace id', async () => {
    const workflow = createStoryWorkflow(new MockLlmProvider({ draftResult: '魔法森林歷險記 冒險展開...' }));
    const execution = await workflow.invoke({
      topic: '魔法森林歷險記',
      turnIndex: 2,
      historyContent: '先前故事描述了一隻兔子發現了神秘腳印。',
      selectedChoice: '追尋腳印',
    });

    expect(execution.response.segment.content).toContain('冒險展開');
    expect(execution.response.segment.choices).toHaveLength(3);
    expect(execution.response.traceId).toBeDefined();
    expect(execution.outline.acts.length).toBeGreaterThan(0);
    expect(execution.events.length).toBeGreaterThan(0);
    expect(execution.stageStates).toHaveLength(4);
    expect(execution.stageStates.every((stage) => stage.status !== 'pending')).toBe(true);
    expect(execution.telemetry.stages.length).toBeGreaterThan(0);
  });

  it('truncates memory when history is long', async () => {
    const llm = new MockLlmProvider();
    const workflow = createStoryWorkflow(llm);
    const longHistory = '第一段。'.repeat(1000);
    const execution = await workflow.invoke({
      topic: '秘密花園',
      turnIndex: 1,
      historyContent: longHistory,
    });

    expect(llm.planCalls.length).toBeGreaterThan(0);
    expect(llm.draftCalls[0].user).toContain('Outline Brief');
    expect(execution.response.segment.choices[0].text.length).toBeGreaterThan(0);
  });

  it('parses JSON payload from LLM output', async () => {
    const jsonDraft = [
      '```json',
      '{',
      '  "storySegment": {',
      '    "content": "森林裡的小精靈邀請主角踏上新的冒險。",',
      '    "isEnding": false,',
      '    "choices": [',
      '      {"text": "接受邀請", "intent": "accept"},',
      '      {"text": "詢問更多資訊"},',
      '      {"text": "婉拒邀請"}',
      '    ]',
      '  }',
      '}',
      '```',
    ].join('\n');
    const llm = new MockLlmProvider({ draftResult: jsonDraft });
    const workflow = createStoryWorkflow(llm);

    const execution = await workflow.invoke({
      topic: '森林冒險',
      turnIndex: 0,
      historyContent: '',
    });

    expect(execution.response.segment.content).toContain('小精靈');
    expect(execution.response.segment.choices).toHaveLength(3);
    expect(execution.response.segment.choices[0].intent).toBe('accept');
    expect(execution.reviewNotes.length).toBeGreaterThanOrEqual(0);
  });
});
