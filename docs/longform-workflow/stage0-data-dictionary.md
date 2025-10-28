# 长篇侦探小说工作流阶段数据字典（Stage0 基线）

本文件记录 `experiments/longform-run-v2` 最新一次完整手动流水线的阶段产物结构，用于后续在 LangChain 工作流中固化 Schema、生成器以及校验器。每个阶段均列出输出文件、核心字段、字段说明与后续处理注意事项。

> 所有示例均来自 2025-10-27 的 v2 样本数据。正式工作流需要将下列结构转为 Pydantic Schema 并在阶段执行时强制校验。

---

## Stage0 – Project Card（项目卡）

- **文件**：`experiments/longform-run-v2/stage0_project_card.txt`
- **顶层结构**：JSON 对象 `ProjectCard`
- **字段**：
  | 字段 | 类型 | 说明 |
  | --- | --- | --- |
  | `projectId` | `string` (UUID) | 唯一标识本次项目，后续写入上下文。 |
  | `titleCandidates` | `string[3]` | 备选标题，Stage5 可用作章标题参考。 |
  | `series` | `string` | 固定为“蛋蛋侦探事件簿”。 |
  | `genreTags` | `string[>=3]` | 风格标签，用于 Prompt A/B。 |
  | `themes` | `string[<=3]` | 意象关键词，注入 Stage1/Stage3。 |
  | `targetWordCount` | `number` | 目标字数（5000）。 |
  | `definitionOfDone` | `string[]` | 验收标准列表，Stage6 校验需引用。 |
  | `risks` | `Risk[]` | 风险项，含 `id`/`risk`/`mitigation`。 |
  | `successMetrics` | `Metric[]` | 指标项，含 `metric` 与 `target`。 |

> **注意**：Stage0 输出需存入 Artifact Store，后续阶段引用 `definitionOfDone` 与 `successMetrics` 做校验说明。

---

## Stage1 – Miracle Blueprint（中心诡计蓝图）

- **文件**：`stage1_miracle.txt`
- **结构**：`MiracleBlueprint`
  | 字段 | 说明 |
  | --- | --- |
  | `miracleId` (`UUID`) | 蓝图 ID。 |
  | `logline` / `trigger` | 诡计概述与触发条件。 |
  | `mechanismChain` (`MechanismNode[]`) | 至少 4 个节点，含 `order`/`node`/`type`/`effect`/`evidenceHooks`。 |
  | `weaknesses` | 风险点列表。 |
  | `toleranceNotes` | 参数、公差与备选方案。 |
  | `replicationSteps` | 实操步骤。 |
  | `foreshadowingIdeas` | 伏笔提示。 |
  | `variantSummary` | Holmes/Poirot 风格对比与选用理由。 |

> **注意**：`mechanismChain` 中的 `node` 值将用于 Stage2B `linksToMechanism` 与 Stage4/5 的提示查找。

---

## Stage2A – Cast & Props（角色与道具）

- **文件**：`stage2a_cast_props.txt`
- **结构**：
  - `characters`: `Character[]`（含 `id`, `name`, `role`, `motiveOrSecret`, `firstHint`）。
  - `props`: `Prop[]`（含 `id`, `name`, `category`, `description`, `plantChapterHint`, `payoffChapterHint`）。

> **注意**：角色 ID 采用 `cXX`，道具/证物 ID 采用 `pXX`。Stage4/Stage5 需在 `clueDrops` 中引用这些 ID。

---

## Stage2B – Clue Matrix（线索矩阵）

- **文件**：`stage2b_clues.txt`
- **结构**：
  - `clueMatrix`: `ClueItem[]`
    - 字段包括 `id` (`CLXX`)、`category`、`surfaceMeaning`、`realMeaning`、`firstAppearance`、`revealPoint`、`senses`、`linksToMechanism`（数组，对应 Stage1 节点关键词）。
  - `redHerrings`: `RedHerring[]`，含 `id` (`RH-XX`)、`type`、`setup`、`truth`、`counterScene`。
  - `timelineAnchors`: `TimelineAnchor[]`，字段 `time`、`chapterRef`、`event`、`evidence`、`relevance`。
  - `fairnessSummary`: `{ clueCount, redHerringRatio, checks[], risks[] }`。

> **注意**：`linksToMechanism` 中需显式覆盖“导向环/滑盖”“投毒链”“镜像提示”等关键节点，后续校验将检测这些条目的存在。

---

## Stage3 – Structure & Timeline（结构节拍）

