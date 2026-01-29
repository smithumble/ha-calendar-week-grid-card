import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: resolve(__dirname, '../dist'),
  clearScreen: false,
  base: '/ha-calendar-week-grid-card/',
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
      name: 'auto-prefix',
      configureServer(server) {
        const base = '/ha-calendar-week-grid-card';
        server.middlewares.use((req, res, next) => {
          if (!req.url) {
            return next();
          }

          // Skip if already prefixed or is a Vite internal request
          if (req.url.startsWith(base) || req.url.startsWith('/@')) {
            return next();
          }

          // Root redirect
          if (req.url === '/' || req.url === '') {
            return res.writeHead(302, { Location: `${base}/` }).end();
          }

          // Only auto-prefix HTML pages (routes ending with /, .html, or no extension)
          // This is for testing that all assets are served with relative paths.
          const [path] = req.url.split('?');
          const hasExtension = path.includes('.') && !path.endsWith('.html');
          const isPage =
            path.endsWith('/') || path.endsWith('.html') || !hasExtension;

          if (!isPage) {
            return next();
          }

          // Auto-prefix page requests
          const [urlPath, query] = req.url.split('?');
          const newUrl = `${base}${urlPath}${query ? `?${query}` : ''}`;
          return res.writeHead(302, { Location: newUrl }).end();
        });
      },
    },
  ],
});
