# 品質保障檢查清單

## 自動化覆蓋

- `npm test`：
  - `packages/workflow/tests/storyWorkflow.test.ts` 驗證故事工作流輸出的基本結構。
  - `apps/api/tests/server.test.ts` 覆蓋 `/api/health` 與 `/api/generate-story`。
- `npm run lint -w @gpt5story/web`：前端 TypeScript 型別檢查。

## 手動回歸建議

1. 後端
   - 設置 `.env`：`OPENROUTER_API_KEY`（或 OPENAI key）。
   - 啟動 `PORT=4000 npm run dev -w @gpt5story/api` 後，確認 `GET /api/health` 以及 `POST /api/generate-story` 正常。
2. 前端
   - `npm run dev -w @gpt5story/web -- --host 0.0.0.0 --port 8703`。
   - 透過介面輸入多個主題，檢查故事內容與大綱/修訂建議是否同步更新。
3. 部署
   - 建議在 CI 中執行 `npm test` 與 `npm run lint -w @gpt5story/web`。

## 風險與緩解

- **LLM 金鑰失效或配額不足**：API 會返回 503；請重新配置或補充額度。
- **輸入敏感主題**：若命中內建關鍵字（成人、暴力、血腥），會回傳 `CONTENT_VIOLATION`。

更多資訊可參閱 `README.md` 與 `docs/end-to-end-testing.md`。
