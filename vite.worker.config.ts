import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    ssr: true,
    outDir: 'dist/client',
    emptyOutDir: false,
    minify: true,
    rollupOptions: {
      input: 'src/cloudflare-worker.ts',
      output: {
        entryFileNames: '_worker.js',
        format: 'esm',
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    conditions: ['worker', 'browser', 'module', 'import', 'default'],
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  ssr: {
    noExternal: true,
    target: 'webworker',
  },
});
