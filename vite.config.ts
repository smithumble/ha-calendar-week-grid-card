import { defineConfig, createLogger } from 'vite';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: 'dist',
  optimizeDeps: {
    include: ['lit', 'custom-card-helpers'],
  },
  server: {
    port: 5000,
    host: 'localhost',
    cors: true,
    watch: {
      ignored: (path: string) => {
        return path.startsWith(resolve(__dirname, 'dist'));
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

        const watchPaths = ['src', 'scripts', 'assets/configs'];
        watchPaths.forEach((path) => {
          server.watcher.add(resolve(__dirname, path));
        });

        server.watcher.on('change', (file) => {
          const relativePath = file.replace(__dirname + '/', '');
          logger.info(`Changed: ${relativePath}`, { timestamp: true });
          generate();
          server.ws.send({ type: 'full-reload' });
          logger.info('Server reloaded.', { timestamp: true });
        });
      },
    },
  ],
});
