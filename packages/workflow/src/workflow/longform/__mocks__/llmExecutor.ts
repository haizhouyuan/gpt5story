import type { LlmExecutor } from '../../../llm/provider.js';

export interface StubLlmOptions {
  planResponses?: string[];
  draftResponses?: string[];
}

export class StubLlmExecutor implements LlmExecutor {
  planCalls: Array<{ system: string; user: string }> = [];

  draftCalls: Array<{ system: string; user: string }> = [];

  private planQueue: string[];

  private draftQueue: string[];

  constructor(options: StubLlmOptions = {}) {
    this.planQueue = [...(options.planResponses ?? ['{}'])];
    this.draftQueue = [...(options.draftResponses ?? ['{}'])];
  }

  async plan(prompt: { system: string; user: string }): Promise<string> {
    this.planCalls.push(prompt);
    const response = this.planQueue.shift();
    if (!response) {
      throw new Error('No stub plan response left');
    }
    return response;
  }

  async draft(prompt: { system: string; user: string }): Promise<string> {
    this.draftCalls.push(prompt);
    const response = this.draftQueue.shift();
    if (!response) {
      throw new Error('No stub draft response left');
    }
    return response;
  }
}

export const createStubLlm = (options?: StubLlmOptions) => new StubLlmExecutor(options);
