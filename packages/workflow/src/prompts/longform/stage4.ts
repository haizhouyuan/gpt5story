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
    '你是一名侦探小说的“场景导演”，需依章结构与线索矩阵为每章生成具有张力的场景卡与示例片段。',
    '输出结构：',
    '{',
    '  "sceneCards": [{ "sceneId": "S章-序号", "chapter": 数字, "pov": "", "goal": "", "conflict": "", "evidenceOut": ["CLXX"...], "redHerringsOut": ["RH-XX"...], "sensoryDetail": "", "emotionBeat": "", "exitHook": "", "wordQuota": 数字 }],',
    '  "draftFragments": [{ "chapter": 数字, "pov": "", "approxWords": 数字, "text": "代表性片段" }],',
    '  "continuityChecks": ["..."]',
    '}',
    '场景指引：',
    '  - 每章可输出 2–3 张场景卡（可按剧情需要增减），sceneId 依 "S章-序号" 命名。',
    '  - 描述可用完整句或短段落，重视画面与冲突，不再限制具体字数。',
    '  - `wordQuota` 作为写作目标，可落在 200–320；如情节复杂可适度放宽。',
    '  - `draftFragments` 每章至少 1 段 120–200 字，呈现代表性情绪、线索揭露或推理桥段。',
    '  - `evidenceOut` / `redHerringsOut` 必须引用真实存在的 CL/RH/pXX/cXX/tXX ID，并确保导向环/滑盖、投毒链、镜像误导、时间错位与纸飞机递线等核心元素均有场景承载。',
    '  - `continuityChecks` 聚焦 POV 切换、线索引用衔接、节奏风险与制作注意事项。',
    '  - 仅返回符合结构的 JSON，无需额外说明。',
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
