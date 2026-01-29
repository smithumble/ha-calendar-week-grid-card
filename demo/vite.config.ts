import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: resolve(__dirname, '../dist'),
  clearScreen: false,
  base: './',
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
