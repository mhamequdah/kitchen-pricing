import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// إعدادات Vite — بدون أي اعتماد على Server أو Backend
// base: './' يضمن أن الروابط تعمل بشكل صحيح على أي استضافة Static (Vercel/Netlify/Cloudflare Pages)
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
});
