import { useEffect, useState } from 'react';
import { loadContentCatalog } from '@/data/questionBank';
import type { NormalizedContentCatalog } from '@/data/contentCatalog';
import type { Subject } from '@/types';

/**
 * Loads the production content catalog for a set of subjects.
 *
 * Shared by the Content Bank surfaces so each one does not re-implement the
 * load-and-cancel effect. The dependency is the joined subject list rather than
 * the array itself: callers naturally pass a fresh literal on every render, and
 * keying on identity would reload the bank forever.
 *
 * Reads production content through the same lazy loader the learner app uses —
 * the admin surfaces never get their own copy of the bank.
 */
export interface ContentCatalogState {
  catalog: NormalizedContentCatalog | null;
  error: string | null;
  loading: boolean;
}

export function useContentCatalog(subjects: readonly Subject[]): ContentCatalogState {
  const key = [...subjects].sort().join('|');
  const [state, setState] = useState<ContentCatalogState>({ catalog: null, error: null, loading: true });

  useEffect(() => {
    let active = true;
    setState({ catalog: null, error: null, loading: true });
    const requested = key.split('|').filter(Boolean) as Subject[];
    loadContentCatalog(requested)
      .then((catalog) => {
        if (active) setState({ catalog, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            catalog: null,
            error: error instanceof Error ? error.message : 'Could not load question content.',
            loading: false,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [key]);

  return state;
}
