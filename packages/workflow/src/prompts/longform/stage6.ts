import type {
  ProjectCard,
  LongformDraftOutput,
  ClueMatrixOutput,
  ReviewReport,
} from '../../workflow/longform/types.js';

export interface Stage6ReviewPromptInput {
  projectCard: ProjectCard;
  draft: LongformDraftOutput;
  clueMatrix: ClueMatrixOutput;
  revision?: {
    attempt: number;
    previousReview: ReviewReport;
  };
}

export interface PromptPayload {
  system: string;
  user: string;
}

const toJSON = (value: unknown) => JSON.stringify(value, null, 2);

export const buildStage6ReviewPrompt = (input: Stage6ReviewPromptInput): PromptPayload => {
  const {
    projectCard,
    draft,
    clueMatrix,
    revision,
  } = input;

  const systemSections: string[] = [
    revision
      ? `你是一名侦探小说“公平性审校员”，正在进行第 ${revision.attempt} 次复核，需要确认上一轮 mustFix/warnings 是否已经解决。`
      : '你是一名侦探小说“公平性审校员”，需要对成稿进行规则检查并生成结构化报告。',
    '输出 JSON：',
    '{',
    '  "checks": [{ "rule": "", "status": "pass|warn|fail", "detail": "", "evidence": ["CLXX"...] }],',
    '  "logicChain": [{ "step": 数字, "claim": "", "supportedBy": ["CLXX"...] }],',
    '  "mustFix": [""...],',
    '  "warnings": [""...],',
    '  "suggestions": [""...],',
    '  "metrics": { "clueCoverage": "", "redHerringRatio": "", "wordCountCheck": "", "toneConsistency": "" }',
    '}',
    '检查重点：',
    '  - 导向环/滑盖、投毒链、镜像误导是否在正文中显性出现。',
    '  - 投毒链是否有唯一接触证据（杯盖/化验等）。',
    '  - 动机递进是否合理（冲突→威胁→行动）。',
    '  - Word Count 是否符合项目卡目标。',
  ];

  if (revision) {
    systemSections.push(
      '  - 必须检查上一轮 mustFix 是否全部关闭；若仍未达标，请在 mustFix 中保留并补充新的证据指引。',
    );
  }

  const system = systemSections.join(' ');

  const userSections: string[] = [
    '【项目卡】',
    toJSON(projectCard),
    '\n【线索矩阵】',
    toJSON(clueMatrix),
    '\n【长篇草稿】',
    toJSON(draft),
  ];

  if (revision) {
    userSections.push(
      '\n【上一轮审校要点】',
      toJSON(revision.previousReview),
      '\n请重点说明本轮是否消除了上一轮的 mustFix/warnings；保留未解决项并给出证据。',
    );
  }

  userSections.push('\n请输出 JSON 审校报告，仅返回 JSON。');

  const user = userSections.join('\n');

  return { system, user };
};
