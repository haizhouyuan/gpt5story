const MAX_RECENT_CHARS = 1200;
const SUMMARY_MAX_CHARS = 360;

export interface StoryMemoryContext {
  /** 最近的故事摘錄，用於提示模型緊接著的情節 */
  recentExcerpt: string;
  /** 簡短摘要（若內容過長時提供），方便高層次規劃 */
  summary?: string;
  /** 是否超過了預設的記憶截斷長度 */
  truncated: boolean;
}

export const buildMemoryContext = (historyContent: string): StoryMemoryContext => {
  const normalized = historyContent?.trim() ?? '';
  if (!normalized) {
    return {
      recentExcerpt: '',
      truncated: false,
    };
  }

  const truncated = normalized.length > MAX_RECENT_CHARS;
  const recentExcerpt = truncated
    ? normalized.slice(-MAX_RECENT_CHARS)
    : normalized;

  let summary: string | undefined;
  if (truncated) {
    const firstParagraph = normalized.slice(0, SUMMARY_MAX_CHARS);
    const newlineIndex = firstParagraph.indexOf('\n');
    summary = (newlineIndex >= 0 ? firstParagraph.slice(0, newlineIndex) : firstParagraph)
      .replace(/\s+/g, ' ')
      .trim();
    if (!summary) {
      summary = normalized.slice(0, SUMMARY_MAX_CHARS).replace(/\s+/g, ' ').trim();
    }
  }

  return {
    recentExcerpt,
    summary,
    truncated,
  };
};
