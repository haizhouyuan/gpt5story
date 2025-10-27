# Tencent Cloud Text-to-Speech Test Guide

This repository includes a helper script for validating Tencent Cloud’s **基础语音合成** (`TextToVoice`) API using the credentials stored in the project’s `.env`.  
The script lives at `apps/api/tests/tencent-tts-test.mjs`.

## Prerequisites

- Valid Tencent Cloud account with the Text-to-Speech service enabled (精品语音资源包兼容基础接口，只要账号仍有可用配额即可)  
- Node.js and `npm install` already executed for this repo (the script relies on the existing dependencies)

## Environment Variables

Add the following entries to the project’s `.env` (root directory):

```env
SecretId=YOUR_SECRET_ID
SecretKey=YOUR_SECRET_KEY
```

Either `SecretId/SecretKey` or `TENCENT_SECRET_ID/TENCENT_SECRET_KEY` are accepted.  
Optional overrides:

```env
TTS_VOICE_TYPE=101007   # integer voice ID, defaults to 101007
TTS_SAMPLE_RATE=16000    # Hz, defaults to 16000
TTS_CODEC=mp3            # mp3 | wav | pcm (mp3 by default)
TTS_TEST_TEXT=您好，这是一次腾讯云语音合成调用测试。  # custom text
```

> Tip: Script tolerates `SecretId:`/`SecretKey:` syntax as long as the value follows the colon.

## Running the Test

```bash
node apps/api/tests/tencent-tts-test.mjs
```

What happens:

1. The script reads `.env`, chooses the appropriate credentials and synthesis options.
2. It signs a TC3-HMAC-SHA256 request and calls the `TextToVoice` API.
3. On success, the synthesized audio is written to:
   ```
   apps/api/tests/tencent-tts-output.<codec>
   ```
   (e.g., `tencent-tts-output.mp3`).

Set `DEBUG_TENCENT_TTS=1` before the command to print canonical requests, timestamps, and headers:

```bash
DEBUG_TENCENT_TTS=1 node apps/api/tests/tencent-tts-test.mjs
```

## Troubleshooting

- **UnsupportedOperation.PkgExhausted** – Tencent Cloud reports that the TTS resource pack is depleted. Recharge or activate a new package, then rerun the test.
- **AuthFailure.SignatureFailure / InvalidAuthorization** – Verify that `.env` stores the correct `SecretId`/`SecretKey` pair and that the service is enabled for the corresponding account or sub-account.
- **Missing audio output** – Ensure the script has write permissions in `apps/api/tests`, and confirm the response contains `Audio` data (enabling the service generally resolves this).

With valid credentials and available quota, the generated audio file can be opened directly to audit the synthesis quality.
