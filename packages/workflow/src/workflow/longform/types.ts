import type { WorkflowStageEvent } from '../../events/workflowEventBus.js';

export type LongformStageId =
  | 'stage0ProjectInit'
  | 'stage1MiracleBlueprint'
  | 'stage2aCastAndProps'
  | 'stage2bClueMatrix'
  | 'stage3Structure'
  | 'stage4SceneCards'
  | 'stage5LongformDraft'
  | 'stage6Review'
  | 'stage7Polish'
  | 'qualityGateEvaluation';

export const LONGFORM_STAGE_SEQUENCE: LongformStageId[] = [
  'stage0ProjectInit',
  'stage1MiracleBlueprint',
  'stage2aCastAndProps',
  'stage2bClueMatrix',
  'stage3Structure',
  'stage4SceneCards',
  'stage5LongformDraft',
  'stage6Review',
  'stage7Polish',
  'qualityGateEvaluation',
];

export interface RiskItem {
  id: string;
  risk: string;
  mitigation: string;
}

export interface SuccessMetric {
  metric: string;
  target: string;
}

export interface ProjectCard {
  projectId: string;
  titleCandidates: string[];
  series: string;
  genreTags: string[];
  themes: string[];
  targetWordCount: number;
  definitionOfDone: string[];
  risks: RiskItem[];
  successMetrics: SuccessMetric[];
}

export interface MechanismNode {
  order: number;
  node: string;
  type: '自然' | '装置' | '心理' | string;
  effect: string;
  evidenceHooks: string[];
}

export interface MiracleBlueprint {
  miracleId: string;
  logline: string;
  trigger: string;
  mechanismChain: MechanismNode[];
  weaknesses: string[];
  toleranceNotes: string;
  replicationSteps: string[];
  foreshadowingIdeas: string[];
  variantSummary: Record<string, unknown>;
}

export interface CharacterProfile {
  id: string;
  name: string;
  role: string;
  motiveOrSecret: string;
  firstHint: string;
}

export interface PropProfile {
  id: string;
  name: string;
  category: '机关' | '证物' | '日常' | string;
  description: string;
  plantChapterHint: string;
  payoffChapterHint: string;
}

export interface CastAndProps {
  characters: CharacterProfile[];
  props: PropProfile[];
}

export interface ClueItem {
  id: string;
  category: '线索' | '证词' | '物证' | string;
  surfaceMeaning: string;
  realMeaning: string;
  firstAppearance: string;
  revealPoint: string;
  senses: string[];
  linksToMechanism?: string[];
}

export interface RedHerringItem {
  id: string;
  type: '命名' | '空间' | '材质' | '事件' | '人设' | string;
  setup: string;
  truth: string;
  counterScene: string;
}

export interface TimelineAnchor {
  time: string;
  chapterRef?: number;
  event: string;
  evidence: string;
  relevance: string;
}

export interface ClueMatrixOutput {
  clueMatrix: ClueItem[];
  redHerrings: RedHerringItem[];
  timelineAnchors: TimelineAnchor[];
  fairnessSummary: {
    clueCount: number;
    redHerringRatio: string;
    checks: string[];
    risks: string[];
  };
}

export interface ActPlan {
  act: number;
  title: string;
  purpose: string;
  turningPoint: string;
  beats: string[];
}

export interface ChapterPlanItem {
  chapter: number;
  title: string;
  wordBudget: number;
  pov: string;
  summary: string;
  keyScenes: string[];
  clueDrops: string[];
  endingHook: string;
}

export interface TimelineEvent {
  time: string;
  chapterRef: number;
  event: string;
  evidence: string;
  impact: string;
}

export interface LocationNote {
  name: string;
  description: string;
  keyAccessPoints: string[];
  hazards: string[];
}

export interface StructurePlanOutput {
  acts: ActPlan[];
  chapterPlan: ChapterPlanItem[];
  timeline: TimelineEvent[];
  spaceNotes: {
    locations: LocationNote[];
    movementConstraints: string[];
  };
  gateChecklist: {
    beatsPerAct: number;
    chapters: number;
    totalWordBudget: number;
    fairnessAudit: string[];
  };
}

