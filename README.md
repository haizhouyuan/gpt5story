# GPT-5 Story

面向儿童推理故事的 LangChain 工作流與前端控制臺。後端採用 Node.js + Express + MongoDB，並結合多階段生成、審校與一次性故事樹流程；前端提供互動故事、故事樹與語音任務視覺化。

## Monorepo 結構

```
gpt5story/
├── apps/
│   ├── api/          # Express API（故事生成 / 工作流 / TTS 任務）
│   ├── web/          # React + Vite 控制臺
├── packages/
│   ├── shared/       # 共享類型、Zod Schema
│   ├── workflow/     # LangChain 工作流（Stage1~Stage4、故事樹）
├── docs/             # 分析與實施文檔
└── package.json
```

## 快速起步

```bash
git clone git@github.com:haizhouyuan/gpt5story.git
cd gpt5story

# 安裝依賴（含 web 工作區）
npm install

# 產生 .env 並設定：
# OPENROUTER_API_KEY=...
# MONGODB_URI=mongodb://localhost:27017
# （更多環境變數參考 docs/StoryApp-阶段进展.md）

# 啟動後端
npm run dev -w @gpt5story/api

# 啟動前端控制臺（預設 http://localhost:5173）
npm run dev -w @gpt5story/web

# 單元測試與 TS 檢查
npm test
npm run lint

# 打包（含 web）
npm run build
```

## 主要功能

- **多階段 LangChain 工作流**：策畫 → 寫作 → 審校 → 修訂，輸出 outline、review notes、修訂計畫與事件流。
- **故事樹生成**：一次性輸出完整分支，API `/api/generate-full-story`。
- **流式 SSE**：`/api/generate-story/stream` 即時回傳階段事件，前端可逐步顯示。
- **語音任務**：模擬 TTS 任務列隊（`/api/tts/tasks`）。
- **Mongo 持久化**：故事快照、工作流執行紀錄、模型配置（`/api/models`）。
- **內容安全與限流**：敏感詞過濾、輸出審查、`express-rate-limit`。

更多背景與設計詳見 `docs/StoryApp 现状分析与基于 LangChain 的重构方案.md` 及更新記錄 `docs/StoryApp-阶段进展.md`。
