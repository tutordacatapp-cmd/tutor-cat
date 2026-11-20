import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:demo` gera um único arquivo HTML (para testar no celular).
// `npm run build` gera o app normal para hospedar (Vercel).
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __VERSAO__: JSON.stringify(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) },
  plugins: [react(), ...(mode === 'demo' ? [viteSingleFile()] : [])],
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist' },
}));
