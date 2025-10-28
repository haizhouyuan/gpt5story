import type { StructurePlanOutput, ClueMatrixOutput } from '../../workflow/longform/types.js';

export interface Stage4ScenesPromptInput {
  structurePlan: StructurePlanOutput;
  clueMatrix: ClueMatrixOutput;
}

export interface PromptPayload {
  system: string;
  user: string;
}

const toJSON = (value: unknown) => JSON.stringify(value, null, 2);

export const buildStage4ScenePrompt = (input: Stage4ScenesPromptInput): PromptPayload => {
  const { structurePlan, clueMatrix } = input;

  const system = [
    '你是一名侦探小说的“场景导演”，需要根据章节结构与线索矩阵，为每章生成 2 个以上场景卡以及 150-220 字的代表性片段。',
    '输出结构：',
    '{',
    '  "sceneCards": [{ "sceneId": "S章-序号", "chapter": 数字, "pov": "", "goal": "", "conflict": "", "evidenceOut": ["CLXX"...], "redHerringsOut": ["RH-XX"...], "sensoryDetail": "", "emotionBeat": "", "exitHook": "", "wordQuota": 数字 }],',
    '  "draftFragments": [{ "chapter": 数字, "pov": "", "approxWords": 数字, "text": "150-220 字片段" }],',
    '  "continuityChecks": ["..."]',
    '}',
    '请遵守：',
    '  - `evidenceOut` / `redHerringsOut` 只能引用真实存在的 CL/RH/pXX/cXX/tXX ID。',
    '  - 至少一条场景卡明确呈现“导向环/滑盖”线索，一条呈现“投毒链”线索，一条呈现“镜像误导”。',
    '  - `continuityChecks` 中列出 POV 切换、线索引用、节奏风险。',
  ].join(' ');

  const user = [
    '【章节结构计划】',
    toJSON(structurePlan),
    '\n【线索矩阵】',
    toJSON(clueMatrix),
    '\n请输出符合结构的 JSON。仅返回 JSON。',
  ].join('\n');

  return { system, user };
};

