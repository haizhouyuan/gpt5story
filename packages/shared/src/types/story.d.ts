export interface StoryChoice {
    /** 顯示給讀者的選項文案 */
    text: string;
    /** 可選：標記選項背後的意圖，便於後續資料分析 */
    intent?: string;
}
export interface StorySegment {
    /** 最新生成的故事片段文本 */
    content: string;
    /** 本段是否為故事結局 */
    isEnding: boolean;
    /** 提供給使用者的下一步選項 */
    choices: StoryChoice[];
}
export interface StorySnapshot {
    /** 故事唯一識別碼 */
    id: string;
    /** 主題或題目 */
    topic: string;
    /** 完整故事文本 */
    content: string;
    /** 建立時間 ISO 字串 */
    createdAt: string;
    /** 可選：追蹤生成過程的 traceId */
    traceId?: string;
    /** 可選：故事段落列表 */
    segments?: StorySegment[];
    /** 可選：額外中繼資料 */
    metadata?: Record<string, unknown>;
}
export interface SaveStoryRequest {
    topic: string;
    content: string;
    traceId?: string;
    segments?: StorySegment[];
    metadata?: Record<string, unknown>;
}
export interface SaveStoryResponse {
    id: string;
    createdAt: string;
}
export interface TtsSynthesisRequest {
    text: string;
    voiceId?: string;
    speed?: number;
    pitch?: number;
}
export interface TtsSynthesisResponse {
    audioUrl: string;
    format: 'audio/mpeg' | 'audio/wav' | string;
    durationMs: number;
    provider: string;
    traceId?: string;
}
export interface StoryWorkflowMetadata {
    /** 原始主題或提示 */
    topic: string;
    /** 第幾輪互動（從 0 開始） */
    turnIndex: number;
    /** 預期總輪數（可選） */
    maxTurns?: number;
}
export interface StoryWorkflowRequest extends StoryWorkflowMetadata {
    /** 累積的完整故事文本 */
    historyContent: string;
    /** 使用者在上一輪選擇的選項文本 */
    selectedChoice?: string;
}
export interface StoryWorkflowResponse {
    segment: StorySegment;
    /** 追蹤用識別碼，可對應遙測／LangSmith trace */
    traceId?: string;
}
//# sourceMappingURL=story.d.ts.map