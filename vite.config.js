import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/GOOGLE-ADS/' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
  },
});
