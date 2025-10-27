import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import pRetry from 'p-retry';

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
  maxTokens: Number.parseInt(process.env.GPT5STORY_PLANNING_MAXTOKENS ?? '2000', 10),
  retries: Number.parseInt(process.env.GPT5STORY_PLANNING_RETRIES ?? '2', 10),
};

const DEFAULT_DRAFTING_CONFIG: Required<LlmConfig> = {
  apiKey: resolveApiKey(),
  baseUrl: resolveBaseUrl(),
  model: process.env.GPT5STORY_DRAFT_MODEL
    ?? (process.env.OPENROUTER_API_KEY ? 'openai/gpt-5' : 'gpt-4o-mini'),
  temperature: Number.parseFloat(process.env.GPT5STORY_DRAFT_TEMPERATURE ?? '0.7'),
  maxTokens: Number.parseInt(process.env.GPT5STORY_DRAFT_MAXTOKENS ?? '3000', 10),
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

async function invokeWithRetry<TInput, TOutput>(
  runnable: RunnableSequence<TInput, TOutput>,
  input: TInput,
  retries: number,
): Promise<TOutput> {
  return pRetry(() => runnable.invoke(input), { retries });
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
    const chain = RunnableSequence.from([
      this.planningModel,
      new StringOutputParser(),
    ]);

    return invokeWithRetry(chain, [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ], this.planningConfig.retries);
  }

  async draft(prompt: { system: string; user: string }): Promise<string> {
    const chain = RunnableSequence.from([
      this.draftingModel,
      new StringOutputParser(),
    ]);

    return invokeWithRetry(chain, [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ], this.draftingConfig.retries);
  }
}
