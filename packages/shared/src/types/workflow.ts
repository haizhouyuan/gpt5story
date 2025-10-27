export type ValidationRuleStatus = 'pass' | 'warn' | 'fail';

export interface DetectiveCharacter {
  name: string;
  role: string;
  motive?: string;
  secrets?: string[];
  traitKeywords?: string[];
  redHerring?: boolean;
}

export interface DetectiveClue {
  clue: string;
  surfaceMeaning?: string;
  realMeaning?: string;
  appearsAtAct?: number;
  isRedHerring?: boolean;
  mustForeshadow?: boolean;
  explicitForeshadowChapters?: string[];
}

export interface DetectiveTimelineEvent {
  time: string;
  event: string;
  participants?: string[];
}

export interface DetectiveLocation {
  name: string;
  description?: string;
  functionHint?: string;
  relatedClues?: string[];
}

export interface DetectiveActBeat {
  beat: number;
  summary: string;
  cluesRevealed?: string[];
  redHerring?: string;
}

export interface DetectiveAct {
  act: number;
  focus: string;
  beats: DetectiveActBeat[];
  payoff?: string;
}

export interface DetectiveChapterAnchor {
  chapter: string;
  dayCode?: string;
  time?: string;
  label?: string;
}

export interface DetectiveOutline {
  centralTrick?: {
    summary?: string;
    mechanism?: string;
    fairnessNotes?: string[];
  };
  caseSetup?: {
    victim?: string;
    crimeScene?: string;
    initialMystery?: string;
  };
  characters?: DetectiveCharacter[];
  acts?: DetectiveAct[];
  clueMatrix?: DetectiveClue[];
  locations?: DetectiveLocation[];
  timeline?: DetectiveTimelineEvent[];
  chapterAnchors?: DetectiveChapterAnchor[];
  solution?: {
    culprit?: string;
    motiveCore?: string;
    keyReveals?: string[];
    fairnessChecklist?: string[];
  };
  fairnessNotes?: string[];
  themes?: string[];
  logicChecklist?: string[];
}

export interface StoryDraftChapter {
  title: string;
  summary: string;
  content: string;
  wordCount?: number;
  cluesEmbedded?: string[];
  redHerringsEmbedded?: string[];
}

export interface StoryDraft {
  chapters: StoryDraftChapter[];
  overallWordCount?: number;
  narrativeStyle?: string;
  revisionNotes?: Array<{
    id?: string;
    message: string;
    category?: 'model' | 'system' | 'validation' | 'manual';
    stage?: string;
    chapter?: string;
    createdAt?: string;
  }>;
  continuityNotes?: string[];
  motivePatchCandidates?: Array<{
    suspect: string;
    keyword: string;
    chapterIndex: number;
    suggestedSentence: string;
    status?: 'pending' | 'applied';
  }>;
}

export interface RevisionPlanIssue {
  id: string;
  detail: string;
  category?: string;
  chapterRef?: string;
}

export interface RevisionPlanSummary {
  mustFix: RevisionPlanIssue[];
  warnings: RevisionPlanIssue[];
  suggestions: string[];
  generatedAt?: string;
}

export interface ValidationRuleDetail {
  message: string;
  meta?: Record<string, unknown>;
}

export interface ValidationRuleResult {
  ruleId: string;
  status: ValidationRuleStatus;
  details?: ValidationRuleDetail[];
}

export interface ValidationReport {
  generatedAt: string;
  summary?: {
    pass: number;
    warn: number;
    fail: number;
  };
  results: ValidationRuleResult[];
  metrics?: Record<string, number>;
  outlineId?: string;
  storyId?: string;
}

export type WorkflowStageStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface WorkflowStageState {
  stage: string;
  status: WorkflowStageStatus;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
}

export type WorkflowStageLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface WorkflowStageCommand {
  id: string;
  label: string;
  command?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startedAt?: string;
  finishedAt?: string;
  resultSummary?: string;
  errorMessage?: string;
  meta?: Record<string, unknown>;
}

export interface WorkflowStageLogEntry {
  id: string;
  timestamp: string;
  level: WorkflowStageLogLevel;
  message: string;
  commandId?: string;
  meta?: Record<string, unknown>;
}

export type WorkflowStageArtifactType = 'text' | 'json' | 'audio' | 'file' | 'image';

export interface WorkflowStageArtifact {
  id: string;
  label: string;
  type: WorkflowStageArtifactType;
  createdAt: string;
  commandId?: string;
  url?: string;
  preview?: string;
  meta?: Record<string, unknown>;
}

export interface WorkflowStageExecution {
  workflowId: string;
  stageId: string;
  label: string;
  status: WorkflowStageStatus;
  startedAt?: string;
  finishedAt?: string;
  currentCommandId?: string;
  commands: WorkflowStageCommand[];
  logs: WorkflowStageLogEntry[];
  artifacts: WorkflowStageArtifact[];
  updatedAt: string;
}

export interface StageLog {
  stage: string;
  stageId?: string;
  promptVersion?: string;
  durationMs?: number;
  modelCalls?: number;
  notes?: string[];
  gates?: Array<{
    name: string;
    verdict: 'pass' | 'warn' | 'block';
    reason?: string;
    metrics?: Record<string, number | string>;
    timestamp?: string;
  }>;
  meta?: Record<string, unknown>;
  timestamp?: string;
}

export interface WorkflowTelemetry {
  stages: StageLog[];
  promptVersions?: Record<string, string>;
}

export interface ClueGraphSnapshot {
  generatedAt: string;
  nodes: number;
  edges: number;
  version?: string;
  meta?: Record<string, unknown>;
}

export interface WorkflowExecutionMeta {
  telemetry?: WorkflowTelemetry;
  clueGraphSnapshot?: ClueGraphSnapshot;
  mysteryContract?: {
    id: string;
    title: string;
    clauses: Array<{ id: string; title: string; description: string }>;
    version?: string;
  };
  promptVersions?: Record<string, string>;
  lightHypotheses?: Array<{
    chapterIndex: number;
    rank: Array<{ name: string; score: number; evidenceIds: string[] }>;
    generatedAt: string;
  }>;
  anchorsSummary?: {
    chapterCount: number;
    mappedClues: number;
    unresolvedClues: string[];
    mappedInferences: number;
    unresolvedInferences: string[];
    updatedAt: string;
  };
  migrationVersion?: number;
  [key: string]: unknown;
}

export interface WorkflowRevision {
  revisionId: string;
  type: 'initial' | 'retry' | 'rollback';
  createdAt: string;
  createdBy?: string;
  outline?: DetectiveOutline;
  storyDraft?: StoryDraft;
  validation?: ValidationReport;
  stageStates?: WorkflowStageState[];
  meta?: Record<string, unknown>;
}

export interface WorkflowExecutionRecordV2 {
  traceId: string;
  topic: string;
  locale?: string;
  outline?: DetectiveOutline;
  draft?: StoryDraft;
  review?: {
    notes: Array<{
      id: string;
      severity: 'info' | 'warn' | 'error';
      message: string;
      chapterRef?: string;
      ruleId?: string;
    }>;
    validation?: ValidationReport;
    stage3Analysis?: Record<string, unknown>;
  };
  revisionPlan?: RevisionPlanSummary;
  stageStates?: WorkflowStageState[];
  meta?: WorkflowExecutionMeta;
  history?: WorkflowRevision[];
  events?: Array<{
    stage: string;
    status: string;
    timestamp: string;
    meta?: Record<string, unknown>;
    message?: string;
    category?: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}
