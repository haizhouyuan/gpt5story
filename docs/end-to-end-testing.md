End-to-End Testing Guide
========================

本指引說明如何驗證「短篇推理小說生成」服務在本地或遠端環境的整體流程。

環境需求
--------
- 位置：`gpt5story/`
- Node.js 20+、npm 10+
- `.env` 提供有效的 LLM API key（如 `OPENROUTER_API_KEY`）

服務啟動
--------
```bash
# 啟動 API（預設 4000）
PORT=4000 npm run dev -w @gpt5story/api > /tmp/gpt5story-api.log 2>&1 &

# 啟動前端（示例：8703 端口）
VITE_API_BASE_URL=http://localhost:4000 \
  npm run dev -w @gpt5story/web -- --host 0.0.0.0 --port 8703 --strictPort \
  > /tmp/gpt5story-web.log 2>&1 &

# 確認端口
ss -ltnp | grep -E '(:4000|:8703)'
```

測試步驟
--------
1. **瀏覽器開啟** `http://<host>:8703/`
2. 輸入故事主題（例如「霧夜古堡的疑案」），可選填「既有線索」。
3. 點擊「生成故事」，待呼叫 `/api/generate-story` 完成後，頁面會顯示：
   - 完整故事文本
   - 故事大綱（Acts）
   - 審校備註與修訂建議
   - 自動驗證結果（Pass/Warn/Fail）
4. 多次測試不同主題，檢查故事內容是否符合推理小說敘事（可以著重在結尾是否交代線索）。

API 驗證
--------
```bash
# 健康檢查
curl http://localhost:4000/api/health

# 生成故事
curl -X POST http://localhost:4000/api/generate-story \
  -H "Content-Type: application/json" \
  -d '{"topic":"午夜列車懸案","historyContent":"","turnIndex":0}' | jq '.'
```

相應 JSON 中 `data.story` 為完整故事內容，`outline/reviewNotes/revisionPlan/validationReport` 可用於人工審閱。

排錯建議
--------
- `tail -f /tmp/gpt5story-api.log`：API 輸出；若 LLM 金鑰失效會於此群報錯。
- `tail -f /tmp/gpt5story-web.log`：前端啟動狀態。
- 若呼叫 API 失敗，確認 `.env` 是否設定有效的 OpenAI/OpenRouter API Key。

完成上述測試，即可確認系統能輸入主題並產出完整的短篇推理小說。EOF
