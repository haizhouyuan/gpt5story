# 品質保障檢查清單

## 自動化覆蓋

- `npm test`：
  - `packages/workflow/tests/storyWorkflow.test.ts` 驗證四階段工作流輸出、遙測與階段狀態。
  - `apps/api/tests/server.test.ts` 覆蓋故事 API、管理端工作流端點、TTS 同步/任務流程。
- `npm run lint -w @gpt5story/web`：前端 TypeScript 型別檢查。

## 手動回歸建議

1. 後端
   - 設置 `.env`：`OPENROUTER_API_KEY`（或 OPENAI key）、`MONGODB_URI`。
   - 如需真實語音合成：補充 `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY`，確認 `POST /api/tts` 回傳 provider=`tencent`。
2. 前端
   - `npm run dev -w @gpt5story/api`、`npm run dev -w @gpt5story/web -- --host 0.0.0.0 --port 8703`。
   - 互動故事：測試同步與 SSE 生成，檢視遙測/修訂摘要。
   - 工作流監控：建立工作流、查看 Stage Activity、使用「重新執行」並確認列表刷新。
   - TTS 任務：建立任務、輪詢至完成並播放音訊。
3. 部署
   - 確保 `TTS_AUDIO_BASE_URL` 指向可公開的靜態資源服務（預設 data URL 亦可）。
   - 建議在 CI 中執行 `npm test` 與 `npm run lint -w @gpt5story/web`。

## 風險與緩解

- **腾讯雲配額耗盡**：API 將自動降級為 mock provider，但請持續監測 `UnsupportedOperation.PkgExhausted` 錯誤。
- **Mongo 連線失敗**：工作流/故事資料將回退至記憶體快照；請檢查 `MONGODB_URI`。
- **SSE 代理超時**：建議於 Nginx/反向代理設定足夠的 `proxy_read_timeout`。

最新狀態請參閱 `README.md` 與 `docs/workflow-schema-alignment.md`。
