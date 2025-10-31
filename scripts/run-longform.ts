import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { traceable } from 'langsmith/traceable';
import { createLongformWorkflow, LongformStageExecutionError } from '../packages/workflow/src/workflow/longform/longformWorkflow.js';
import type { LongformStageResultMap } from '../packages/workflow/src/workflow/longform/types.js';

type ExecMode = 'fixture' | 'live';

interface CliArgs {
  mode: ExecMode;
  instructions: string;
  traceId?: string;
  resume: boolean;
}

const parseArgs = (): CliArgs => {
  const args = process.argv.slice(2);
  let mode: ExecMode = 'fixture';
  let instructions = '生成一篇 5000 字的鐘樓密室長篇偵探小說';
  let traceId: string | undefined;
  let resumeFlag: boolean | undefined;

  for (const arg of args) {
    if (arg === '--live') mode = 'live';
    if (arg === '--fixture') mode = 'fixture';
    if (arg.startsWith('--instructions=')) {
      instructions = arg.slice('--instructions='.length);
    }
    if (arg.startsWith('--trace-id=')) {
      traceId = arg.slice('--trace-id='.length);
    }
    if (arg.startsWith('--trace=')) {
      traceId = arg.slice('--trace='.length);
    }
    if (arg === '--resume') resumeFlag = true;
    if (arg === '--no-resume') resumeFlag = false;
  }

  const resume = resumeFlag ?? Boolean(traceId);

  return { mode, instructions, traceId, resume };
};

const loadFixtureOverrides = (): Partial<LongformStageResultMap> => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const fixturesRoot = path.resolve(
    currentDir,
    '../packages/workflow/tests/fixtures/longform-samples',
  );

  const readJson = <T>(fileName: string): T => {
    const filePath = path.join(fixturesRoot, fileName);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  };

  return {
    stage0ProjectInit: readJson('stage0_project_card.txt'),
    stage1MiracleBlueprint: readJson('stage1_miracle.txt'),
    stage2aCastAndProps: readJson('stage2a_cast_props.txt'),
    stage2bClueMatrix: readJson('stage2b_clues.txt'),
    stage3Structure: readJson('stage3_structure.txt'),
    stage4SceneCards: readJson('stage4_scenecards.txt'),
    stage5LongformDraft: readJson('stage5_longform.txt'),
    stage6Review: readJson('stage6_review_pass.txt'),
    stage7Polish: readJson('stage7_polish.txt'),
    qualityGateEvaluation: readJson('quality_evaluation_pass.txt'),
  };
};

const logLangSmithHelp = (traceId: string) => {
  const project = process.env.LANGSMITH_PROJECT ?? 'default';
  const endpoint = process.env.LANGSMITH_ENDPOINT ?? 'https://api.smith.langchain.com';
  const regionHint = endpoint.includes('eu.') ? '（EU 区域）' : '';
  console.log('\nLangSmith 检查步骤:');
  console.log(`  1. 登录 https://smith.langchain.com${regionHint}`);
  console.log(`  2. 进入 Project "${project}"，找到 traceId = ${traceId} 的最新运行`);
  console.log('  3. 展开 Stage0–Stage7 节点即可看到每个阶段的输入输出、耗时与 Token');
};

async function main() {
  const { mode, instructions, traceId, resume } = parseArgs();

  if (!process.env.LANGSMITH_API_KEY) {
    console.warn('[警告] 未检测到 LANGSMITH_API_KEY，LangSmith 不会收到 trace。');
  }

  if (mode === 'fixture') {
    console.log('使用内置样本执行长篇工作流（不会调用真实 LLM）。如需真实生成，请加上 --live。');
  } else {
    console.log('使用真实 LLM 执行长篇工作流，请确认 OPENROUTER_API_KEY / OPENAI_API_KEY 已配置。');
  }

  if (resume && !process.env.GPT5STORY_LONGFORM_CACHE) {
    console.warn('[提示] 未设置 GPT5STORY_LONGFORM_CACHE，断点缓存不可用，仅会按输入 overrides 恢复。');
  }

  const workflow = createLongformWorkflow();
  const overrides = mode === 'fixture' ? loadFixtureOverrides() : undefined;
  const startedAt = Date.now();

  const execute = async () => workflow.invoke({
    instructions,
    overrides,
    traceId,
    resumeFromCache: resume,
  });
  const shouldTrace = process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_TRACING_V2 === 'true' || process.env.LANGSMITH_TRACING === 'true';
  const traced = shouldTrace
    ? traceable(execute, { name: 'longform_workflow_run', run_type: 'chain' })
    : execute;

  const result = await traced();
  const elapsed = (Date.now() - startedAt) / 1000;

  console.log('\n=== 执行完成 ===');
  console.log(`Trace ID: ${result.traceId}`);
  console.log(`Started: ${result.createdAt}`);
  console.log(`Duration: ${elapsed.toFixed(2)}s`);
  const projectCard = result.artifacts.stage0ProjectInit;
  if (projectCard) {
    console.log(`Project ID: ${projectCard.projectId}`);
    console.log(`Title candidates: ${(projectCard.titleCandidates ?? []).join('、')}`);
  }
  const polish = result.artifacts.stage7Polish;
  if (polish) {
    console.log(`Final word count: ${polish.finalDraft.totalWordCount}`);
    if (polish.markdownPath) {
      console.log(`Markdown saved at: ${polish.markdownPath}`);
    }
  }

  logLangSmithHelp(result.traceId);
}

main().catch((error) => {
  if (error instanceof LongformStageExecutionError) {
    console.error(`\n[run-longform] 阶段 ${error.stage} 失败：${error.state.errorMessage ?? error.message}`);
    console.error(`  traceId: ${error.traceId}`);
    console.error(`  已尝试次数: ${error.state.attempts}`);
    if (process.env.GPT5STORY_LONGFORM_CACHE) {
      console.error(`  已写入断点缓存目录: ${process.env.GPT5STORY_LONGFORM_CACHE}`);
    }
    console.error('\n要从此处继续，可执行:');
    console.error(`  npm run longform:run:live -- --trace-id=${error.traceId} --resume`);
    console.error('或自定义 instructions / overrides 后再次调用。');
  } else {
    console.error('[run-longform] 执行失败:', error);
  }
  process.exitCode = 1;
});
