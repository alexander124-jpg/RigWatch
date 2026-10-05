import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Development serves at /; production builds target the GitHub Pages project path.
  base: command === 'build' ? '/RigWatch/' : '/',
}));
