import { ChatOpenAI } from '@langchain/openai';
import pRetry from 'p-retry';
import type { AIMessage } from '@langchain/core/messages';

export interface LlmConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  retries?: number;
}

export interface LlmProviderOptions {
  planning?: LlmConfig;
  drafting?: LlmConfig;
}

const resolveApiKey = () =>
  process.env.GPT5STORY_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';

const resolveBaseUrl = () => {
  if (process.env.GPT5STORY_API_BASE_URL) return process.env.GPT5STORY_API_BASE_URL;
  if (process.env.OPENROUTER_API_KEY) return 'https://openrouter.ai/api/v1';
  return process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
};

const DEFAULT_PLANNING_CONFIG: Required<LlmConfig> = {
  apiKey: resolveApiKey(),
  baseUrl: resolveBaseUrl(),
  model: process.env.GPT5STORY_PLANNING_MODEL
    ?? (process.env.OPENROUTER_API_KEY ? 'openai/gpt-5' : 'gpt-4o-mini'),
  temperature: Number.parseFloat(process.env.GPT5STORY_PLANNING_TEMPERATURE ?? '0.2'),
  maxTokens: Number.parseInt(process.env.GPT5STORY_PLANNING_MAXTOKENS ?? '20000', 10),
  retries: Number.parseInt(process.env.GPT5STORY_PLANNING_RETRIES ?? '2', 10),
};

const DEFAULT_DRAFTING_CONFIG: Required<LlmConfig> = {
  apiKey: resolveApiKey(),
  baseUrl: resolveBaseUrl(),
  model: process.env.GPT5STORY_DRAFT_MODEL
    ?? (process.env.OPENROUTER_API_KEY ? 'openai/gpt-5' : 'gpt-4o-mini'),
  temperature: Number.parseFloat(process.env.GPT5STORY_DRAFT_TEMPERATURE ?? '0.7'),
  maxTokens: Number.parseInt(process.env.GPT5STORY_DRAFT_MAXTOKENS ?? '20000', 10),
  retries: Number.parseInt(process.env.GPT5STORY_DRAFT_RETRIES ?? '2', 10),
};

const resolveDefaultHeaders = () => {
  if (!process.env.OPENROUTER_API_KEY) return undefined;
  return {
    'HTTP-Referer': process.env.OPENROUTER_APP_URL ?? 'https://github.com/haizhouyuan',
    'X-Title': process.env.OPENROUTER_APP_NAME ?? 'gpt5story',
  };
};

function createChatModel(config: Required<LlmConfig>): ChatOpenAI {
  return new ChatOpenAI({
    openAIApiKey: config.apiKey,
    modelName: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    configuration: {
      baseURL: config.baseUrl,
      defaultHeaders: resolveDefaultHeaders(),
    },
  });
}

const normalizeMessageContent = (message: AIMessage): string => {
  const { content, additional_kwargs } = message;
  if (typeof content === 'string' && content.trim().length > 0) {
    return content;
  }
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part === 'object' && part && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .join('');
    if (joined.trim().length > 0) return joined;
  }
  const toolCalls = additional_kwargs?.tool_calls;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const first = toolCalls[0];
    const args = first?.function?.arguments;
    if (typeof args === 'string' && args.trim().length > 0) {
      return args;
    }
  }
  return '';
};

async function invokeWithRetry(
  model: ChatOpenAI,
  messages: Parameters<ChatOpenAI['invoke']>[0],
  retries: number,
): Promise<string> {
  const message = await pRetry(() => model.invoke(messages), { retries });
  const text = normalizeMessageContent(message);
  if (text.trim().length === 0) {
    console.error('[LlmProvider] Empty content received. Raw message:', JSON.stringify({
      content: message.content,
      additional_kwargs: message.additional_kwargs,
      response_metadata: message.response_metadata,
    }, null, 2));
  }
  return text;
}

export interface LlmExecutor {
  plan(prompt: { system: string; user: string }): Promise<string>;
  draft(prompt: { system: string; user: string }): Promise<string>;
}

export class LlmProvider implements LlmExecutor {
  private planningModel: ChatOpenAI;

  private draftingModel: ChatOpenAI;

  private planningConfig: Required<LlmConfig>;

  private draftingConfig: Required<LlmConfig>;

  constructor(opts: LlmProviderOptions = {}) {
    this.planningConfig = { ...DEFAULT_PLANNING_CONFIG, ...(opts.planning ?? {}) };
    this.draftingConfig = { ...DEFAULT_DRAFTING_CONFIG, ...(opts.drafting ?? {}) };

    if (!this.planningConfig.apiKey) {
      throw new Error('Planning model API key is required (OPENAI_API_KEY or GPT5STORY specific variables).');
    }

    this.planningModel = createChatModel(this.planningConfig);
    this.draftingModel = createChatModel(this.draftingConfig);
  }

  async plan(prompt: { system: string; user: string }): Promise<string> {
    return invokeWithRetry(this.planningModel, [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ], this.planningConfig.retries);
  }

  async draft(prompt: { system: string; user: string }): Promise<string> {
    return invokeWithRetry(this.draftingModel, [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ], this.draftingConfig.retries);
  }
}
