import type { LlmExecutor } from '../../src/llm/provider';

export class MockLlmProvider implements LlmExecutor {
  planCalls: { system: string; user: string }[] = [];

  draftCalls: { system: string; user: string }[] = [];

  constructor(private readonly options: { planResult?: string; draftResult?: string } = {}) {}

  async plan(prompt: { system: string; user: string }): Promise<string> {
    this.planCalls.push(prompt);
    return this.options.planResult ?? '規劃節拍 A, B, C';
  }

  async draft(prompt: { system: string; user: string }): Promise<string> {
    this.draftCalls.push(prompt);
    return (
      this.options.draftResult ??
      `【故事草稿】\n${prompt.user}\n- 選項候選 1\n- 選項候選 2`
    );
  }
}
