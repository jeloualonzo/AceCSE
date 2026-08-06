/// <reference types="vite/client" />

/** Injected at build time from package.json (see vite.config.ts `define`). */
declare const __APP_VERSION__: string;

declare module 'virtual:question-manifest' {
  import type { QuestionManifest } from '@/data/questionShape';
  const manifest: QuestionManifest;
  export default manifest;
}