- **文件**：`stage3_structure.txt`
- **结构**：
  - `acts`: `Act[]`，含 `act`、`title`、`purpose`、`turningPoint`、`beats[3]`。
  - `chapterPlan`: `ChapterPlan[]`（`chapter`, `title`, `wordBudget`, `pov`, `summary`, `keyScenes`, `clueDrops`, `endingHook`）。
  - `timeline`: `TimelineEvent[]`（`time`, `chapterRef`, `event`, `evidence`, `impact`）。
  - `spaceNotes`: `{ locations: LocationNote[], movementConstraints: string[] }`。
  - `gateChecklist`: `{ beatsPerAct, chapters, totalWordBudget, fairnessAudit[] }`。

> **注意**：`chapterPlan.clueDrops` 须引用 Stage2B/Stage2A ID；`wordBudget` 之和应接近 5000。

---

## Stage4 – Scene Cards & Draft Fragments

- **文件**：`stage4_scenecards.txt`
- **结构**：
  - `sceneCards`: `SceneCard[]`，字段 `sceneId`, `chapter`, `pov`, `goal`, `conflict`, `evidenceOut[]`, `redHerringsOut[]`, `sensoryDetail`, `emotionBeat`, `exitHook`, `wordQuota`。
  - `draftFragments`: `DraftFragment[]`（`chapter`, `pov`, `approxWords`, `text`）。
  - `continuityChecks`: `string[]`。

> **注意**：`evidenceOut`/`redHerringsOut` 应以 `CLXX`/`RH-XX`/`pXX`/`tXX` 等 ID 命名，方便 Stage5 校验引用完整性。

---

## Stage5 – Longform Draft（首次成稿）

- **文件**：`stage5_longform.txt`
- **结构**：
  - `chapterDrafts`: `ChapterDraft[]`（含 `chapter`, `title`, `pov`, `wordCount`, `text`）。
  - `appendices`: `{ clueRecap[], timelineRecap[], revisionNotes[] }`。
  - `metrics`: `{ totalWordCount, averageChapterLength }`。

> **注意**：`text` 内使用 `【线索ID】`、`【提示】` 标签；`appendices` 将在 Stage7 Markdown 中附录。

---

## Stage6 – Review Report（自动审校）

- **文件**：`stage6_review.txt`
- **结构**：
  - `checks`: `CheckItem[]`，字段 `rule`, `status (pass|warn|fail)`, `detail`, `evidence[]`。
  - `logicChain`: `LogicStep[]`，包含 `step`, `claim`, `supportedBy[]`。
  - `mustFix`: `string[]`
  - `warnings`: `string[]`
  - `suggestions`: `string[]`
  - `metrics`: `{ clueCoverage, redHerringRatio, wordCountCheck, toneConsistency }`

> **注意**：后续工作流需要将 `mustFix` 作为回退条件；`warnings` 可写入 Prompt Memory 指导 Stage7 修订。

---

## Stage7 – Polished Draft & Markdown 出稿

- **文件**：`stage7_polish.txt`, `story.md`
- **结构**：
  - `finalDraft`: `{ totalWordCount, chapters[] }`，其中 `chapters` 仍沿用 Stage5 结构但文本已润色。
  - `appliedChanges`: `string[]`
  - `nextSteps`: `string[2]`
  - `story.md`: Markdown 文档，含 6 章正文 + “附录：线索清单 / 时间线回顾 / 修订备注”。

> **注意**：后续流程需在 Stage7 完成后自动写入 `.md` 并保存对应版本号。

---

## 评估结果（Quality Gate）

- **文件**：`story_eval.json`
- **结构**：`EvaluationReport`
  | 字段 | 说明 |
  | --- | --- |
  | `score` (`0-10`) | LLM 评分。 |
  | `verdict` (`pass`/`revise`) | 是否通过。 |
  | `strengths` / `issues` / `blockingReasons` / `recommendations` | 评审要点。 |

> **注意**：后续工作流需根据 `verdict` 与 `score` 决定是否自动回退 Stage5。

---

## 后续落地建议（Stage0 输出）

1. 将上述结构转为 Pydantic Schema（`ProjectCard`, `MiracleBlueprint`, `ClueMatrix`, …）。
2. 在阶段执行时保存 JSON 至 Artifact Store，并提供检索接口。
3. 对 Stage2B/Stage3/Stage4/Stage5/Stage7 重点字段建立自动校验（例如引用 ID 是否存在、wordBudget 总和、线索覆盖率等）。
4. 生成 `schema-tests`（待 Stage0 Step3）以确保历史产物符合 Schema。 

