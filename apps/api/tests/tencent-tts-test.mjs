import { readFile, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEBUG = process.env.DEBUG_TENCENT_TTS === "1";

let cachedUtcTimestamp = null;
let cachedAtLocalMs = 0;

async function getAccurateTimestamp() {
  const nowLocalMs = Date.now();
  if (
    cachedUtcTimestamp !== null &&
    nowLocalMs - cachedAtLocalMs < 60_000
  ) {
    const deltaSeconds = Math.floor((nowLocalMs - cachedAtLocalMs) / 1000);
    return cachedUtcTimestamp + deltaSeconds;
  }

  const fallback = Math.floor(nowLocalMs / 1000);
  try {
    const response = await fetch(
      "https://worldtimeapi.org/api/timezone/Etc/UTC",
      { method: "GET", headers: { "Accept": "application/json" } },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (typeof data.unixtime === "number") {
      cachedUtcTimestamp = data.unixtime;
      cachedAtLocalMs = nowLocalMs;
      return data.unixtime;
    }
    return fallback;
  } catch (error) {
    if (DEBUG) {
      console.warn(`Falling back to local clock: ${error.message}`);
    }
    return fallback;
  }
}

function parseEnv(content) {
  const result = {};
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line) => {
      const match = line.match(/^([^=:#\s]+)\s*[:=]\s*(.+)$/);
      if (!match) {
        return;
      }
      const key = match[1];
      const value = match[2].trim();
      if (key.toLowerCase() === "secretid") {
        result.TENCENT_SECRET_ID = value;
      } else if (key.toLowerCase() === "secretkey") {
        result.TENCENT_SECRET_KEY = value;
      } else {
        result[key] = value;
      }
    });
  return result;
}

function sha256(payload) {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function hmacSha256(key, payload) {
  return crypto.createHmac("sha256", key).update(payload).digest();
}

function signRequest({
  action,
  payload,
  secretId,
  secretKey,
  region,
  service,
  version,
  host,
  timestamp,
}) {
  const payloadString = JSON.stringify(payload);
  const hashedPayload = sha256(payloadString);
  const canonicalHeaders = [
    "content-type:application/json; charset=utf-8",
    `host:${host}`,
  ].join("\n");
  const signedHeaders = "content-type;host";
  const canonicalRequest =
    "POST\n/\n\n" +
    `${canonicalHeaders}\n\n` +
    `${signedHeaders}\n${hashedPayload}`;

  const date = new Date(timestamp * 1000)
    .toISOString()
    .slice(0, 10);
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = sha256(canonicalRequest);
  const stringToSign = [
    "TC3-HMAC-SHA256",
    String(timestamp),
    credentialScope,
    hashedCanonicalRequest,
  ].join("\n");

  if (DEBUG) {
    console.log("Payload string:", payloadString);
    console.log("Canonical request:", canonicalRequest);
    console.log("String to sign:", stringToSign);
  }

  const secretDate = hmacSha256(`TC3${secretKey}`, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, "tc3_request");
  const signature = crypto
    .createHmac("sha256", secretSigning)
    .update(stringToSign)
    .digest("hex");

  const authorization = [
    `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  return {
    authorization,
    payloadString,
    hashedPayload,
  };
}

async function callTencent({
  action,
  payload,
  secretId,
  secretKey,
  region,
}) {
  const host = "tts.tencentcloudapi.com";
  const service = "tts";
  const version = "2019-08-23";
  const endpoint = `https://${host}`;
  const timestamp = await getAccurateTimestamp();

  const { authorization, payloadString } = signRequest({
    action,
    payload,
    secretId,
    secretKey,
    region,
    service,
    version,
    host,
    timestamp,
  });

  const headers = {
    Authorization: authorization,
    "Content-Type": "application/json; charset=utf-8",
    Host: host,
    "X-TC-Action": action,
    "X-TC-Version": version,
    "X-TC-Region": region,
    "X-TC-Timestamp": String(timestamp),
  };

  if (DEBUG) {
    console.log(`Request headers for ${action}:`, {
      ...headers,
      Authorization: `${authorization.slice(0, 32)}...`,
    });
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: payloadString,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const data = await response.json();
  if (data.Response?.Error) {
    const err = new Error(
      `${data.Response.Error.Code}: ${data.Response.Error.Message}`,
    );
    err.code = data.Response.Error.Code;
    err.requestId = data.Response.RequestId;
    throw err;
  }
  return data.Response;
}

async function main() {
  const envPath = path.resolve(__dirname, "../../../.env");
  let envVars = {};
  try {
    const envContent = await readFile(envPath, "utf8");
    envVars = parseEnv(envContent);
  } catch (error) {
    console.warn(`Unable to read ${envPath}: ${error.message}`);
  }

  const secretId =
    envVars.TENCENT_SECRET_ID ||
    process.env.TENCENT_SECRET_ID ||
    process.env.SecretId;
  const secretKey =
    envVars.TENCENT_SECRET_KEY ||
    process.env.TENCENT_SECRET_KEY ||
    process.env.SecretKey;
  const region =
    envVars.TENCENT_REGION || process.env.TENCENT_REGION || "ap-guangzhou";
  const text =
    envVars.TTS_TEST_TEXT ||
    process.env.TTS_TEST_TEXT ||
    "您好，这是一次腾讯云语音合成调用测试。";

  if (!secretId || !secretKey) {
    console.error(
      "Missing Tencent Cloud credentials. Please set SecretId/SecretKey in .env or environment variables.",
    );
    process.exit(1);
  }

  console.log("Submitting TextToVoice request...");
  if (DEBUG) {
    console.log(
      `Using credentials: SecretId length=${secretId.length}, SecretKey length=${secretKey.length}`,
    );
  }
  const voiceType =
    Number(envVars.TTS_VOICE_TYPE || process.env.TTS_VOICE_TYPE) || 101007;
  const codec = envVars.TTS_CODEC || process.env.TTS_CODEC || "mp3";
  const sampleRate =
    Number(envVars.TTS_SAMPLE_RATE || process.env.TTS_SAMPLE_RATE) || 16000;
  const sessionId = crypto.randomUUID();

  const result = await callTencent({
    action: "TextToVoice",
    payload: {
      Text: text,
      Codec: codec,
      SampleRate: sampleRate,
      VoiceType: voiceType,
      Speed: 0,
      Volume: 0,
      SessionId: sessionId,
    },
    secretId,
    secretKey,
    region,
  });

  const audioChunks = [];
  if (result.Audio) {
    audioChunks.push(result.Audio);
  }
  if (Array.isArray(result.Audios)) {
    for (const item of result.Audios) {
      if (item?.Audio) {
        audioChunks.push(item.Audio);
      }
    }
  }
  if (audioChunks.length === 0) {
    throw new Error("TextToVoice response did not include audio content");
  }

  const audioBuffer = Buffer.from(audioChunks.join(""), "base64");
  const outputPath = path.resolve(__dirname, "tencent-tts-output." + codec);
  await writeFile(outputPath, audioBuffer);

  console.log(
    `TTS synthesis completed. Audio saved to ${outputPath} (${audioBuffer.length} bytes).`,
  );
}

main().catch((error) => {
  if (error?.code === "UnsupportedOperation.PkgExhausted") {
    console.error(
      "Tencent TTS test aborted: resource pack exhausted. Please recharge the TTS quota in Tencent Cloud and retry.",
    );
    process.exit(2);
  }
  console.error("Tencent TTS test failed:", error);
  process.exit(1);
});
