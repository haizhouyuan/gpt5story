import { describe, it, expect } from 'vitest';
import { createStoryTreeWorkflow } from '../src/workflow/storyTreeWorkflow';
import { MockLlmProvider } from './__mocks__/llmProvider';

const jsonTree = `
{
  "topic": "森林寶藏",
  "root": {
    "id": "root",
    "title": "開端",
    "content": "主角進入森林。",
    "choices": [
      {"label": "向左", "nextId": "left"},
      {"label": "向右", "nextId": "right"}
    ],
    "children": [
      {
        "id": "left",
        "title": "左邊小徑",
        "content": "發現線索。",
        "choices": [],
        "ending": true
      },
      {
        "id": "right",
        "title": "右邊小徑",
        "content": "遇到守護者。",
        "choices": [],
        "ending": true
      }
    ]
  }
}`;

describe('story tree workflow', () => {
  it('parses LLM output into structured tree', async () => {
    const wf = createStoryTreeWorkflow(new MockLlmProvider({ draftResult: jsonTree }));
    const execution = await wf.invoke('森林寶藏');
    expect(execution.tree.root.children?.length).toBe(2);
  });

  it('falls back when parsing fails', async () => {
    const wf = createStoryTreeWorkflow(new MockLlmProvider({ draftResult: 'not-json' }));
    const execution = await wf.invoke('森林寶藏');
    expect(execution.tree.root).toBeDefined();
  });
});
