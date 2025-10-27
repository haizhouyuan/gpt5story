export type WorkflowStageName = 'planning' | 'drafting' | 'review' | 'revision';

export type WorkflowStageStatus = 'start' | 'success' | 'error';

export interface WorkflowStageEvent {
  stage: WorkflowStageName;
  status: WorkflowStageStatus;
  timestamp: string;
  meta?: Record<string, unknown>;
  message?: string;
}

export type WorkflowEventListener = (event: WorkflowStageEvent) => void;

export class WorkflowEventBus {
  private events: WorkflowStageEvent[] = [];

  private listeners: WorkflowEventListener[] = [];

  emit(event: WorkflowStageEvent) {
    const payload = { ...event, timestamp: event.timestamp ?? new Date().toISOString() };
    this.events.push(payload);
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        // ignore listener errors
      }
    });
  }

  list(): WorkflowStageEvent[] {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }

  subscribe(listener: WorkflowEventListener) {
    this.listeners.push(listener);
  }
}
