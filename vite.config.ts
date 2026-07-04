import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const apiPort = Number(process.env.WRANGLER_DEV_PORT ?? 8787);

function isSpaIndexHtml(html: string): boolean {
  return html.includes('id="root"') && html.includes('/src/main.tsx');
}

function resolveLandingHtml(): string | null {
  const candidates = [
    path.resolve('landing-astro/dist/index.html'),
    path.resolve('dist/index.html'),
  ];

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const html = readFileSync(file, 'utf8');
    if (isSpaIndexHtml(html)) continue;
    return html;
  }

  return null;
}

function landingPagePlugin(): Plugin {
  return {
    name: 'email-manager-landing',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (req.method !== 'GET' || url !== '/') {
          next();
          return;
        }

        const html = resolveLandingHtml();
        if (!html) {
          next();
          return;
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      });
    },
  };
}

export default defineConfig({
  server: {
    host: '::',
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  plugins: [landingPagePlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
