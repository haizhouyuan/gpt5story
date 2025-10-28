import fs from 'node:fs';
import path from 'node:path';
import type { EvaluationReport } from './types.js';

export interface QaBoardEntry {
  traceId: string;
  projectId: string;
  createdAt: string;
  titleCandidates?: string[];
  stage5Attempts: number;
  stage6Attempts: number;
  autoRevisionRounds: number;
  reviewMustFix: number;
  reviewWarnings: number;
  reviewMustFixDetail: string[];
  reviewWarningsDetail: string[];
  totalWordCount: number;
  chapterCount: number;
  evaluation: EvaluationReport;
  markdownPath?: string;
}

const BOARD_FILENAME = 'qa-board.json';

export const appendQaBoardEntry = async (root: string, entry: QaBoardEntry): Promise<string> => {
  const dir = path.resolve(root);
  await fs.promises.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, BOARD_FILENAME);

  let entries: QaBoardEntry[] = [];
  try {
    const existing = await fs.promises.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(existing) as QaBoardEntry[];
    if (Array.isArray(parsed)) {
      entries = parsed;
    }
  } catch {
    entries = [];
  }

  entries.push(entry);
  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  await fs.promises.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');
  return filePath;
};
