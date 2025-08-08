import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
const NODE_ENV = process.env.NODE_ENV === 'development';
export default defineConfig({
  // base: '/testone/',
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url))
      }
    ]
  },
  esbuild: {
    drop: NODE_ENV ? [] : ['console', 'debugger']
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    minify: 'terser',
    terserOptions: {
      compress: NODE_ENV
        ? {}
        : {
            drop_console: true,
            drop_debugger: true
          }
    },
    rollupOptions: {
      output: {
        dir: 'dist-testone',
        entryFileNames: `assets/index.js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
});
