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
    '  - `clueMatrix` 至少 8 条核心线索（鼓励 9-10 条），覆盖“滑盖/导向环”“纸飞机牵引”“时间错位（怀表/门磁）”“镜像或直播误导”等要素；每条描述控制在两句以内，并在 `linksToMechanism` 中引用中心诡计节点名称。',
    '  - `timelineAnchors` 需列出 6–7 个关键时间锚点，覆盖案前布置、触发、掩音窗口、误导、复盘等环节；每个锚点必须给出 chapterRef、证据来源与用途。',
    '  - 红鲱鱼数量 2–3 条，突出误导意图；`redHerringRatio` 保持 ≤ 40%。',
    '  - 如果线索或红鲱鱼依赖某角色或道具，应引用其 ID（cXX / pXX）。',
    '  - 所有字符串最长不超过 120 个汉字或 240 字符；`senses` / `linksToMechanism` 控制在 3 项以内。',
    '  - 请在 `fairnessSummary.checks` 中列出 3 条检测项（如“线索前置≥4条”“导向环痕迹显性化”），`risks` 提出 2 条潜在漏洞。',
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
