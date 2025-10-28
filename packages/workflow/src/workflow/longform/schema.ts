import { z } from 'zod';

export const riskSchema = z.object({
  id: z.string(),
  risk: z.string(),
  mitigation: z.string(),
});

export const successMetricSchema = z.object({
  metric: z.string(),
  target: z.string(),
});

export const projectCardSchema = z.object({
  projectId: z.string(),
  titleCandidates: z.array(z.string()).min(1),
  series: z.string(),
  genreTags: z.array(z.string()).min(1),
  themes: z.array(z.string()).max(3),
  targetWordCount: z.number().int().positive(),
  definitionOfDone: z.array(z.string()).min(1),
  risks: z.array(riskSchema),
  successMetrics: z.array(successMetricSchema),
});

export const mechanismNodeSchema = z.object({
  order: z.number().int().positive(),
  node: z.string(),
  type: z.string(),
  effect: z.string(),
  evidenceHooks: z.array(z.string()).min(1),
});

export const miracleBlueprintSchema = z.object({
  miracleId: z.string(),
  logline: z.string(),
  trigger: z.string(),
  mechanismChain: z.array(mechanismNodeSchema).min(1),
  weaknesses: z.array(z.string()),
  toleranceNotes: z.string(),
  replicationSteps: z.array(z.string()).min(1),
  foreshadowingIdeas: z.array(z.string()).min(1),
  variantSummary: z.object({
    holmesStyle: z.string(),
    poirotStyle: z.string(),
    selected: z.string(),
    reason: z.string(),
  }),
});

export const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  motiveOrSecret: z.string(),
  firstHint: z.string(),
});

export const propSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  plantChapterHint: z.string(),
  payoffChapterHint: z.string(),
});

export const castAndPropsSchema = z.object({
  characters: z.array(characterSchema).min(1),
  props: z.array(propSchema).min(1),
});

export const clueItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  surfaceMeaning: z.string(),
  realMeaning: z.string(),
  firstAppearance: z.string(),
  revealPoint: z.string(),
  senses: z.array(z.string()).min(1),
  linksToMechanism: z.array(z.string()).optional(),
});

export const redHerringSchema = z.object({
  id: z.string(),
  type: z.string(),
  setup: z.string(),
  truth: z.string(),
  counterScene: z.string(),
});

export const timelineAnchorSchema = z.object({
  time: z.string(),
  chapterRef: z.number().int().optional(),
  event: z.string(),
  evidence: z.string(),
  relevance: z.string(),
});

export const clueMatrixSchema = z.object({
  clueMatrix: z.array(clueItemSchema).min(1),
  redHerrings: z.array(redHerringSchema),
  timelineAnchors: z.array(timelineAnchorSchema),
  fairnessSummary: z.object({
    clueCount: z.number().int(),
    redHerringRatio: z.string(),
    checks: z.array(z.string()),
    risks: z.array(z.string()),
  }),
});

export const actPlanSchema = z.object({
  act: z.number().int(),
  title: z.string(),
  purpose: z.string(),
  turningPoint: z.string(),
  beats: z.array(z.string()).length(3),
});

export const chapterPlanItemSchema = z.object({
  chapter: z.number().int(),
  title: z.string(),
  wordBudget: z.number().int(),
  pov: z.string(),
  summary: z.string(),
  keyScenes: z.array(z.string()),
  clueDrops: z.array(z.string()),
  endingHook: z.string(),
});

export const timelineEventSchema = z.object({
  time: z.string(),
  chapterRef: z.number().int(),
  event: z.string(),
  evidence: z.string(),
  impact: z.string(),
});

export const locationNoteSchema = z.object({
  name: z.string(),
  description: z.string(),
  keyAccessPoints: z.array(z.string()),
  hazards: z.array(z.string()),
});

export const structurePlanSchema = z.object({
  acts: z.array(actPlanSchema).min(1),
  chapterPlan: z.array(chapterPlanItemSchema).min(1),
  timeline: z.array(timelineEventSchema),
  spaceNotes: z.object({
    locations: z.array(locationNoteSchema),
    movementConstraints: z.array(z.string()),
  }),
  gateChecklist: z.object({
    beatsPerAct: z.number().int(),
    chapters: z.number().int(),
    totalWordBudget: z.number().int(),
    fairnessAudit: z.array(z.string()),
  }),
});

export const sceneCardSchema = z.object({
  sceneId: z.string(),
  chapter: z.number().int(),
  pov: z.string(),
  goal: z.string(),
  conflict: z.string(),
  evidenceOut: z.array(z.string()),
  redHerringsOut: z.array(z.string()),
  sensoryDetail: z.string(),
  emotionBeat: z.string(),
  exitHook: z.string(),
  wordQuota: z.number().int(),
});

export const draftFragmentSchema = z.object({
  chapter: z.number().int(),
  pov: z.string(),
  approxWords: z.number().int(),
  text: z.string(),
});

export const sceneDesignSchema = z.object({
  sceneCards: z.array(sceneCardSchema).min(1),
  draftFragments: z.array(draftFragmentSchema),
  continuityChecks: z.array(z.string()),
});

export const chapterDraftSchema = z.object({
  chapter: z.number().int(),
  title: z.string(),
  pov: z.string(),
  wordCount: z.number().int(),
  text: z.string(),
});

export const longformDraftSchema = z.object({
  chapterDrafts: z.array(chapterDraftSchema).min(1),
  appendices: z.object({
    clueRecap: z.array(z.object({ id: z.string(), excerpt: z.string(), chapterRef: z.number().int() })),
    timelineRecap: z.array(z.object({ time: z.string(), event: z.string(), chapterRef: z.number().int() })),
    revisionNotes: z.array(z.string()),
  }),
  metrics: z.object({
    totalWordCount: z.number().int(),
    averageChapterLength: z.number().int(),
  }),
});

export const reviewCheckSchema = z.object({
  rule: z.string(),
  status: z.enum(['pass', 'warn', 'fail']),
  detail: z.string(),
  evidence: z.array(z.string()).optional(),
});

export const reviewReportSchema = z.object({
  checks: z.array(reviewCheckSchema),
  logicChain: z.array(z.object({ step: z.number().int(), claim: z.string(), supportedBy: z.array(z.string()) })),
  mustFix: z.array(z.string()),
  warnings: z.array(z.string()),
  suggestions: z.array(z.string()),
  metrics: z.object({
    clueCoverage: z.string(),
    redHerringRatio: z.string(),
    wordCountCheck: z.string(),
    toneConsistency: z.string(),
  }),
});

export const polishedDraftSchema = z.object({
  finalDraft: z.object({
    totalWordCount: z.number().int(),
    chapters: z.array(chapterDraftSchema),
  }),
  appliedChanges: z.array(z.string()),
  nextSteps: z.array(z.string()),
  markdown: z.string().optional(),
  markdownPath: z.string().optional(),
});

export const evaluationReportSchema = z.object({
  score: z.number(),
  verdict: z.enum(['pass', 'revise']),
  strengths: z.array(z.string()),
  issues: z.array(z.string()),
  blockingReasons: z.array(z.string()),
  recommendations: z.array(z.string()),
});
