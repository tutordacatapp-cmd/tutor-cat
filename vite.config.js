import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:demo` gera um único arquivo HTML (para testar no celular).
// `npm run build` gera o app normal para hospedar (Vercel).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'demo' ? [viteSingleFile()] : [])],
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist' },
}));
