import { storyTreeSchema, type StoryTree } from '@gpt5story/shared';
import { LlmProvider, type LlmExecutor } from '../llm/provider.js';
import { sanitizeJsonBlock } from './utils.js';
import { buildStoryTreePrompt } from '../prompts/storyTreePrompt.js';
import type { StoryOutlinePlan } from '@gpt5story/shared';

const FALLBACK_TREE = (topic: string): StoryTree => ({
  topic,
  root: {
    id: 'root',
    title: '開端',
    content: `${topic} 的故事開始了。`,
    choices: [
      { label: '探索左側小徑', nextId: 'left' },
      { label: '探索右側小徑', nextId: 'right' },
    ],
    children: [
      {
        id: 'left',
        title: '左側小徑',
        content: '主角遇到神秘線索。',
        choices: [],
        ending: true,
      },
      {
        id: 'right',
        title: '右側小徑',
        content: '主角揭露精靈的祕密。',
        choices: [],
        ending: true,
      },
    ],
  },
});

const parseTree = (raw: string, topic: string): StoryTree => {
  const sanitized = sanitizeJsonBlock(raw);
  try {
    const obj = JSON.parse(sanitized);
    const parsed = storyTreeSchema.parse(obj) as StoryTree;
    return { ...parsed, topic };
  } catch (error) {
    return FALLBACK_TREE(topic);
  }
};

export interface StoryTreeExecutionResult {
  tree: StoryTree;
  raw: string;
}

export const createStoryTreeWorkflow = (overrideLlm?: LlmExecutor) => {
  let llm: LlmExecutor;
  try {
    llm = overrideLlm ?? new LlmProvider();
  } catch (error) {
    llm = {
      plan: async () => Promise.resolve(''),
      draft: async () => Promise.resolve(JSON.stringify(FALLBACK_TREE('fallback'))),
    };
  }

  const invoke = async (topic: string, outline?: StoryOutlinePlan): Promise<StoryTreeExecutionResult> => {
    const prompt = buildStoryTreePrompt(topic, outline);
    try {
      const raw = await llm.draft(prompt);
      const tree = parseTree(raw, topic);
      return { tree, raw };
    } catch (error) {
      return { tree: FALLBACK_TREE(topic), raw: 'FALLBACK' };
    }
  };

  return { invoke };
};
