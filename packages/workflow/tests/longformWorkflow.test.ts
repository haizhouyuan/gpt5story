import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readFileSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLongformWorkflow, LongformStageExecutionError } from '../src/workflow/longform/longformWorkflow.js';
import type { ProjectCard, LongformStageId } from '../src/workflow/longform/types.js';
import { createStubLlm } from '../src/workflow/longform/__mocks__/llmExecutor.js';

const SAMPLE_DIR = path.resolve('experiments/longform-run-v2');

const readSample = <T>(fileName: string): T => {
  const filePath = path.join(SAMPLE_DIR, fileName);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
};

let cleanupPaths: string[] = [];

beforeEach(() => {
  process.env.GPT5STORY_LONGFORM_SAMPLE_DIR = SAMPLE_DIR;
  delete process.env.GPT5STORY_LONGFORM_MD_OUT;
  delete process.env.GPT5STORY_LONGFORM_QA_BOARD;
  cleanupPaths = [];
});

afterEach(() => {
  cleanupPaths.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  cleanupPaths = [];
  delete process.env.GPT5STORY_LONGFORM_MD_OUT;
  delete process.env.GPT5STORY_LONGFORM_QA_BOARD;
});

describe('LongformWorkflowEngine', () => {
  const cleanReview = {
    checks: [],
    logicChain: [],
    mustFix: [],
    warnings: [],
    suggestions: [],
    metrics: {
      clueCoverage: '100%',
      redHerringRatio: '0%',
      wordCountCheck: 'ok',
      toneConsistency: 'ok',
    },
  };

  it('runs through the full stage sequence using sample executors', async () => {
    const events: string[] = [];
    const tmpMdDir = mkdtempSync(path.join(os.tmpdir(), 'gpt5story-md-'));
    const tmpQaDir = mkdtempSync(path.join(os.tmpdir(), 'gpt5story-qa-'));
    process.env.GPT5STORY_LONGFORM_MD_OUT = tmpMdDir;
    process.env.GPT5STORY_LONGFORM_QA_BOARD = tmpQaDir;
    cleanupPaths.push(tmpMdDir, tmpQaDir);
    const planResponses = [
      readFileSync(path.join(SAMPLE_DIR, 'stage1_miracle.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage2a_cast_props.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage2b_clues.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage3_structure.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage4_scenecards.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage5_longform.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage7_polish.txt'), 'utf-8'),
      JSON.stringify({
        score: 8.5,
        verdict: 'pass',
        strengths: ['结构严密', '线索前置充分'],
        issues: [],
        blockingReasons: [],
        recommendations: ['针对动机曲线再做一次读者口播测试'],
      }),
    ];
    const workflow = createLongformWorkflow({
      llm: createStubLlm({ planResponses }),
      onEvent: (event) => {
        events.push(`${event.stage}:${event.status}`);
      },
    });

    const result = await workflow.invoke({ instructions: '生成侦探小说', overrides: { stage6Review: cleanReview } });

    const projectCard = result.artifacts.stage0ProjectInit as ProjectCard;
    expect(projectCard.projectId).toBeDefined();
    expect(projectCard.definitionOfDone.length).toBeGreaterThan(0);
    const polished = result.artifacts.stage7Polish;
    expect(polished?.markdown).toBeDefined();
    expect(polished?.markdownPath).toBeDefined();
    if (polished?.markdownPath) {
      expect(polished.markdownPath).toContain('_stage7_v01_');
      const absPath = path.join(tmpMdDir, polished.markdownPath);
      expect(existsSync(absPath)).toBe(true);
    }
    expect(result.stages.every((stage) => stage.status === 'completed')).toBe(true);
    expect(result.telemetry.events.length).toBeGreaterThan(0);

    for (const stageId of Object.keys(result.artifacts) as LongformStageId[]) {
      expect(events).toContain(`${stageId}:start`);
      expect(events).toContain(`${stageId}:success`);
    }

    const boardPath = path.join(tmpQaDir, 'qa-board.json');
    expect(existsSync(boardPath)).toBe(true);
    const boardEntries = JSON.parse(readFileSync(boardPath, 'utf-8')) as Array<Record<string, unknown>>;
    expect(boardEntries.length).toBeGreaterThanOrEqual(1);
    const latest = boardEntries[0];
    expect(typeof latest.traceId).toBe('string');
    expect(latest.stage5Attempts).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(latest.reviewMustFixDetail)).toBe(true);
    expect(Array.isArray(latest.reviewWarningsDetail)).toBe(true);
    expect(typeof latest.totalWordCount).toBe('number');
  });

  it('retries stage execution when executor fails initially', async () => {
    const sampleProjectCard = readSample<ProjectCard>('stage0_project_card.txt');
    const planResponses = [
      readFileSync(path.join(SAMPLE_DIR, 'stage1_miracle.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage2a_cast_props.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage2b_clues.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage3_structure.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage4_scenecards.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage5_longform.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage7_polish.txt'), 'utf-8'),
      JSON.stringify({
        score: 8.1,
        verdict: 'pass',
        strengths: ['流程通过样例'],
        issues: [],
        blockingReasons: [],
        recommendations: [],
      }),
    ];
    const spy = vi.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue(sampleProjectCard);

    const workflow = createLongformWorkflow({
      llm: createStubLlm({ planResponses }),
      stageExecutors: {
        stage0ProjectInit: spy,
      },
    });

    const result = await workflow.invoke({ instructions: '生成侦探小说', overrides: { stage6Review: cleanReview } });

    expect(spy).toHaveBeenCalledTimes(2);
    const stage0 = result.stages.find((state) => state.stage === 'stage0ProjectInit');
    expect(stage0?.status).toBe('completed');
    expect(stage0?.attempts).toBeGreaterThanOrEqual(2);
  });

  it('throws when a dependent stage fails', async () => {
    const planResponses = [
      readFileSync(path.join(SAMPLE_DIR, 'stage1_miracle.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage2a_cast_props.txt'), 'utf-8'),
      // stage2b will throw, but subsequent stages won't execute
    ];

    const workflow = createLongformWorkflow({
      llm: createStubLlm({ planResponses }),
      stageExecutors: {
        stage2bClueMatrix: async () => {
          throw new Error('stage2b failure');
        },
      },
    });

    await expect(workflow.invoke({ instructions: '生成侦探小说' })).rejects.toBeInstanceOf(LongformStageExecutionError);
  });

  it('automatically reruns stage5 when stage6 reports must-fix issues', async () => {
    const tmpMdDir = mkdtempSync(path.join(os.tmpdir(), 'gpt5story-md-'));
    const tmpQaDir = mkdtempSync(path.join(os.tmpdir(), 'gpt5story-qa-'));
    process.env.GPT5STORY_LONGFORM_MD_OUT = tmpMdDir;
    process.env.GPT5STORY_LONGFORM_QA_BOARD = tmpQaDir;
    cleanupPaths.push(tmpMdDir, tmpQaDir);
    const failingReview = JSON.stringify({
      checks: [],
      logicChain: [],
      mustFix: ['补充镜像伏笔描写'],
      warnings: [],
      suggestions: ['强调钟声与滑盖的因果关系'],
      metrics: {
        clueCoverage: '待补充',
        redHerringRatio: '可接受',
        wordCountCheck: 'ok',
        toneConsistency: 'ok',
      },
    });

    const passingReview = JSON.stringify({
      checks: [],
      logicChain: [],
      mustFix: [],
      warnings: [],
      suggestions: ['保持章节节奏'],
      metrics: {
        clueCoverage: '100%',
        redHerringRatio: '均衡',
        wordCountCheck: 'ok',
        toneConsistency: 'ok',
      },
    });

    const evaluation = JSON.stringify({
      score: 8.8,
      verdict: 'pass',
      strengths: ['mustFix 修复后逻辑自洽'],
      issues: [],
      blockingReasons: [],
      recommendations: ['上线前再跑一次人工校对'],
    });

    const planResponses = [
      readFileSync(path.join(SAMPLE_DIR, 'stage1_miracle.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage2a_cast_props.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage2b_clues.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage3_structure.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage4_scenecards.txt'), 'utf-8'),
      readFileSync(path.join(SAMPLE_DIR, 'stage5_longform.txt'), 'utf-8'),
      failingReview,
      readFileSync(path.join(SAMPLE_DIR, 'stage5_longform.txt'), 'utf-8'),
      passingReview,
      readFileSync(path.join(SAMPLE_DIR, 'stage7_polish.txt'), 'utf-8'),
      evaluation,
    ];

    const workflow = createLongformWorkflow({
      llm: createStubLlm({ planResponses }),
    });

    const result = await workflow.invoke({ instructions: '生成侦探小说' });

    const stage5State = result.stages.find((state) => state.stage === 'stage5LongformDraft');
    const stage6State = result.stages.find((state) => state.stage === 'stage6Review');

    expect(stage5State?.attempts).toBeGreaterThanOrEqual(2);
    expect(stage6State?.attempts).toBeGreaterThanOrEqual(2);
    expect(stage6State?.status).toBe('completed');
    expect(result.artifacts.stage6Review?.mustFix ?? []).toHaveLength(0);
    expect(result.artifacts.qualityGateEvaluation?.verdict).toBe('pass');

    const polished = result.artifacts.stage7Polish;
    expect(polished?.markdownPath).toBeDefined();
    if (polished?.markdownPath) {
      expect(polished.markdownPath).toContain('_stage7_v02_');
      const absPath = path.join(tmpMdDir, polished.markdownPath);
      expect(existsSync(absPath)).toBe(true);
    }

    const boardPath = path.join(tmpQaDir, 'qa-board.json');
    const boardEntries = JSON.parse(readFileSync(boardPath, 'utf-8')) as Array<Record<string, unknown>>;
    expect(boardEntries.length).toBeGreaterThanOrEqual(1);
    const latest = boardEntries[0];
    expect(latest.stage5Attempts).toBeGreaterThanOrEqual(2);
    expect(latest.autoRevisionRounds).toBe(latest.stage5Attempts - 1);
    expect(Array.isArray(latest.reviewMustFixDetail)).toBe(true);
    expect(Array.isArray(latest.reviewWarningsDetail)).toBe(true);
    expect(typeof latest.totalWordCount).toBe('number');
  });
});
