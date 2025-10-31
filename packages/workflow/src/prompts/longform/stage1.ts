import type { ProjectCard } from '../../workflow/longform/types.js';

export interface Stage1MiraclePromptInput {
  projectCard: ProjectCard;
  synopsis?: string;
}

export interface PromptPayload {
  system: string;
  user: string;
}

export const buildStage1MiraclePrompt = (input: Stage1MiraclePromptInput): PromptPayload => {
  const { projectCard, synopsis } = input;

  const system = [
    '你是一名本格侦探小说的“诡计设计师”，需要为以下项目卡生成一个完整的中心诡计蓝图。',
    '输出必须是 JSON，字段结构：',
    '{',
    '  "miracleId": "uuid",',
    '  "logline": "",',
    '  "trigger": "",',
    '  "mechanismChain": [{ "order": 数字, "node": "", "type": "自然|装置|心理", "effect": "", "evidenceHooks": [""...] }],',
    '  "weaknesses": [""...],',
    '  "toleranceNotes": "",',
    '  "replicationSteps": [""...],',
    '  "foreshadowingIdeas": [""...],',
    '  "variantSummary": { "holmesStyle": "", "poirotStyle": "", "selected": "holmesStyle|poirotStyle", "reason": "" }',
    '}',
    '要求：',
    '  - 诡计需包含“钟楼密室 + 消失的钥匙孔 + 纸飞机”等组合，保证单人可执行，并考虑音/光/气流等因素。',
    '  - `mechanismChain` 至少 4 个节点，需描述受力/传动路径，并给出可观察的痕迹。',
    '  - `toleranceNotes` 列出关键参数范围与备选方案，控制在 6 行以内。',
    '  - 伏笔要点需符合项目卡的主题意象。',
    '  - 所有字符串最长不超过 120 个汉字或 240 个字符；`evidenceHooks` / `replicationSteps` / `foreshadowingIdeas` 每项最多 3 条；描述尽量短句、避免冗长解释。',
    '  - 如果有公式或数据，请直接写在同一行，避免多段扩写。',
  ].join(' ');

  const userSections = [
    '【项目卡】',
    JSON.stringify(projectCard, null, 2),
  ];

  if (synopsis) {
    userSections.push('【概要说明】');
    userSections.push(synopsis);
  }

  userSections.push('请输出符合结构的 JSON，并确保字段名正确。');

  return {
    system,
    user: userSections.join('\n'),
  };
};
