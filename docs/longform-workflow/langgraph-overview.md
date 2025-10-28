# LangGraph 长篇工作流概览

新的长篇侦探小说生成流程基于 LangGraph 实现：

- **状态模型**：`Annotation.Root` 聚合 `request`、各阶段产物、Stage5/Stage6 尝试次数与跳转标记。
- **节点执行**：每个 Stage 被包装成 Runnable，执行前检查依赖、执行后写回 artifacts 并发射事件。
- **Stage5 ↔ Stage6 回环**：当 Stage6 触发 `Stage6ReviewBlockerError` 时，节点会写入 revision context 并返回 `route: 'retry'`，图通过 `addConditionalEdges` 将流程跳回 Stage5；审校通过则走 `advance` 到 Stage7。
- **上下文复用**：`LongformWorkflowContext` 承载 LLM、事件总线与 ArtifactStore，LangGraph 执行结束后由 `deriveStageStates` / `context.artifacts.dump()` 组装旧有返回结构。

## 可视化工作流

```ts
import { buildLongformGraph } from '@gpt5story/workflow/workflow/longform/langGraphBuilder';
import { createLongformWorkflow } from '@gpt5story/workflow';

const { graph } = createLongformWorkflow();
const compiled = graph.compile();
const png = compiled.getGraph({ xray: true }).draw_mermaid_png();
```

在 Notebook 或脚本中调用 `draw_mermaid_png()` / `draw_mermaid_svg()` 可导出完整节点关系图。

## Execution Trace

启用 `LANGSMITH_TRACING=true`（或 W&B/Comet）即可在外部平台看到每个节点的 prompt/响应；内部事件通过 `WorkflowEventBus` 记录，`LongformWorkflowResult.telemetry.events` 提供回放。

## 注意事项

- Stage 配置来自 `DEFAULT_STAGE_META`，可通过 `stageConfigs` 覆盖重试次数或依赖。
- `GPT5STORY_LONGFORM_MD_OUT`、`GPT5STORY_LONGFORM_QA_BOARD` 仍适用于 Markdown 归档与 QA 看板。
