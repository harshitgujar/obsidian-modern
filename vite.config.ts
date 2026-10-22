import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { ObsidianVaultServer } from './server/obsidianBackend';

const obsidianVaultPlugin = (): Plugin => {
  return {
    name: 'obsidian-vault-backend',
    configureServer(server) {
      const backend = new ObsidianVaultServer();
      server.middlewares.use((req, res, next) => {
        backend.handleRequest(req, res, next);
      });
    }
  };
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    obsidianVaultPlugin()
  ],
  server: {
    port: 5175,
    host: true,
    watch: {
      // CRITICAL: Ignore vault, resources, and global obsidian files from Vite HMR to prevent full-page reload loops
      ignored: [
        '**/vault/**',
        '**/resources/**',
        '**/.obsidian/**',
        '**/.obsidian-global.json',
        '**/*.bak'
      ]
    }
  }
});
