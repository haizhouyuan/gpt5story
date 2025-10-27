export interface StoryMemoryContext {
    /** 最近的故事摘錄，用於提示模型緊接著的情節 */
    recentExcerpt: string;
    /** 簡短摘要（若內容過長時提供），方便高層次規劃 */
    summary?: string;
    /** 是否超過了預設的記憶截斷長度 */
    truncated: boolean;
}
export declare const buildMemoryContext: (historyContent: string) => StoryMemoryContext;
//# sourceMappingURL=storyMemory.d.ts.map