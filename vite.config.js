import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Applied only to the production build; the dev server needs inline scripts for React refresh.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  'connect-src http: ws:',
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
].join('; ');

const cspPlugin = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
  ],
};

export default defineConfig({
  plugins: [react(), cspPlugin],
  base: './',
  server: { port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 1000 },
});
