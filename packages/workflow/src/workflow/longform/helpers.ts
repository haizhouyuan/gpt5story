import { z } from 'zod';
import type { LongformStageRuntime } from './context.js';

const extractJsonString = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const fenceMatch = trimmed.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
    if (fenceMatch && fenceMatch[1]) {
      return fenceMatch[1].trim();
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error('未找到可解析的 JSON 内容');
};

const parseJson = <T>(text: string): T => JSON.parse(text) as T;

export async function invokeAndParse<T extends z.ZodTypeAny>(
  runtime: LongformStageRuntime,
  stage: string,
  prompt: { system: string; user: string },
  schema: T,
): Promise<z.infer<T>> {
  const raw = await runtime.llm.plan(prompt);
  const jsonText = extractJsonString(raw);
  const data = parseJson(jsonText);
  return schema.parse(data);
}
