import type { StoryOutlinePlan } from '@gpt5story/shared';

export const buildStoryTreePrompt = (topic: string, outline?: StoryOutlinePlan): { system: string; user: string } => {
  const system = [
    '你是一位推理故事設計師，會生成包含 3 層分支的故事樹。',
    '以 JSON 格式輸出，節點包含 id、title、content、choices (label, nextId)、ending。',
    '確保所有 nextId 在 children 節點中定義，且不超過三個選項。',
  ].join(' ');

  const outlineSummary = outline
    ? outline.acts.map((act, idx) => `Act ${idx + 1}: ${act.summary}`).join('\n')
    : 'Act 1: 建立背景\nAct 2: 深入調查\nAct 3: 真相揭曉';

  const user = [
    `主題：${topic}`,
    '\n請生成一個故事樹 (layer<=3)，使用 JSON 格式：{"topic":"...","root":{...}}',
    '\n每個節點需有不超過 3 個選項，ending=true 代表結局。',
    '\n大綱提示:\n',
    outlineSummary,
  ].join('');

  return { system, user };
};
