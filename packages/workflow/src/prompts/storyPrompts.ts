import type { StoryMemoryContext } from '../memory/storyMemory.js';

export interface PlanningPromptInput {
  topic: string;
  turnIndex: number;
  selectedChoice?: string;
  memory: StoryMemoryContext;
}

export interface StoryDraftPromptInput extends PlanningPromptInput {
  outlineBeats: string[];
}

export interface PromptPayload {
  system: string;
  user: string;
}

export const buildPlanningPrompt = (input: PlanningPromptInput): PromptPayload => {
  const { topic, turnIndex, selectedChoice, memory } = input;
  const memorySnippet = memory.recentExcerpt ? `\n最近劇情摘錄：\n${memory.recentExcerpt}` : '';
  const summaryLine = memory.summary ? `\n故事摘要：${memory.summary}` : '';
  const choiceLine = selectedChoice ? `\n上一輪選擇：「${selectedChoice}」` : '';

  const system = [
    '你是一位推理故事的策劃顧問，負責為下一段兒童故事設定節拍。',
    '請輸出 3 個要點，指明即將到來的情節方向、情緒，以及需要呼應的伏筆。',
  ].join(' ');

  const user = [
    `主題：${topic}`,
    `目前回合：第 ${turnIndex + 1} 回`,
    choiceLine,
    summaryLine,
    memorySnippet,
    '\n請提供下一段落的三個節拍概要，保持童趣且邏輯連貫。',
  ]
    .filter(Boolean)
    .join('');

  return { system, user };
};

export const buildDraftPrompt = (input: StoryDraftPromptInput): PromptPayload => {
  const { outlineBeats, topic, turnIndex, selectedChoice, memory } = input;
  const beatLines = outlineBeats.map((beat, idx) => `${idx + 1}. ${beat}`).join('\n');
  const memorySnippet = memory.recentExcerpt ? `\n延續的故事摘錄：\n${memory.recentExcerpt}` : '';
  const summaryLine = memory.summary ? `\n摘要提示：${memory.summary}` : '';
  const choiceLine = selectedChoice ? `\n使用者最近選擇：「${selectedChoice}」` : '';

  const system = [
    '你是一位兒童向故事作家，善於保持童趣、推理線索與節拍節奏。',
    '生成的段落至少 120 字，需給予 3 個可供小朋友選擇的行動。',
    '請以 JSON 格式回傳，字段包含 storySegment.content, storySegment.choices[].text, storySegment.isEnding。',
  ].join(' ');

  const user = [
    `主題：${topic}`,
    `\n回合：第 ${turnIndex + 1} 回`,
    choiceLine,
    summaryLine,
    memorySnippet,
    '\n本段節拍：\n',
    beatLines,
    '\n請根據節拍撰寫故事段落，內容須承接既有伏筆並保留懸念。',
  ]
    .filter(Boolean)
    .join('');

  return { system, user };
};
