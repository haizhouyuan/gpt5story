import type {
  ProjectCard,
  PolishedDraftOutput,
  ReviewReport,
  ClueMatrixOutput,
} from '../../workflow/longform/types.js';

export interface QualityEvaluationPromptInput {
  projectCard: ProjectCard;
  polished: PolishedDraftOutput;
  review: ReviewReport;
  clueMatrix: ClueMatrixOutput;
}

export interface PromptPayload {
  system: string;
  user: string;
}

const toJSON = (value: unknown) => JSON.stringify(value, null, 2);

export const buildQualityEvaluationPrompt = (input: QualityEvaluationPromptInput): PromptPayload => {
  const {
    projectCard,
    polished,
    review,
    clueMatrix,
  } = input;

  const system = [
    '你是一名侦探小说质量评估专家，需要综合审稿成果并给出可执行的 QA 结论。',
    '输出 JSON：',
    '{',
    '  "score": 0-10 之间的小数,',
    '  "verdict": "pass" | "revise",',
    '  "strengths": [""...],',
    '  "issues": [""...],',
    '  "blockingReasons": [""...],',
    '  "recommendations": [""...]',
    '}',
    '评估维度：',
    '  - 诡计创意与公平性（线索前置、误导控制）。',
    '  - 逻辑闭合与动机递进是否自洽。',
    '  - 文风是否符合项目卡定义（童趣一人称、节奏）。',
    '  - 审校报告中的 mustFix 是否均已解除，warnings 是否留有残余风险。',
    '  - 总字数与章节均衡度是否满足目标。',
    '要求：最终 verdict 为 "pass" 时，blockingReasons 必须为空；若 verdict 为 "revise"，请在 blockingReasons 中列出阻塞项并给出对应 recommendations。',
  ].join(' ');

  const user = [
    '【项目卡】',
    toJSON(projectCard),
    '\n【线索矩阵摘要】',
    toJSON(clueMatrix),
    '\n【审校报告（Stage6）】',
    toJSON(review),
    '\n【润色成稿（Stage7）】',
    toJSON(polished),
    '\n请只输出 JSON 结果，不要附加解释。',
  ].join('\n');

  return { system, user };
};
