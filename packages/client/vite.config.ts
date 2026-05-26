import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { fileURLToPath, URL } from 'node:url';

const enginePkg = fileURLToPath(new URL('../engine/pkg', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: `${enginePkg}/galaga_engine_bg.wasm`, dest: 'assets' },
      ],
    }),
  ],
  base: './',
  resolve: {
    alias: {
      '@galaga/engine': enginePkg,
    },
  },
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: ['..', '../..'],
    },
  },
  optimizeDeps: {
    exclude: ['@galaga/engine'],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  assetsInclude: ['**/*.wasm'],
});
