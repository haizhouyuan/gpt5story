Detective Story Response Structure
==================================

簡化後的服務只關注「輸入主題 → 產出短篇推理小說」，但仍保留一套多階段工作流以便提升品質。本文件整理 API 回傳資料與工作流階段的對應關係。

API 回傳
--------
`POST /api/generate-story` 會回傳下列結構：

```
{
  "success": true,
  "data": {
    "traceId": "uuid",
    "story": "最終故事全文",
    "outline": {
      "acts": [ { "title": "Act 1", "summary": "..." }, ... ]
    },
    "reviewNotes": [ { "id": "...", "severity": "warn", "message": "..." } ],
    "revisionPlan": { "summary": "...", "actions": ["..."] },
    "validationReport": {
      "summary": { "pass": 3, "warn": 1, "fail": 0 },
      "results": [ { "ruleId": "clue-payoff", "status": "pass" } ]
    }
  }
}
```

工作流階段
---------
- **Stage 1 – 策畫**：以主題生成案件藍圖、推理節拍，輸出 `outline`。
- **Stage 2 – 寫作**：根據藍圖撰寫完整故事文本，並提供草稿資訊（目前僅用於內部品質驗證）。
- **Stage 3 – 審校**：執行規則檢查，生成 `reviewNotes` 與 `validationReport`。
- **Stage 4 – 修訂建議**：整理 `revisionPlan`，提示可能需要補強的段落。

保留結構
--------
工作流仍使用 `packages/shared/src/types/workflow.ts` 中的 `DetectiveOutline`、`StoryDraft` 等定義，以利未來擴充。但目前 API 只公開其中的核心資訊（大綱、審校、修訂、驗證），其餘內容仍可透過工作流內部擴展引用。

若要自訂輸出欄位，可調整 `@gpt5story/workflow` 中各 Stage 的回傳資料或 API 內的整合邏輯。EOF
