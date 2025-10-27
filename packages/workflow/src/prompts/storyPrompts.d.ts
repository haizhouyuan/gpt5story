import type { StoryMemoryContext } from '../memory/storyMemory.js';
export interface PlanningPromptInput {
    topic: string;
    turnIndex: number;
    selectedChoice?: string;
    memory: StoryMemoryContext;
}
export interface StoryDraftPromptInput extends PlanningPromptInput {
    outlineBeats: string[];
}
export interface PromptPayload {
    system: string;
    user: string;
}
export declare const buildPlanningPrompt: (input: PlanningPromptInput) => PromptPayload;
export declare const buildDraftPrompt: (input: StoryDraftPromptInput) => PromptPayload;
//# sourceMappingURL=storyPrompts.d.ts.map