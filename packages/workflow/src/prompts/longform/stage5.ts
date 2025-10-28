import type {
  ProjectCard,
  StructurePlanOutput,
  SceneDesignOutput,
  ClueMatrixOutput,
  LongformDraftOutput,
  ReviewReport,
} from '../../workflow/longform/types.js';

export interface Stage5DraftPromptInput {
  projectCard: ProjectCard;
  structurePlan: StructurePlanOutput;
  scenes: SceneDesignOutput;
  clueMatrix: ClueMatrixOutput;
  revision?: {
    attempt: number;
    maxAttempts: number;
    previousDraft: LongformDraftOutput;
    feedback: ReviewReport;
  };
}

export interface PromptPayload {
  system: string;
  user: string;
}

const toJSON = (value: unknown) => JSON.stringify(value, null, 2);

export const buildStage5DraftPrompt = (input: Stage5DraftPromptInput): PromptPayload => {
  const {
    projectCard,
    structurePlan,
    scenes,
    clueMatrix,
    revision,
  } = input;

  const systemSections: string[] = [
    revision
      ? `你是一名侦探小说长篇写手，正在进行第 ${revision.attempt} 次修订（总允许 ${revision.maxAttempts} 次），需对审校指出的问题进行针对性整改。`
      : '你是一名侦探小说长篇写手，根据章节计划与场景卡生成第一版成稿。',
    '输出 JSON：',
    '{',
    '  "chapterDrafts": [{ "chapter": 数字, "title": "", "pov": "", "wordCount": 数字, "text": "正文" }],',
    '  "appendices": { "clueRecap": [{ "id": "CLXX", "excerpt": "", "chapterRef": 数字 }], "timelineRecap": [{ "time": "HH:MM", "event": "", "chapterRef": 数字 }], "revisionNotes": [""...] },',
    '  "metrics": { "totalWordCount": 数字, "averageChapterLength": 数字 }',
    '}',
    '要求：',
    '  - 总字数控制在 4800–5200，章均 700–900 字。',
    '  - 每章文本需包含【线索ID】与【提示】，引用 `clueMatrix` 中的 ID。',
    '  - 特别照顾：导向环/滑盖、投毒链、镜像误导、门磁延时、纸飞机递线，均需出现在正文中。',
    '  - POV 需符合 `chapterPlan`；「学舌」表达仅在核心发现、时间锚、读者挑战、终盘使用。',
  ];

  if (revision) {
    systemSections.push(
      '  - 必须逐条修复审校报告中的 mustFix，warnings 需明确说明处理方式；无法立即修复的条目写入 `appendices.revisionNotes` 并给出后续行动。',
    );
  }

  const system = systemSections.join(' ');

  const userSections: string[] = [
    '【项目卡】',
    toJSON(projectCard),
    '\n【章节结构计划】',
    toJSON(structurePlan),
    '\n【场景卡与片段】',
    toJSON(scenes),
    '\n【线索矩阵】',
    toJSON(clueMatrix),
  ];

  if (revision) {
    userSections.push(
      '\n【上一版长篇草稿】',
      toJSON(revision.previousDraft),
      '\n【上一轮审校反馈】',
      toJSON(revision.feedback),
      '\n请在修订稿中对 mustFix 与 warnings 逐项响应：\n- 对应章节直接改写或补写；\n- 无法立即处理的条目列入 appendices.revisionNotes 并注明后续步骤；\n- 保留上一版中已经有效的线索节奏与角色呼应。',
    );
  }

  userSections.push('\n请生成 JSON，勿输出其他文字。');

  const user = userSections.join('\n');

  return { system, user };
};
