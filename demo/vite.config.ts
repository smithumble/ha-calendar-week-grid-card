import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import type { HotPayload } from 'vite/types/hmrPayload';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const VITE_BASE_PATH = '/ha-calendar-week-grid-card';

/**
 * Coalesce rapid Rollup writes (entry + chunk + HTML).
 */
const HMR_DEBOUNCE_MS = 300;

function debounceHmrPayloadsPlugin(delayMs: number): Plugin {
  return {
    name: 'debounce-hmr-payloads',
    enforce: 'post',
    configureServer(server) {
      return () => {
        const originalSend = server.ws.send.bind(server.ws);
        let timer: ReturnType<typeof setTimeout> | undefined;

        server.ws.send = (payload: HotPayload) => {
          if (timer !== undefined) {
            clearTimeout(timer);
          }
          timer = setTimeout(() => {
            timer = undefined;
            originalSend(payload);
          }, delayMs);
        };
      };
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, '../dist'),
  clearScreen: false,
  logLevel: 'silent',
  appType: 'mpa',
  base: `${VITE_BASE_PATH}/`,
  plugins: [debounceHmrPayloadsPlugin(HMR_DEBOUNCE_MS)],
  // Enable serving static assets from the root directory
  publicDir: false,
  server: {
    port: 5001,
    host: '0.0.0.0',
    strictPort: false,
    cors: true,
    watch: {
      // Watch for changes in dist directory to trigger reload
      usePolling: false,
    },
    // Ensure static files are served correctly
    fs: {
      strict: false,
      allow: ['..'],
    },
  },
});
