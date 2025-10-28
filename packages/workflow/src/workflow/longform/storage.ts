import fs from 'node:fs';
import path from 'node:path';

export interface MarkdownPersistOptions {
  root: string;
  traceId: string;
  content: string;
  createdAt?: Date;
  attempt?: number;
}

export interface MarkdownPersistResult {
  absolutePath: string;
  relativePath: string;
}

const formatDate = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const formatTimestamp = (date: Date) => date.toISOString().replace(/[:.]/g, '-');

const resolveVersion = async (dir: string, traceId: string, attempt?: number): Promise<number> => {
  if (typeof attempt === 'number' && Number.isFinite(attempt) && attempt > 0) {
    return Math.floor(attempt);
  }

  try {
    const entries = await fs.promises.readdir(dir);
    const prefix = `${traceId}_stage7_v`;
    const matched = entries
      .map((entry) => entry.startsWith(prefix) ? entry.slice(prefix.length, prefix.length + 2) : undefined)
      .filter((value): value is string => Boolean(value))
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value));
    if (matched.length === 0) {
      return 1;
    }
    return Math.max(...matched) + 1;
  } catch {
    return 1;
  }
};

export const persistMarkdownArtifact = async (options: MarkdownPersistOptions): Promise<MarkdownPersistResult> => {
  const { root, traceId, content, createdAt, attempt } = options;
  const baseDate = createdAt ?? new Date();
  const datePart = formatDate(baseDate);
  const dir = path.resolve(root, datePart);
  await fs.promises.mkdir(dir, { recursive: true });
  const versionNumber = await resolveVersion(dir, traceId, attempt);
  const version = String(Math.max(versionNumber, 1)).padStart(2, '0');
  const timestamp = formatTimestamp(new Date());
  const fileName = `${traceId}_stage7_v${version}_${timestamp}.md`;
  const filePath = path.join(dir, fileName);
  await fs.promises.writeFile(filePath, content, 'utf-8');
  const relativePath = path.join(datePart, fileName);
  return { absolutePath: filePath, relativePath };
};
