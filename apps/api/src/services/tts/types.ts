export type TtsAudioFormat = 'mp3' | 'pcm';

export interface TtsSynthesisRequest {
  text: string;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  format?: TtsAudioFormat;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export type TtsSynthesisParams = TtsSynthesisRequest;

export interface TtsSynthesisResult {
  requestId: string;
  provider: string;
  audioUrl: string;
  format: TtsAudioFormat;
  expiresAt: number;
  durationMs?: number;
  checksum?: string;
  warnings?: string[];
  cached?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TtsProviderCapabilities {
  voices: Array<{
    id: string;
    name: string;
    language: string;
    gender?: 'male' | 'female' | 'child';
    description?: string;
  }>;
  speedRange: [number, number];
  pitchRange: [number, number];
  formats: TtsAudioFormat[];
  defaultVoice: string;
}

export interface TtsProvider {
  readonly id: string;
  readonly capabilities: TtsProviderCapabilities;
  readonly metadata?: Record<string, unknown>;
  synthesize(params: TtsSynthesisParams): Promise<TtsSynthesisResult>;
}

export interface TtsCacheEntry {
  key: string;
  result: TtsSynthesisResult;
  expiresAt: number;
}

export interface TtsCacheDriver {
  get(key: string): Promise<TtsCacheEntry | null>;
  set(entry: TtsCacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface TtsManagerOptions {
  cacheTtlMs?: number;
}

export interface CreateTaskOptions {
  text: string;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  format?: TtsAudioFormat;
  metadata?: Record<string, unknown>;
}
