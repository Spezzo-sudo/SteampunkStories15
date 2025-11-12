import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import postcss from './postcss.config.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    css: {
      postcss,
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: {
        clientPort: 443,
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5001/steampunk-stories-15/us-central1/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
      },
    },
  };
});
