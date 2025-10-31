End-to-End Testing Guide
========================

本指引說明如何在本地驗證「長篇偵探小說」LangGraph 工作流的運行結果與產物。

環境需求
--------
- Node.js 20+、npm 10+
- 具備可用的 LLM API Key（如 `OPENROUTER_API_KEY` 或 `OPENAI_API_KEY`）
- 可選：
  - `GPT5STORY_LONGFORM_MD_OUT`：Stage7 Markdown 版本化輸出目錄
  - `GPT5STORY_LONGFORM_QA_BOARD`：QA 看板 (`qa-board.json`) 輸出目錄

執行工作流
------------

### 使用專案內建腳本

```bash
npm run longform:run           # 使用內建 fixture，不會調用真實 LLM
npm run longform:run:live      # 調用真實 LLM（需事先準備 OPENROUTER_API_KEY 或 OPENAI_API_KEY）
```

腳本位於 `scripts/run-longform.ts`，預設會讀取 `packages/workflow/tests/fixtures/longform-samples/` 中的樣本資料並輸出 trace 資訊，方便驗證 LangGraph 節點與 LangSmith 追蹤。加上 `--live` 或執行 `npm run longform:run:live` 時，會改用真實 LLM，請務必確保 `.env` 已設定對應的憑證。

若希望在中途中斷後續跑，可設定緩存路徑並重試：

```bash
export GPT5STORY_LONGFORM_CACHE=experiments/longform-cache
npm run longform:run:live -- --trace-id=<trace-id> --resume
```

當執行失敗時，CLI 會輸出失敗階段、traceId 以及建議的續跑命令。Trace 也會同步保存在 LangSmith，方便比對輸入輸出。

### 使用自訂 tsx 片段

```bash
npm install

export OPENROUTER_API_KEY=sk-...   # 或設定 OPENAI_API_KEY

npx tsx <<'TS'
import 'dotenv/config';
import { createLongformWorkflow } from '@gpt5story/workflow';

const workflow = createLongformWorkflow();
const result = await workflow.invoke({
  instructions: '生成一篇 5000 字的鐘樓密室長篇偵探小說',
});

const polished = result.artifacts.stage7Polish;
console.log('Markdown excerpt:\n', polished?.markdown?.slice(0, 400) ?? 'N/A');
console.log('Markdown path:', polished?.markdownPath ?? '(未設定 GPT5STORY_LONGFORM_MD_OUT 無檔案產生)');
if (process.env.GPT5STORY_LONGFORM_QA_BOARD) {
  console.log('Latest QA board entry:', `${process.env.GPT5STORY_LONGFORM_QA_BOARD}/qa-board.json`);
}
TS
```

驗證重點
--------
1. **Stage 產物完整性**：`result.artifacts` 應包含 Stage0–Stage7 以及 `qualityGateEvaluation`；Stage7 需回傳 `finalDraft`、`appliedChanges`、`markdown` 等欄位。
2. **自動回退行為**：若 Stage6 出現 `mustFix`，事件紀錄 (`result.telemetry.events`) 會顯示 Stage5/Stage6 再次執行，且最終 `mustFix` 應為空陣列。
3. **檔案輸出（可選）**：
   - 設定 `GPT5STORY_LONGFORM_MD_OUT` 後，Stage7 會將 Markdown 以 `YYYYMMDD/<traceId>_stage7_vXX_<timestamp>.md` 寫入。
   - 設定 `GPT5STORY_LONGFORM_QA_BOARD` 後，完成時會在該目錄更新 `qa-board.json`，可用 `jq '.[0]' qa-board.json` 查看最近一次執行紀錄。

排錯建議
--------
- 若輸出為占位文字，代表 LLM 凭證無效或未設置，請確認環境變數。
- 可配合 LangSmith、Weights & Biases 等工具追蹤節點執行情況；或參考 `docs/longform-workflow/langgraph-overview.md` 以 `draw_mermaid_png()` 輸出圖形化結構。

完成以上步驟，即可確認長篇工作流能從指令產出完整偵探小說稿與相關品質檢查資訊。EOF
