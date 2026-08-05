import { useEffect } from 'react';

const BASE_TITLE = 'AceCSE — Philippine Civil Service Exam Simulator';

/** Per-page browser tab titles; restores the base title on unmount. */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · AceCSE` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
