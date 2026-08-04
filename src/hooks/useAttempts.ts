import { useEffect, useState } from 'react';
import type { Attempt } from '@/types';
import { subscribeToAttempts } from '@/services/attempts';
import { useAuth } from '@/context/AuthContext';

interface AttemptsState {
  attempts: Attempt[];
  loading: boolean;
  error: string | null;
}

/** Live view of the signed-in user's real attempt history. */
export function useAttempts(): AttemptsState {
  const { user } = useAuth();
  const [state, setState] = useState<AttemptsState>({ attempts: [], loading: true, error: null });

  useEffect(() => {
    if (!user) {
      setState({ attempts: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    return subscribeToAttempts(
      user.uid,
      (attempts) => setState({ attempts, loading: false, error: null }),
      () => setState({ attempts: [], loading: false, error: 'Could not load attempt history.' })
    );
  }, [user]);

  return state;
}
