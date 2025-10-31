# GPT-5 Detective Story Generator

此專案專注於「高品質長篇偵探小說」的生成研究。核心是用 LangGraph 編排的多階段工作流（Stage0–Stage7），涵蓋案件藍圖、角色與線索設計、章節草稿、審校與最終質量評估。過去的短篇服務與前端介面已移除，現以程式化 API 與手動實驗為主。

## Monorepo 結構

```
gpt5story/
├── packages/
│   ├── shared/       # 共享型別與 Zod Schema
│   └── workflow/     # LangGraph 長篇工作流（Stage0–Stage7）
├── docs/             # 說明文件
└── package.json
```

## 快速起步

```bash
git clone git@github.com:haizhouyuan/gpt5story.git
cd gpt5story

npm install

# 若要直接呼叫工作流，請於環境變數設定 OpenRouter 或 OpenAI API Key
# 例如：export OPENROUTER_API_KEY=sk-...
# 若需啟用斷點續跑，可設定緩存路徑：export GPT5STORY_LONGFORM_CACHE=experiments/longform-cache

# 執行單元測試
npm test
```

## LangGraph 長篇工作流

核心邏輯位於 `packages/workflow/src/workflow/longform/`：

- **Stage0–Stage7**：涵蓋專案初始化、案件藍圖、角色與線索矩陣、章節稿、審校與最終潤色。
- **LangGraph 編排**：`langGraphBuilder.ts` 以 `StateGraph` 管理節點、依賴與 Stage5↔Stage6 的自動回退。
- **產出 Artifact**：Stage7 會輸出 Markdown，並可選擇將結果與評分寫入 QA 看板。

示例（使用 `tsx` 呼叫工作流）：

```bash
OPENROUTER_API_KEY=sk-... npx tsx <<'TS'
import 'dotenv/config';
import { createLongformWorkflow } from '@gpt5story/workflow';

const workflow = createLongformWorkflow();
const result = await workflow.invoke({
  instructions: '生成一篇 5000 字的鐘樓密室長篇偵探小說',
  revisionContext: {},
});

console.log(result.artifacts.stage7Polish?.markdown?.slice(0, 200));
TS
```

可透過以下環境變數擴充輸出：

- `GPT5STORY_LONGFORM_MD_OUT`：Stage7 Markdown 會依日期與版本號寫入該資料夾。
- `GPT5STORY_LONGFORM_QA_BOARD`：完成執行後在 `qa-board.json` 累積 trace 與評分紀錄。
- `GPT5STORY_LONGFORM_FAIL_ON_WARN=1`：Stage6若出現 warning 也視為需回退。
- `GPT5STORY_LONGFORM_CACHE`：指定斷點續跑的緩存資料夾，搭配 CLI `--trace-id <id> --resume` 可從中斷處繼續。

LangGraph 結構與事件追蹤可參考 `docs/longform-workflow/langgraph-overview.md`。

### CLI 工作流腳本

專案提供 `npm run longform:run`（使用內建樣本）與 `npm run longform:run:live`（實際呼叫 LLM）兩種腳本。

- 基本指令：
  ```bash
  npm run longform:run            # Fixture，不耗費 LLM 配額
  npm run longform:run:live       # 實機測試，需 OPENROUTER_API_KEY 或 OPENAI_API_KEY
  ```
- 參數：
  - `--instructions=...` 覆蓋生成要求
  - `--trace-id=<uuid> --resume` 配合 `GPT5STORY_LONGFORM_CACHE` 可從指定 trace 續跑
  - `--live` / `--fixture` 強制切換模式

腳本在錯誤時會打印中斷階段與 `traceId`，並給出續跑命令示例。

## 文件

- `docs/StoryApp 现状分析与基于 LangChain 的重构方案.md`：原始需求與方案
- `docs/workflow-schema-alignment.md`：工作流資料結構說明
- `docs/quality-checklist.md`：品質檢查與回歸建議
- `docs/end-to-end-testing.md`：端到端測試指引
- `docs/longform-workflow/stage0-data-dictionary.md`：長篇工作流樣本資料字典
- `docs/longform-workflow/qa-board.md`：QA 看板資料格式與操作示例
- `docs/longform-workflow/langgraph-overview.md`：LangGraph 節點、回路與可視化說明

更多細節可參考上述文件。歡迎依需求調整提示詞或 LLM 提供者，以生成不同風格的推理故事。
