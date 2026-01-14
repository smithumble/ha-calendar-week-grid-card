import { defineConfig, createLogger } from 'vite';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: 'dist',
  clearScreen: false,
  optimizeDeps: {
    include: ['lit', 'custom-card-helpers'],
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    strictPort: false,
    cors: true,
    watch: {
      ignored: (path: string) => {
        // Only ignore dist subdirectories, not the built JS file itself
        const distPath = resolve(__dirname, 'dist');
        if (path.startsWith(distPath)) {
          // Allow watching the built JS file
          if (path === resolve(__dirname, 'dist/calendar-week-grid-card.js')) {
            return false;
          }
          // Ignore everything else in dist
          return true;
        }
        return false;
      },
    },
  },
  plugins: [
    {
      name: 'generate-dev-page',
      configureServer(server) {
        const logger = createLogger('info', {
          prefix: '[vite:generate-dev-page]',
        });

        const generate = () => {
          try {
            execSync('npm run generate-dev-page');
            logger.info('Dev page generated.', { timestamp: true });
          } catch (error) {
            logger.error(
              `Failed to generate dev page: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        };

        generate();

        // Watch source files for dev page regeneration
        const watchPaths = ['src', 'scripts', 'assets'];
        watchPaths.forEach((path) => {
          server.watcher.add(resolve(__dirname, path));
        });

        // Watch the built file directly for HMR
        const builtFile = resolve(__dirname, 'dist/calendar-week-grid-card.js');
        server.watcher.add(builtFile);

        let reloadTimeout: NodeJS.Timeout | null = null;

        server.watcher.on('change', (file) => {
          const relativePath = file.replace(__dirname + '/', '');
          logger.info(`Changed: ${relativePath}`, { timestamp: true });

          // If source files changed, regenerate dev page
          if (
            file.startsWith(resolve(__dirname, 'src')) ||
            file.startsWith(resolve(__dirname, 'scripts')) ||
            file.startsWith(resolve(__dirname, 'assets'))
          ) {
            generate();
          }

          const reload = () => {
            server.ws.send({ type: 'full-reload' });
            logger.info('Server reloaded.', { timestamp: true });
          };

          // If the built file changed, reload after a short delay
          // This ensures Rollup has finished writing the file
          if (
            file === builtFile ||
            file.startsWith(resolve(__dirname, 'src'))
          ) {
            if (reloadTimeout) {
              clearTimeout(reloadTimeout);
            }
            reloadTimeout = setTimeout(reload, 300); // Wait 300ms for Rollup to finish building
          } else {
            reload();
          }
        });
      },
    },
  ],
});
