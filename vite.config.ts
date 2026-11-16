import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// relative base so dist/ works from any folder
export default defineConfig({
  base: './',
  plugins: [react()],
});
