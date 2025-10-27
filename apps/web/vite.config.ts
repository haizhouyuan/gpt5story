import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const envAllowedHosts = (process.env.VITE_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const allowedHosts = Array.from(new Set([
  'fnos.dandanbaba.xyz',
  'localhost',
  '127.0.0.1',
  ...envAllowedHosts,
]));

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number.parseInt(process.env.VITE_PORT ?? '5173', 10),
    allowedHosts,
  },
});
