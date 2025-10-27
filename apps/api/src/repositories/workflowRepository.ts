import type {
  StoryOutlinePlan,
  StoryReviewNote,
  StoryRevisionPlan,
  DetectiveOutline,
  StoryDraft,
  ValidationReport,
  RevisionPlanSummary,
  WorkflowStageState,
} from '@gpt5story/shared';
import type { Collection } from 'mongodb';
import { getCollection } from '../config/db.js';

export interface WorkflowExecutionRecord {
  traceId: string;
  topic: string;
  createdAt: string;
  outline: StoryOutlinePlan;
  detectiveOutline?: DetectiveOutline;
  draft?: StoryDraft;
  reviewNotes: StoryReviewNote[];
  validationReport?: ValidationReport;
  revisionPlan: StoryRevisionPlan;
  revisionSummary?: RevisionPlanSummary;
  stageStates?: WorkflowStageState[];
  events: Array<{ stage: string; status: string; timestamp: string; meta?: Record<string, unknown>; message?: string }>;
  telemetry?: Record<string, unknown>;
  storyTree?: import('@gpt5story/shared').StoryTree;
}

const COLLECTION_NAME = 'workflow_executions';

export const insertExecution = async (record: WorkflowExecutionRecord) => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<WorkflowExecutionRecord>;
  await col.insertOne(record as WorkflowExecutionRecord);
};

export const getExecutionByTraceId = async (traceId: string): Promise<WorkflowExecutionRecord | null> => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<WorkflowExecutionRecord>;
  return col.findOne({ traceId });
};

export const listExecutions = async (): Promise<WorkflowExecutionRecord[]> => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<WorkflowExecutionRecord>;
  return col.find({}, { sort: { createdAt: -1 }, projection: { revisionPlan: 0 } }).toArray();
};

export const clearExecutions = async () => {
  const col = (await getCollection(COLLECTION_NAME)) as unknown as Collection<WorkflowExecutionRecord>;
  await col.deleteMany({});
};
