import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { questionManifestPlugin } from './scripts/vite-plugin-question-manifest';

import { version } from './package.json';

export default defineConfig({
  plugins: [react(), tailwindcss(), questionManifestPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Firestore is only reached via dynamic import (src/services/*);
          // keeping it in its own chunk preserves that laziness. Auth + app
          // core stay in a separate, much smaller eager chunk.
          if (
            id.includes('@firebase/firestore') ||
            id.includes('node_modules/firebase/firestore') ||
            id.includes('@firebase/webchannel-wrapper')
          ) {
            return 'firebase-firestore';
          }
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase-core';
          }
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/scheduler') ||
            id.includes('node_modules/lucide-react')
          ) {
            return 'vendor';
          }
          // NOTE: no manual chunk for content/questions — each dataset file is
          // deliberately its own lazy chunk (see src/data/questionBank.ts).
          return undefined;
        },
      },
    },
  },
});
