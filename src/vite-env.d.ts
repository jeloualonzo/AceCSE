/// <reference types="vite/client" />

declare module 'virtual:question-manifest' {
  import type { QuestionManifest } from '@/data/questionShape';
  const manifest: QuestionManifest;
  export default manifest;
}
