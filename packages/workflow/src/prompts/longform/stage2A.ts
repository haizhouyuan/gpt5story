import type { ProjectCard } from '../../workflow/longform/types.js';

export interface Stage2ACastPromptInput {
  projectCard: ProjectCard;
  miracleBlueprintSummary: string;
}

export interface PromptPayload {
  system: string;
  user: string;
}

export const buildStage2ACastPrompt = (input: Stage2ACastPromptInput): PromptPayload => {
  const { projectCard, miracleBlueprintSummary } = input;
  const system = [
    '你是一名侦探小说的“角色与道具架构师”，负责根据已有项目卡与中心诡计，产出角色名单与关键道具清单。',
    '输出必须是 JSON，并严格遵循字段名与结构要求。',
    '角色需标注首露章节与动机/秘密，道具需区分机关/证物/日常并给出埋设与回收章节提示。',
    '确保角色/道具数量符合青少年本格作品需求：角色≥7（含主角），道具8–10。',
  ].join(' ');

  const user = [
    '【项目卡】',
    JSON.stringify(projectCard, null, 2),
    '\n【中心诡计摘要】',
    miracleBlueprintSummary.trim(),
    '\n请输出如下 JSON：',
    '{',
    '  "characters": [',
    '    { "id": "cXX", "name": "", "role": "", "motiveOrSecret": "", "firstHint": "第X章" }',
    '  ],',
    '  "props": [',
    '    { "id": "pXX", "name": "", "category": "机关|证物|日常", "description": "", "plantChapterHint": "第X章", "payoffChapterHint": "第Y章" }',
    '  ]',
    '}',
    ' - `id` 请保持顺序编号，例如 c01、c02、p01、p02。',
    ' - `category` 仅允许「机关」「证物」「日常」或其组合描述。',
    ' - `motiveOrSecret` 保持简洁（≤30 字），突出线索价值。',
    ' - `plantChapterHint` / `payoffChapterHint` 用“第X章”中文格式表示。',
    ' - 请确认主角（例如“蛋蛋”）与关键配角均在列表中。',
  ].join('\n');

  return { system, user };
};
