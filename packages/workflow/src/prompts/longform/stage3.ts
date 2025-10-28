import type {
  ProjectCard,
  MiracleBlueprint,
  CastAndProps,
  ClueMatrixOutput,
} from '../../workflow/longform/types.js';

export interface Stage3StructurePromptInput {
  projectCard: ProjectCard;
  miracleBlueprint: MiracleBlueprint;
  castAndProps: CastAndProps;
  clueMatrix: ClueMatrixOutput;
}

export interface PromptPayload {
  system: string;
  user: string;
}

const toJSON = (value: unknown) => JSON.stringify(value, null, 2);

export const buildStage3StructurePrompt = (input: Stage3StructurePromptInput): PromptPayload => {
  const { projectCard, miracleBlueprint, castAndProps, clueMatrix } = input;

  const system = [
    '你是一名侦探小说“结构统筹师”，负责基于项目信息、中心诡计、角色道具与线索矩阵，为长篇侦探小说生成章节结构与时间轴。',
    '请严格输出 JSON，字段格式如下：',
    '{',
    '  "acts": [{ "act": 1|2|3, "title": "", "purpose": "", "turningPoint": "", "beats": ["", "", ""] }],',
    '  "chapterPlan": [{ "chapter": 数字, "title": "", "wordBudget": 数字, "pov": "蛋蛋|唐笙|第三人称", "summary": "", "keyScenes": [""...], "clueDrops": ["CLXX"...], "endingHook": "" }],',
    '  "timeline": [{ "time": "HH:MM", "chapterRef": 数字, "event": "", "evidence": "", "impact": "" }],',
    '  "spaceNotes": { "locations": [{ "name": "", "description": "", "keyAccessPoints": [""...], "hazards": [""...] }], "movementConstraints": [""...] },',
    '  "gateChecklist": { "beatsPerAct": 数字, "chapters": 数字, "totalWordBudget": 数字, "fairnessAudit": [""...] }',
    '}',
    '要求：',
    '  - 章节数控制在 6–7 章，总 wordBudget 约 4800–5200。',
    '  - 每章必须在 `clueDrops` 中引用现实存在的线索/角色/道具 ID（如 CLxx、pXX、cXX）。',
    '  - 时间线需覆盖案发前后关键分钟，首尾必须有证人或物证支撑。',
    '  - 在 `fairnessAudit` 中标注“导向环痕迹显性化”“投毒链闭环”“镜像误导提示”等检查项。',
  ].join(' ');

  const user = [
    '【项目卡】',
    toJSON(projectCard),
    '\n【中心诡计】',
    toJSON(miracleBlueprint),
    '\n【角色与道具】',
    toJSON(castAndProps),
    '\n【线索矩阵】',
    toJSON(clueMatrix),
    '\n请依据上述内容输出完整结构 JSON。仅返回 JSON，不要加入额外说明。',
  ].join('\n');

  return { system, user };
};

