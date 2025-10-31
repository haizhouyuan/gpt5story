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
      ? `你是一名侦探小說長篇寫手，正在進行第 ${revision.attempt} 次修訂（總允許 ${revision.maxAttempts} 次），需針對審校的 mustFix 與重點 warnings 做結構與細節級別的調整。`
      : '你是一名侦探小說長篇寫手，需依章節計畫與場景卡生成高品質初稿，重視節奏與可讀性。',
    '輸出 JSON：',
    '{',
    '  "chapterDrafts": [{ "chapter": 整數, "title": "", "pov": "", "wordCount": 整數, "text": "正文" }],',
    '  "appendices": { "clueRecap": [{ "id": "CLXX", "excerpt": "", "chapterRef": 整數 }], "timelineRecap": [{ "time": "HH:MM", "event": "", "chapterRef": 整數 }], "revisionNotes": [""...] },',
    '  "metrics": { "totalWordCount": 整數, "averageChapterLength": 整數 }',
    '}',
    '寫作原則：',
    '  - 以流暢敘事與讀者體驗為優先。建議總字數落在 4000–9000 字；若逼近上限，可優先壓縮敘述但保留核心線索與節奏。',
    '  - 建議每章 500–850 字，寫滿後請盡快收束並轉入下一章，避免篇幅過長導致尾段被截斷。',
    '  - 每章需自然融入 `clueMatrix` 中的線索，直接以敘事或對話呈現即可（無需使用【CLxx】方括號）；在 `appendices.clueRecap` 彙總線索對應章節。',
    '  - 核心機制（導向環/滑蓋、投毒鏈、紙飛機牽引、鏡像直播、懷表/門磁時間差）都要在不同章節逐步鋪陳與回收。',
    '  - POV 必須符合 `chapterPlan`；「學舌」口吻維持少年感，但只在重點線索、時間錨點、讀者挑戰與終盤使用，避免濫用。',
    '  - 允許根據劇情需要調整章節字數與場景長度，但需保持整體結構與節拍準確。',
    '  - 請務必在輸出末尾完整給出 `appendices` 及 `metrics`，即使正文需要微幅壓縮，也不能省略這些欄位。',
  ];

  if (revision) {
    systemSections.push(
      '  - 必須逐條修復審校報告中的 mustFix，對 warnings 需明確說明處理方式；無法立即修復的條目寫入 `appendices.revisionNotes` 並給出後續行動。',
      '  - 至少新增一條可早期露出的有效線索（並補入線索矩陣與章節正文），確保總數≥8。',
      '  - 重寫涉及「糖紙摩擦辨味」的段落，改為符合程序：拍照記錄→第三方採樣→封存→與嫌疑樣本比對，並在正文中給出具體步驟。',
      '  - 加入直播鏡像的客觀佐證（UI 位置、鏡像標記或第三方截圖），由旁觀者或技術人員當場確認。',
      '  - 在第1–2章穿插懷表走時不准、修件延遲、教師焦慮等伏筆，使動機遞進自然。',
      '  - 為 RH-02（备用钥匙）補上一幕明確反證，證明當日未動用備用鑰匙。',
      '  - 在復現或調查過程中補充對石墨/糖渍的快速检證或實驗，提升證據客觀度。',
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