export interface SceneCardItem {
  sceneId: string;
  chapter: number;
  pov: string;
  goal: string;
  conflict: string;
  evidenceOut: string[];
  redHerringsOut: string[];
  sensoryDetail: string;
  emotionBeat: string;
  exitHook: string;
  wordQuota: number;
}

export interface DraftFragmentItem {
  chapter: number;
  pov: string;
  approxWords: number;
  text: string;
}

export interface SceneDesignOutput {
  sceneCards: SceneCardItem[];
  draftFragments: DraftFragmentItem[];
  continuityChecks: string[];
}

export interface ChapterDraftItem {
  chapter: number;
  title: string;
  pov: string;
  wordCount: number;
  text: string;
}

export interface LongformDraftOutput {
  chapterDrafts: ChapterDraftItem[];
  appendices: {
    clueRecap: Array<{ id: string; excerpt: string; chapterRef: number }>;
    timelineRecap: Array<{ time: string; event: string; chapterRef: number }>;
    revisionNotes: string[];
  };
  metrics: {
    totalWordCount: number;
    averageChapterLength: number;
  };
}

export interface ReviewCheckItem {
  rule: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  evidence?: string[];
}

export interface ReviewReport {
  checks: ReviewCheckItem[];
  logicChain: Array<{ step: number; claim: string; supportedBy: string[] }>;
  mustFix: string[];
  warnings: string[];
  suggestions: string[];
  metrics: {
    clueCoverage: string;
    redHerringRatio: string;
    wordCountCheck: string;
    toneConsistency: string;
  };
}

export interface PolishedDraftOutput {
  finalDraft: {
    totalWordCount: number;
    chapters: ChapterDraftItem[];
  };
  appliedChanges: string[];
  nextSteps: string[];
  markdown?: string;
  markdownPath?: string;
}

export interface EvaluationReport {
  score: number;
  verdict: 'pass' | 'revise';
  strengths: string[];
  issues: string[];
  blockingReasons: string[];
  recommendations: string[];
}

export interface Stage5RevisionDirective {
  attempt: number;
  maxAttempts: number;
  previousDraft: LongformDraftOutput;
  feedback: ReviewReport;
}

export interface LongformRevisionContext {
  stage5?: Stage5RevisionDirective;
}

export interface LongformStageResultMap {
  stage0ProjectInit: ProjectCard;
  stage1MiracleBlueprint: MiracleBlueprint;
  stage2aCastAndProps: CastAndProps;
  stage2bClueMatrix: ClueMatrixOutput;
  stage3Structure: StructurePlanOutput;
  stage4SceneCards: SceneDesignOutput;
  stage5LongformDraft: LongformDraftOutput;
  stage6Review: ReviewReport;
  stage7Polish: PolishedDraftOutput;
  qualityGateEvaluation: EvaluationReport;
}

export type LongformStageResult<K extends LongformStageId> = LongformStageResultMap[K];

export interface LongformStageState {
  stage: LongformStageId;
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempts: number;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
}

export type LongformStageEvent = WorkflowStageEvent<LongformStageId>;

export interface LongformWorkflowTelemetry {
  events: LongformStageEvent[];
}

export interface LongformWorkflowResult {
  traceId: string;
  createdAt: string;
  stages: LongformStageState[];
  artifacts: Partial<LongformStageResultMap>;
  telemetry: LongformWorkflowTelemetry;
}

export interface LongformWorkflowRequest {
  instructions: string;
  locale?: string;
  wordGoal?: number;
  overrides?: Partial<LongformStageResultMap>;
  revisionContext?: LongformRevisionContext;
  traceId?: string;
  resumeFromCache?: boolean;
}

export interface LongformStageConfig {
  id: LongformStageId;
  label: string;
  retryAttempts?: number;
  dependsOn?: LongformStageId[];
}
