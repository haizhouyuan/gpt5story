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
    '你是一名侦探小说「结构统筹师」，负责基于项目卡、中心诡计、角色/道具与线索矩阵，规划长篇故事的结构与时间轴。',
    '请输出 JSON，字段格式如下：',
    '{',
    '  "acts": [{ "act": 1|2|3, "title": "", "purpose": "", "turningPoint": "", "beats": ["", "", ""] }],',
    '  "chapterPlan": [{ "chapter": 数字, "title": "", "wordBudget": 数字, "pov": "蛋蛋|唐笙|第三人称", "summary": "", "keyScenes": [""...], "clueDrops": ["CLXX"...], "endingHook": "" }],',
    '  "timeline": [{ "time": "HH:MM", "chapterRef": 数字, "event": "", "evidence": "", "impact": "" }],',
    '  "spaceNotes": { "locations": [{ "name": "", "description": "", "keyAccessPoints": [""...], "hazards": [""...] }], "movementConstraints": [""...] },',
    '  "gateChecklist": { "beatsPerAct": 数字, "chapters": 数字, "totalWordBudget": 数字, "fairnessAudit": [""...] }',
    '}',
    '结构指引：',
    '  - 章节数量建议 6–10 章，可根据节奏与人物线增减；总 wordBudget 目标 4000–9000，允许上下浮动，只要剧情推进合理。',
    '  - acts 维持三幕式，每幕提供 3 条核心节拍即可，文字可为短段落，不必过度压缩。',
    '  - chapterPlan 需说明 POV、场景重心、线索投放与章尾钩子；允许 2–4 个 keyScenes，以利故事展开。',
    '  - `clueDrops` 必须引用实际线索/道具 ID（CLxx/pXX/cXX），并注意前半程需露出 ≥4 条有效线索。',
    '  - timeline 请覆盖准备→触发→混淆→复盘等关键节点，可列 6–8 条，并写明证据或证人支撑。',
    '  - spaceNotes 至少包含钟楼主厅、楼梯井及关键出入口，可额外描述辅助空间；movementConstraints 聚焦通行限制或监控死角。',
    '  - gateChecklist 聚焦质量门槛：线索前置、投毒链闭环、镜像误导提示、读者挑战等。',
    '  - 用自然语句表达即可，无需刻意压缩字数。',
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
