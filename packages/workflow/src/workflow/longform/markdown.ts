import type { PolishedDraftOutput } from './types.js';

export const renderMarkdown = (draft: PolishedDraftOutput): string => {
  const lines: string[] = [];
  lines.push('# 长篇侦探小说稿件');
  lines.push('');
  draft.finalDraft.chapters.forEach((chapter) => {
    lines.push(`## 第${chapter.chapter}章 ${chapter.title}`);
    lines.push('');
    lines.push(chapter.text.trim());
    lines.push('');
  });

  if (draft.appliedChanges.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## 本轮润色修改');
    lines.push('');
    draft.appliedChanges.forEach((change) => {
      lines.push(`- ${change}`);
    });
    lines.push('');
  }

  if (draft.nextSteps.length > 0) {
    lines.push('## 下一步建议');
    lines.push('');
    draft.nextSteps.forEach((step) => {
      lines.push(`- ${step}`);
    });
    lines.push('');
  }

  return lines.join('\n');
};

