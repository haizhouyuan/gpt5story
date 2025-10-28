import type {
  ProjectCard,
  LongformDraftOutput,
  ReviewReport,
  ClueMatrixOutput,
} from '../../workflow/longform/types.js';

export interface Stage7PolishPromptInput {
  projectCard: ProjectCard;
  draft: LongformDraftOutput;
  review: ReviewReport;
  clueMatrix: ClueMatrixOutput;
}

export interface PromptPayload {
  system: string;
  user: string;
}

const toJSON = (value: unknown) => JSON.stringify(value, null, 2);

export const buildStage7PolishPrompt = (input: Stage7PolishPromptInput): PromptPayload => {
  const { projectCard, draft, review, clueMatrix } = input;

  const system = [
    '你是一名侦探小说的终稿润色编辑，需要根据审校报告对草稿进行修订并输出最终文本，同时记录变更与下一步。',
    '输出 JSON：',
    '{',
    '  "finalDraft": { "totalWordCount": 数字, "chapters": draft.chapterDrafts },',
    '  "appliedChanges": [""...],',
    '  "nextSteps": [""...]',
    '}',
    '要求：',
    '  - 根据审校中 `mustFix` 和 `warnings` 项逐条处理，列在 `appliedChanges`。',
    '  - 若无法在稿内修复，列入 `nextSteps`。',
    '  - 维持【线索ID】标签不变，补充导向环受力、投毒流程、镜像伏笔等缺失描写。',
    '  - 将学舌口吻集中在关键节点，整体语气保持童趣与推理严谨。',
  ].join(' ');

  const user = [
    '【项目卡】',
    toJSON(projectCard),
    '\n【线索矩阵】',
    toJSON(clueMatrix),
    '\n【长篇草稿（Stage5 输出）】',
    toJSON(draft),
    '\n【审校报告（Stage6 输出）】',
    toJSON(review),
    '\n请输出润色结果 JSON，仅返回 JSON。',
  ].join('\n');

  return { system, user };
};

