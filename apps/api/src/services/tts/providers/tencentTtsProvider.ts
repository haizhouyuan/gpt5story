import { createHmac, createHash, randomUUID } from 'crypto';
import type { TtsProvider, TtsProviderCapabilities, TtsSynthesisParams, TtsSynthesisResult } from '../types.js';

interface TencentConfig {
  secretId: string;
  secretKey: string;
  region: string;
  voiceType: number;
  codec: 'mp3' | 'pcm';
  sampleRate: number;
}

type TextToVoiceResponse = {
  Audio?: string;
  Audios?: Array<{ Audio?: string }>;
  RequestId: string;
};

const WORLD_TIME_ENDPOINT = 'https://worldtimeapi.org/api/timezone/Etc/UTC';

let cachedUtcTimestamp: number | null = null;
let cachedAtLocalMs = 0;

const sha256 = (payload: string) => createHash('sha256').update(payload).digest('hex');

const hmacSha256 = (key: string | Buffer, payload: string) => createHmac('sha256', key).update(payload).digest();

async function getAccurateTimestamp(): Promise<number> {
  const nowLocalMs = Date.now();
  if (cachedUtcTimestamp !== null && nowLocalMs - cachedAtLocalMs < 60_000) {
    const deltaSeconds = Math.floor((nowLocalMs - cachedAtLocalMs) / 1000);
    return cachedUtcTimestamp + deltaSeconds;
  }

  const fallback = Math.floor(nowLocalMs / 1000);
  try {
    const response = await fetch(WORLD_TIME_ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`time api status ${response.status}`);
    }
    const data = await response.json() as { unixtime?: number };
    if (typeof data.unixtime === 'number') {
      cachedUtcTimestamp = data.unixtime;
      cachedAtLocalMs = nowLocalMs;
      return data.unixtime;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function signRequest(action: string, payload: Record<string, unknown>, config: TencentConfig, host: string, timestamp: number) {
  const service = 'tts';
  const version = '2019-08-23';
  const payloadString = JSON.stringify(payload);
  const hashedPayload = sha256(payloadString);
  const canonicalHeaders = [
    'content-type:application/json; charset=utf-8',
    `host:${host}`,
  ].join('\n');
  const signedHeaders = 'content-type;host';
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n\n${signedHeaders}\n${hashedPayload}`;

  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = sha256(canonicalRequest);
  const stringToSign = ['TC3-HMAC-SHA256', String(timestamp), credentialScope, hashedCanonicalRequest].join('\n');

  const secretDate = hmacSha256(`TC3${config.secretKey}`, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

  const authorization = [
    `TC3-HMAC-SHA256 Credential=${config.secretId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(', ');

  return {
    authorization,
    version,
    payloadString,
  };
}

const collectAudio = (response: TextToVoiceResponse): string => {
  const audioParts: string[] = [];
  if (response.Audio) {
    audioParts.push(response.Audio);
  }
  if (Array.isArray(response.Audios)) {
    for (const item of response.Audios) {
      if (item?.Audio) {
        audioParts.push(item.Audio);
      }
    }
  }
  if (!audioParts.length) {
    throw new Error('TextToVoice response did not include audio content');
  }
  return audioParts.join('');
};

const resolveConfig = (): TencentConfig => {
  const env = process.env;
  const secretId = env.TENCENT_SECRET_ID || env.SecretId;
  const secretKey = env.TENCENT_SECRET_KEY || env.SecretKey;
  if (!secretId || !secretKey) {
    throw new Error('TENCENT_SECRET_ID/TENCENT_SECRET_KEY 未配置');
  }
  const region = env.TENCENT_REGION || 'ap-guangzhou';
  const voiceType = Number(env.TTS_VOICE_TYPE) || 101007;
  const codec = (env.TTS_CODEC || 'mp3').toLowerCase() === 'pcm' ? 'pcm' : 'mp3';
  const sampleRate = Number(env.TTS_SAMPLE_RATE) || 16000;
  return {
    secretId,
    secretKey,
    region,
    voiceType,
    codec,
    sampleRate,
  };
};

export class TencentTtsProvider implements TtsProvider {
  readonly id = 'tencent';

  readonly capabilities: TtsProviderCapabilities = {
    voices: [
      { id: '101007', name: '助手（女聲）', language: 'zh-CN', gender: 'female', description: '腾讯云精品女声' },
      { id: '101004', name: '助手（男聲）', language: 'zh-CN', gender: 'male', description: '腾讯云精品男声' },
    ],
    speedRange: [0.6, 1.4],
    pitchRange: [0.8, 1.2],
    formats: ['mp3', 'pcm'],
    defaultVoice: '101007',
  };

  private readonly config: TencentConfig;

  private readonly host = 'tts.tencentcloudapi.com';

  constructor(config?: Partial<TencentConfig>) {
    this.config = {
      ...resolveConfig(),
      ...config,
    };
  }

  async synthesize(params: TtsSynthesisParams): Promise<TtsSynthesisResult> {
    const text = params.text.trim();
    if (!text) {
      throw new Error('文本内容不能为空');
    }

    const voiceId = Number(params.voiceId ?? this.config.voiceType);
    const codec = params.format ?? this.config.codec;
    const sampleRate = this.config.sampleRate;
    const payload = {
      Text: text,
      Codec: codec,
      SampleRate: sampleRate,
      VoiceType: voiceId,
      Speed: 0,
      Volume: 0,
      SessionId: params.metadata?.sessionId ?? randomUUID(),
    };

    const timestamp = await getAccurateTimestamp();
    const { authorization, version, payloadString } = signRequest(
      'TextToVoice',
      payload,
      this.config,
      this.host,
      timestamp,
    );

    const headers: Record<string, string> = {
      Authorization: authorization,
      'Content-Type': 'application/json; charset=utf-8',
      Host: this.host,
      'X-TC-Action': 'TextToVoice',
      'X-TC-Version': version,
      'X-TC-Region': this.config.region,
      'X-TC-Timestamp': String(timestamp),
    };

    const response = await fetch(`https://${this.host}`, {
      method: 'POST',
      headers,
      body: payloadString,
    });

    if (!response.ok) {
      const textBody = await response.text();
      throw new Error(`Tencent TTS request failed: ${response.status} ${textBody}`);
    }

    const data = await response.json() as { Response?: TextToVoiceResponse & { Error?: { Code: string; Message: string } } };
    if (!data.Response) {
      throw new Error('Tencent TTS response missing body');
    }
    if (data.Response.Error) {
      const err = data.Response.Error;
      const error = new Error(`${err.Code}: ${err.Message}`);
      (error as any).code = err.Code;
      throw error;
    }

    const base64Audio = collectAudio(data.Response);
    const audioUrl = codec === 'pcm'
      ? `data:audio/pcm;base64,${base64Audio}`
      : `data:audio/mpeg;base64,${base64Audio}`;

    const durationMs = Math.max(1000, Math.floor(text.length * 45));

    return {
      requestId: data.Response.RequestId ?? randomUUID(),
      provider: this.id,
      audioUrl,
      format: codec,
      durationMs,
      expiresAt: Date.now() + 5 * 60 * 1000,
      metadata: { voiceType: voiceId, region: this.config.region },
    };
  }
}
