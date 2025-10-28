# 长篇工作流 QA 看板数据说明

当环境变量 `GPT5STORY_LONGFORM_QA_BOARD` 指向某个目录时，长篇工作流每次完成 `qualityGateEvaluation` 后会在该目录写入 `qa-board.json`。该文件维护一个按时间倒序排序的数组，记录每次生成的质量概览，用于构建仪表板或快速回溯。

## 字段说明

每一条记录为 `QaBoardEntry`：

| 字段 | 说明 |
| --- | --- |
| `traceId` | 工作流运行的全局 ID，对应 Markdown 文件前缀。 |
| `projectId` | Stage0 项目卡 ID。 |
| `createdAt` | 工作流启动时间（ISO 字符串，UTC）。 |
| `titleCandidates` | Stage0 提供的标题候选，便于人工挑选。 |
| `stage5Attempts` | Stage5（长篇草稿）实际尝试次数，含自动回退。 |
| `stage6Attempts` | Stage6（审校）尝试次数。 |
| `autoRevisionRounds` | 自动回退轮次（`stage5Attempts - 1`）。 |
| `reviewMustFix` | 审校 `mustFix` 条目数量。 |
| `reviewWarnings` | 审校警告数量。 |
| `reviewMustFixDetail` | `mustFix` 原文列表。 |
| `reviewWarningsDetail` | `warnings` 原文列表。 |
| `totalWordCount` | 最终稿字数。 |
| `chapterCount` | 最终稿章节数。 |
| `evaluation` | 质量评估报告（score/verdict/strengths/issues/recommendations）。 |
| `markdownPath` | 若启用 `GPT5STORY_LONGFORM_MD_OUT`，指向版本化 Markdown 相对路径。 |

## 使用方式示例

```bash
# 指定 QA 看板与 Markdown 输出目录
export GPT5STORY_LONGFORM_QA_BOARD=$PWD/.artifacts/qa
export GPT5STORY_LONGFORM_MD_OUT=$PWD/.artifacts/markdown

# 运行长篇工作流脚本或通过 API 触发
# ...

# 查看最新记录
jq '.[0]' $GPT5STORY_LONGFORM_QA_BOARD/qa-board.json

# 结合 Markdown 附件
md_rel=$(jq -r '.[0].markdownPath' $GPT5STORY_LONGFORM_QA_BOARD/qa-board.json)
cat "$GPT5STORY_LONGFORM_MD_OUT/$md_rel"
```

> 提示：`qa-board.json` 会持续累积记录，可配合轻量级的仪表板（如静态网页或 Observable notebook）呈现趋势、告警与回退情况。
