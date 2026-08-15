import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps the production build runnable from any static subdirectory
// (GitHub Pages project site, a course server folder, or straight off disk).
export default defineConfig({
  base: './',
  plugins: [react()],
});
