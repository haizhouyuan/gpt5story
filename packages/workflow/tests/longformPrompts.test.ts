import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildStage2ACastPrompt } from '../src/prompts/longform/stage2A.js';
import { buildStage2BCluePrompt } from '../src/prompts/longform/stage2B.js';
import { buildStage3StructurePrompt } from '../src/prompts/longform/stage3.js';
import { buildStage4ScenePrompt } from '../src/prompts/longform/stage4.js';
import { buildStage5DraftPrompt } from '../src/prompts/longform/stage5.js';
import { buildStage6ReviewPrompt } from '../src/prompts/longform/stage6.js';
import { buildStage7PolishPrompt } from '../src/prompts/longform/stage7.js';

const loadFixture = () => {
  const fixturePath = path.resolve('packages/workflow/tests/fixtures/longform-stage2.json');
  return JSON.parse(readFileSync(fixturePath, 'utf-8'));
};

describe('longform prompt builders', () => {
  it('builds stage2 prompts with required constraints', () => {
    const data = loadFixture();

    const stage2A = buildStage2ACastPrompt({
      projectCard: data.projectCard,
      miracleBlueprintSummary: data.miracleBlueprint.logline,
    });
    expect(stage2A.system).toContain('角色与道具架构师');
    expect(stage2A.user).toContain('"characters"');

    const stage2B = buildStage2BCluePrompt({
      projectCard: data.projectCard,
      miracleBlueprint: data.miracleBlueprint,
      castAndProps: data.castAndProps,
    });
    expect(stage2B.system).toContain('线索矩阵');
    expect(stage2B.user).toContain('线索矩阵 JSON');
  });

  it('builds stage3-stage7 prompts referencing dependencies', () => {
    const data = loadFixture();

    const stage3 = buildStage3StructurePrompt({
      projectCard: data.projectCard,
      miracleBlueprint: data.miracleBlueprint,
      castAndProps: data.castAndProps,
      clueMatrix: data.sampleStructure?.clueMatrix ?? { clueMatrix: [], redHerrings: [], timelineAnchors: [], fairnessSummary: { clueCount: 0, redHerringRatio: '0%', checks: [], risks: [] } },
    });
    expect(stage3.system).toContain('章节数量建议 6–10 章');

    const structure: any = {
      acts: [{ act: 1, title: 'Act1', purpose: 'purpose', turningPoint: 'tp', beats: ['b1', 'b2', 'b3'] }],
      chapterPlan: [{ chapter: 1, title: '章1', wordBudget: 800, pov: '蛋蛋', summary: 'summary', keyScenes: ['S1'], clueDrops: ['CL01'], endingHook: 'hook' }],
      timeline: [{ time: '19:00', chapterRef: 1, event: 'event', evidence: 'log', impact: 'impact' }],
      spaceNotes: { locations: [{ name: '钟楼', description: 'desc', keyAccessPoints: ['door'], hazards: ['hazard'] }], movementConstraints: ['constraint'] },
      gateChecklist: { beatsPerAct: 3, chapters: 1, totalWordBudget: 800, fairnessAudit: ['audit'] },
    };

    const clueMatrix = {
      clueMatrix: [
        {
          id: 'CL01',
          category: '物证',
          surfaceMeaning: 'surface',
          realMeaning: 'real',
          firstAppearance: '第1章',
          revealPoint: '第8章',
          senses: ['视觉'],
          linksToMechanism: ['node'],
        },
      ],
      redHerrings: [{ id: 'RH-01', type: '事件', setup: 'setup', truth: 'truth', counterScene: '第4章' }],
      timelineAnchors: [{ time: '19:00', chapterRef: 1, event: 'event', evidence: 'log', relevance: 'anchor' }],
      fairnessSummary: { clueCount: 1, redHerringRatio: '0%', checks: ['check'], risks: ['risk'] },
    };

    const stage4 = buildStage4ScenePrompt({ structurePlan: structure, clueMatrix });
    expect(stage4.system).toContain('场景卡');

    const sceneDesign = {
      sceneCards: [{ sceneId: 'S1-1', chapter: 1, pov: '蛋蛋', goal: 'goal', conflict: 'conflict', evidenceOut: ['CL01'], redHerringsOut: ['RH-01'], sensoryDetail: 'detail', emotionBeat: 'emotion', exitHook: 'hook', wordQuota: 300 }],
      draftFragments: [{ chapter: 1, pov: '蛋蛋', approxWords: 200, text: '片段' }],
      continuityChecks: ['check'],
    };

    const stage5 = buildStage5DraftPrompt({
      projectCard: data.projectCard,
      structurePlan: structure,
      scenes: sceneDesign,
      clueMatrix,
    });
    expect(stage5.system).toContain('建議總字數落在 4000–9000 字');

    const draftOutput = {
      chapterDrafts: [{ chapter: 1, title: '章1', pov: '蛋蛋', wordCount: 800, text: '正文【CL01】' }],
      appendices: { clueRecap: [{ id: 'CL01', excerpt: 'excerpt', chapterRef: 1 }], timelineRecap: [{ time: '19:00', event: 'event', chapterRef: 1 }], revisionNotes: ['note'] },
      metrics: { totalWordCount: 800, averageChapterLength: 800 },
    };

    const stage6 = buildStage6ReviewPrompt({
      projectCard: data.projectCard,
      draft: draftOutput,
      clueMatrix,
    });
    expect(stage6.system).toContain('公平性审校员');

    const reviewReport = {
      checks: [{ rule: 'rule', status: 'pass', detail: 'detail', evidence: ['CL01'] }],
      logicChain: [{ step: 1, claim: 'claim', supportedBy: ['CL01'] }],
      mustFix: [],
      warnings: [],
      suggestions: [],
      metrics: { clueCoverage: '100%', redHerringRatio: '0%', wordCountCheck: 'ok', toneConsistency: 'ok' },
    };

    const stage7 = buildStage7PolishPrompt({
      projectCard: data.projectCard,
      draft: draftOutput,
      review: reviewReport,
      clueMatrix,
    });
    expect(stage7.system).toContain('终稿润色编辑');
    expect(stage7.user).toContain('审校报告');
  });
});
