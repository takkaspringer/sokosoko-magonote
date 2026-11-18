import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: { preserveSymlinks: true },
  build: { assetsInlineLimit: 8192 },
});
