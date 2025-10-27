## GPT-5 Story 阶段化进展（2025-10）

### LangChain 工作流
- 拆分 Stage1~Stage4：策划 → 写作 → 审校 → 修订，保留 outline、审校意见、修订计划及阶段事件（SSE 接口 /api/generate-story/stream）。
- 一次性故事树 `/api/generate-full-story`：生成多层分支 JSON，解析失败时自动回退至默认树。

### 数据与配置
- MongoDB 落地故事快照、工作流执行、模型配置；提供 `/api/models` 查看/修改模型参数。
- 限流与内容安全：`express-rate-limit`、敏感词过滤、输出审查（containsBannedOutput）。
- 异步 TTS 流程：`POST /api/tts/tasks` 建立任务，`GET /api/tts/tasks/:id` 轮询状态。

### 前端控制台（apps/web）
- React + Vite 控制台 tab：
  - **互動故事**：同步/流式生成，显示阶段事件、审校/修订信息。
  - **故事樹**：调用 `/api/generate-full-story` 并以树状视图展现节点。
  - **語音任務**：创建任务并播放完成的音档。
- `VITE_API_BASE_URL` 控制连线；`npm run dev -w @gpt5story/web` 启动，`npm run build` 包含 web 打包，`npm run lint` 执行前端 TS 检查。

### 自动化验证
- Vitest + MongoMemoryServer 覆盖 API/工作流/模型配置/TTS 场景。
- 前端 TypeScript 检查并通过 `npm run lint` 纳入 CI 流程。
