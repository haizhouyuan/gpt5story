Story Workflow Schema Alignment
================================

背景目标
--------
- 现有 `@gpt5story/shared` 只暴露轻量结构（段落、线索列表），无法承载侦探故事多阶段产物。
- reframe 项目通过 `DetectiveWorkflowRecord` 持久化 Outline / StoryDraft / Validation / Meta 等复合实体，是后续阶段扩展的基础。
- 本文给出新旧模型映射与迁移策略，为接入 reframe 级别工作流打地基。

 domain 对照
-----------

| 领域对象 | reframe 位置 | gpt5story 现状 | 差距 |
| --- | --- | --- | --- |
| Outline 蓝图 | `DetectiveOutline` | `StoryOutlinePlan` 聚焦 3 幕与线索 | 缺少角色、时间线、误导矩阵等字段 |
| 草稿正文 | `DetectiveStoryDraft` | 无（仅返回当前段落） | 需承载章节数组、字数统计、修订备注 |
| 审校/验证 | `ValidationReport`、`Stage3AnalysisSnapshot` | `StoryReviewNote[]` | 缺乏验证结果、Beta Reader 洞察、修订计划结构化信息 |
| 修订计划 | `RevisionPlanSummary` | `StoryRevisionPlan` 仅 summary/actions | 需引入 mustFix/warnings/suggestions 分类 |
| 遥测与元数据 | `DetectiveWorkflowMeta` | 无 | 需要记录阶段遥测、线索图快照、契约版本 |
| TTS 资产 | `DetectiveStoryAudioAsset` | `TtsTask` mock | 需要 provider 元数据、缓存信息 |

 类型扩展方案
-----------
1. 在 `packages/shared/src/types` 下新增 `workflow.ts`，引入以下结构：
   - `DetectiveOutline`, `DetectiveCharacter`, `DetectiveClue`, `DetectiveTimelineEvent` 等子类型（参考 reframe 并裁剪非必要字段）。
   - `StoryDraftChapter`, `StoryDraft`, `RevisionPlanIssue`, `RevisionPlanSummary`。
   - `WorkflowExecutionMeta`：囊括 `StageLog`、`ClueGraphSnapshot`、`MysteryContract` 等可扩展字段。
2. 保留现有 `StoryOutlinePlan` / `StoryRevisionPlan`，但通过交叉类型增加`acts/clues`补充字段，使旧调用保持兼容。
3. `packages/shared/src/index.ts` 导出新类型，并准备 JSON Schema（下一阶段可按需生成）。

 数据存储结构
-----------
- 新建集合 `workflow_records`（或重用 `workflow_executions` 并扩充字段），文档示例：
  ```
  {
    traceId: string,
    topic: string,
    outline: DetectiveOutline,
    draft: StoryDraft,
    review: { notes: StoryReviewNote[], validation?: ValidationReport },
    revisionPlan: RevisionPlanSummary,
    stageStates: WorkflowStageState[],
    meta: WorkflowExecutionMeta,
    createdAt: ISOString,
    updatedAt: ISOString
  }
  ```
- 保留旧字段 `segment`、`events` 等，方便过渡与回溯。

 迁移步骤
--------
1. **阶段 0（当前）**：引入新类型定义与共享接口，不改动现有 API 行为。
2. **阶段 1**：工作流执行结果落地上述结构；新增 `stageStates`、`meta` 字段。
3. **阶段 2**：改写 API 持久层，按 `traceId` 读写新文档；保留旧 `workflow_executions` 作为回放。
4. **阶段 3**：数据迁移脚本
   - 遍历旧集合 -> 生成默认 `StoryDraft`（仅包含最后段落）与空 `ValidationReport`。
   - 标记 `meta.migrationVersion = 1` 便于后续审计。
5. 提供回滚策略：保留原集合备份；`migrationVersion` < 1 的文档仍可按旧结构读取。

 风险与兼容性
-----------
- JSON 体积增大：需确认 Mongo 文档大小保持 < 16MB；阶段性可裁剪未使用字段。
- 前端短期内只需读取 `story.segment`，新结构应向下兼容。
- LangChain 工作流将基于新类型返回更复杂数据，应在过渡期提供 fallback 逻辑。

下一步
------
- 实施 `packages/shared` 类型扩展并同步单元测试。
- 拓展 `apps/api/src/repositories/workflowRepository.ts` 接口签名（阶段 1 执行）。
- 设计阶段遥测与事件结构，实现 `WorkflowStageExecution` 存储（阶段 1/2）。
- 新增管理端 API：`POST /api/workflows`、`POST /api/workflows/:traceId/retry`、`GET /api/workflows/:traceId/stage-activity`，供运营控制台读取阶段列表、重跑与查看遥测（阶段 2）。
