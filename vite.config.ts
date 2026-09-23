import { defineConfig } from 'vite';

/**
 * The app lives in app/; the library it shows off lives in src/.
 *
 * `base` is where the built page will be served from. It defaults to
 * /officina/ai/ — the address the Officina page links to — and can be
 * overridden with OFFICINA_BASE for a preview deployment elsewhere.
 */
export default defineConfig({
  root: 'app',
  base: process.env.OFFICINA_BASE ?? '/officina/ai/',
  publicDir: 'public',
  server: { port: 5178, strictPort: true, fs: { allow: ['..'] } },
  preview: { port: 5179, strictPort: true },
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2022' },
  worker: { format: 'es' },
});
