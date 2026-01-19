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
  plugins: [
    {
      name: 'reload-on-change',
      configureServer(server) {
        // Watch assets
        const assetsPath = resolve(__dirname, 'assets');
        server.watcher.add(assetsPath);

        // Watch paths
        const watchPaths = [assetsPath];

        // Reload on any change in dist or assets
        const handleFileEvent = (event: string, file: string) => {
          if (watchPaths.some((path) => file.startsWith(path))) {
            console.log(`Reloading due to ${event} in:`, file);
            server.ws.send({
              type: 'full-reload',
            });
          }
        };

        server.watcher.on('change', (file) => handleFileEvent('change', file));
        server.watcher.on('add', (file) => handleFileEvent('add', file));
        server.watcher.on('unlink', (file) => handleFileEvent('unlink', file));
      },
    },
  ],
});
