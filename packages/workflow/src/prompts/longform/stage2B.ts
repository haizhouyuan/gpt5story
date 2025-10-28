import type { CastAndProps, ProjectCard, MiracleBlueprint } from '../../workflow/longform/types.js';

export interface Stage2BCluePromptInput {
  projectCard: ProjectCard;
  miracleBlueprint: MiracleBlueprint;
  castAndProps: CastAndProps;
}

export interface PromptPayload {
  system: string;
  user: string;
}

const serialize = (value: unknown) => JSON.stringify(value, null, 2);

export const buildStage2BCluePrompt = (input: Stage2BCluePromptInput): PromptPayload => {
  const { projectCard, miracleBlueprint, castAndProps } = input;

  const system = [
    '你是一名侦探小说的“线索经济学”设计师，负责生成线索矩阵、红鲱鱼、时间锚点与公平性摘要。',
    '请严格输出 JSON，字段与结构如下：',
    '{',
    '  "clueMatrix": [ { "id": "CLXX", "category": "线索|证词|物证", "surfaceMeaning": "", "realMeaning": "", "firstAppearance": "第X章", "revealPoint": "第Y章", "senses": ["视觉"...], "linksToMechanism": ["机制节点关键词"] } ],',
    '  "redHerrings": [ { "id": "RH-XX", "type": "命名|空间|材质|事件|人设", "setup": "", "truth": "", "counterScene": "第X章" } ],',
    '  "timelineAnchors": [ { "time": "HH:MM", "chapterRef": 数字, "event": "", "evidence": "", "relevance": "" } ],',
    '  "fairnessSummary": { "clueCount": 数字, "redHerringRatio": "百分比", "checks": ["..."], "risks": ["..."] }',
    '}',
    '请确保：',
    '  - `clueMatrix` 至少 12 条，覆盖“滑盖/导向环”“门磁延时”“投毒链”“镜像误导”等关键机制，并在 `linksToMechanism` 中引用中心诡计节点名称。',
    '  - `timelineAnchors` 至少 8 个，且首尾时间点均有证人或物证支撑。',
    '  - 红鲱鱼数量 5 条左右，`redHerringRatio` ≤ 40%。',
    '  - 如果线索或红鲱鱼依赖某角色或道具，应引用其 ID（cXX / pXX）。',
    '  - 请在 `fairnessSummary.checks` 中列出检测项（如“线索前置≥4条”“导向环痕迹显性化”），`risks` 中提到潜在漏洞。',
  ].join(' ');

  const user = [
    '【项目卡】',
    serialize(projectCard),
    '\n【中心诡计（JSON）】',
    serialize(miracleBlueprint),
    '\n【角色与道具】',
    serialize(castAndProps),
    '\n请依据上述信息输出线索矩阵 JSON。',
    '请勿返回除 JSON 以外的文字。',
  ].join('\n');

  return { system, user };
};
