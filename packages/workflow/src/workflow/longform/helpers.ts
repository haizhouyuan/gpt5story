import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
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
  try {
    const extracted = extractJsonString(raw);
    const data = parseJson(extracted);
    return schema.parse(data);
  } catch (error) {
    const snippet = raw.slice(0, 400);
    console.error(`[${stage}] LLM raw output preview: ${snippet}`);

    try {
      let target: string;
      try {
        target = extractJsonString(raw);
      } catch {
        target = raw;
      }
      const repaired = jsonrepair(target);
      const normalized = target === raw ? extractJsonString(repaired) : repaired;
      const data = parseJson(normalized);
      return schema.parse(data);
    } catch (repairError) {
      console.error(`[${stage}] jsonrepair failed:`, repairError);
      const message = `Stage ${stage} 输出解析失败，收到内容前 400 字符：${snippet}`;
      const err = new Error(message);
      (err as Error & { cause?: unknown }).cause = repairError;
      throw err;
    }
  }
}
