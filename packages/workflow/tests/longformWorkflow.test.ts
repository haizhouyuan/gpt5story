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
import type { ProjectCard, LongformStageId, ReviewReport } from '../src/workflow/longform/types.js';
import { createStubLlm } from '../src/workflow/longform/__mocks__/llmExecutor.js';

const SAMPLE_DIR = path.resolve('packages/workflow/tests/fixtures/longform-samples');

const readSampleText = (fileName: string): string => readFileSync(path.join(SAMPLE_DIR, fileName), 'utf-8');

const readSampleJson = <T>(fileName: string): T => JSON.parse(readSampleText(fileName)) as T;

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
  const cleanReview = readSampleJson<ReviewReport>('stage6_review_pass.txt');

  it('runs through the full stage sequence using sample executors', async () => {
    const events: string[] = [];
    const tmpMdDir = mkdtempSync(path.join(os.tmpdir(), 'gpt5story-md-'));
    const tmpQaDir = mkdtempSync(path.join(os.tmpdir(), 'gpt5story-qa-'));
    process.env.GPT5STORY_LONGFORM_MD_OUT = tmpMdDir;
    process.env.GPT5STORY_LONGFORM_QA_BOARD = tmpQaDir;
    cleanupPaths.push(tmpMdDir, tmpQaDir);
    const planResponses = [
      readSampleText('stage1_miracle.txt'),
      readSampleText('stage2a_cast_props.txt'),
      readSampleText('stage2b_clues.txt'),
      readSampleText('stage3_structure.txt'),
      readSampleText('stage4_scenecards.txt'),
      readSampleText('stage5_longform.txt'),
      readSampleText('stage7_polish.txt'),
      readSampleText('quality_evaluation_pass.txt'),
    ];
    const workflow = createLongformWorkflow({
      llm: createStubLlm({ planResponses }),
      onEvent: (event) => {
        events.push(`${event.stage}:${event.status}`);
      },
    });

    const result = await workflow.invoke({ instructions: '生成侦探小说', overrides: { stage6Review: cleanReview } });

    expect(result.traceId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(new Date(result.createdAt).toString()).not.toBe('Invalid Date');
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
    const sampleProjectCard = readSampleJson<ProjectCard>('stage0_project_card.txt');
    const planResponses = [
      readSampleText('stage1_miracle.txt'),
      readSampleText('stage2a_cast_props.txt'),
      readSampleText('stage2b_clues.txt'),
      readSampleText('stage3_structure.txt'),
      readSampleText('stage4_scenecards.txt'),
      readSampleText('stage5_longform.txt'),
      readSampleText('stage7_polish.txt'),
      readSampleText('quality_evaluation_pass.txt'),
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

    expect(result.traceId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(spy).toHaveBeenCalledTimes(2);
    const stage0 = result.stages.find((state) => state.stage === 'stage0ProjectInit');
    expect(stage0?.status).toBe('completed');
    expect(stage0?.attempts).toBeGreaterThanOrEqual(2);
  });

  it('throws when a dependent stage fails', async () => {
    const planResponses = [
      readSampleText('stage1_miracle.txt'),
      readSampleText('stage2a_cast_props.txt'),
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
    const failingReview = readSampleText('stage6_review_mustfix.txt');
    const passingReview = readSampleText('stage6_review_pass.txt');
    const evaluation = readSampleText('quality_evaluation_pass.txt');

    const planResponses = [
      readSampleText('stage1_miracle.txt'),
      readSampleText('stage2a_cast_props.txt'),
      readSampleText('stage2b_clues.txt'),
      readSampleText('stage3_structure.txt'),
      readSampleText('stage4_scenecards.txt'),
      readSampleText('stage5_longform.txt'),
      failingReview,
      readSampleText('stage5_longform.txt'),
      passingReview,
      readSampleText('stage7_polish.txt'),
      evaluation,
    ];

    const workflow = createLongformWorkflow({
      llm: createStubLlm({ planResponses }),
    });

    const result = await workflow.invoke({ instructions: '生成侦探小说' });

    expect(result.traceId).toMatch(/^[0-9a-f-]{36}$/i);
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
