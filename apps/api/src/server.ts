import 'dotenv/config';
import { loadEnvConfig } from './config/env.js';
import { createApp } from './app.js';

const env = loadEnvConfig();
const allowedOrigins = env.ALLOW_ORIGINS ? env.ALLOW_ORIGINS.split(',').map((origin) => origin.trim()) : undefined;

const app = createApp({
  cors: {
    origin: allowedOrigins ?? true,
    credentials: true,
  },
});

const options = { port: env.PORT };

app.listen(options, () => {
  // eslint-disable-next-line no-console
  console.log(`[gpt5story] API listening on http://localhost:${env.PORT}`);
});
