export type WorkflowStageName = 'planning' | 'drafting' | 'review' | 'revision';

export type WorkflowStageStatus = 'start' | 'success' | 'error';

export interface WorkflowStageEvent<TStage extends string = WorkflowStageName> {
  stage: TStage;
  status: WorkflowStageStatus;
  timestamp?: string;
  meta?: Record<string, unknown>;
  message?: string;
}

export type WorkflowEventListener<TStage extends string = WorkflowStageName> = (event: WorkflowStageEvent<TStage>) => void;

export class WorkflowEventBus<TStage extends string = WorkflowStageName> {
  private events: WorkflowStageEvent<TStage>[] = [];

  private listeners: WorkflowEventListener<TStage>[] = [];

  emit(event: WorkflowStageEvent<TStage>) {
    const payload = { ...event, timestamp: event.timestamp ?? new Date().toISOString() };
    this.events.push(payload);
    [...this.listeners].forEach((listener) => {
      try {
        listener(payload);
      } catch {
        // ignore listener errors
      }
    });
  }

  list(): WorkflowStageEvent<TStage>[] {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }

  subscribe(listener: WorkflowEventListener<TStage>) {
    this.listeners.push(listener);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }
}
