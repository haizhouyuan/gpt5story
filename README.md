# GPT-5 Detective Story Generator

這是一個專注於「高品質短篇推理小說」的生成服務。後端以 Node.js + Express 包裝多階段 LangChain 工作流，產出完整的中文偵探故事，並附上故事大綱與自動檢查結果；前端提供簡潔的操作介面，只需輸入主題即可取得成品。

## Monorepo 結構

```
gpt5story/
├── apps/
│   ├── api/          # Express API，只暴露 /api/health 與 /api/generate-story
│   └── web/          # React + Vite 單頁控制臺
├── packages/
│   ├── shared/       # 共享型別與 Zod Schema
│   └── workflow/     # LangChain 工作流（策畫→寫作→審校→修訂）
├── docs/             # 說明文件
└── package.json
```

## 快速起步

```bash
git clone git@github.com:haizhouyuan/gpt5story.git
cd gpt5story

npm install

# 建議於專案根目錄建立 .env，至少設定：
# OPENROUTER_API_KEY=...
# 或 OPENAI_API_KEY=...

# 啟動 API（預設 http://localhost:4000）
PORT=4000 npm run dev -w @gpt5story/api

# 啟動前端控制臺（預設 http://localhost:5173）
npm run dev -w @gpt5story/web

# 測試 / 型別檢查
npm test
npm run lint -w @gpt5story/web
```

## 核心功能

- **單一故事端點**：`POST /api/generate-story`
  - 輸入主題（可附帶既有線索），回傳完整短篇故事。
  - 同時提供故事大綱、審校備註、修訂計畫與驗證報告，方便人工微調。
- **內建內容安全**：關鍵字（成人、暴力、血腥）會被拒絕，避免產出不適內容。
- **前端控制臺**：輸入主題 → 點擊「生成故事」即可觀看結果與分析資訊。

## 長篇工作流（實驗中）

`packages/workflow` 內仍保留 LangChain 長篇多階段流程，方便進行 5000 字級別的偵探小說實驗。近期更新重點：

- **Stage5 ↔ Stage6 自動回退**：審校若出現 `mustFix`（或啟用 `GPT5STORY_LONGFORM_FAIL_ON_WARN` 並產生警告），會觸發 Stage5 草稿自動重寫，再次審校直至通過或超過 `GPT5STORY_LONGFORM_STAGE5_RETRY` 的上限。
- **Stage7 Markdown 版本化**：設定 `GPT5STORY_LONGFORM_MD_OUT=/path/to/storage` 後，最終稿會以 `YYYYMMDD/<traceId>_stage7_vXX_<timestamp>.md` 形式寫入，並在工作流結果中回傳 `markdownPath` 方便追蹤。
- **Quality Gate 評估**：`qualityGateEvaluation` 會呼叫真實 LLM 產生結論（`score`、`verdict`、`recommendations` 等）。
- **QA 看板**：若同時設定 `GPT5STORY_LONGFORM_QA_BOARD=/path/to/board`，每次完成長篇流程會在 `qa-board.json` 追加一筆紀錄（含 traceId、stage5/6 嘗試次數、mustFix 數、最終評分與 Markdown 路徑）。

> 提示：未提供這些環境變數時，仍可在單機環境下執行流程，只是 Markdown 與 QA 看板不會被寫出。

## 文件

- `docs/StoryApp 现状分析与基于 LangChain 的重构方案.md`：原始需求與方案
- `docs/workflow-schema-alignment.md`：工作流資料結構說明
- `docs/quality-checklist.md`：品質檢查與回歸建議
- `docs/end-to-end-testing.md`：端到端測試指引
- `docs/longform-workflow/stage0-data-dictionary.md`：長篇工作流樣本資料字典
- `docs/longform-workflow/qa-board.md`：QA 看板資料格式與操作示例
- `docs/longform-workflow/langgraph-overview.md`：LangGraph 節點、回路與可視化說明

更多細節可參考上述文件。歡迎依需求調整提示詞或 LLM 提供者，以生成不同風格的推理故事。
