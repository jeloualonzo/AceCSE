import { useEffect, useRef, useState } from 'react';

/**
 * Deadline-based countdown. Remaining time is always computed from the
 * wall-clock deadline, so interval drift and background-tab throttling can
 * never desynchronize the timer — after any pause it snaps back to truth.
 *
 * @param deadlineAt epoch ms deadline, or null for untimed sessions
 * @param onExpire   called exactly once when the deadline passes
 */
export function useCountdown(deadlineAt: number | null, onExpire: () => void): number | null {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(() =>
    deadlineAt === null ? null : Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000))
  );
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (deadlineAt === null) {
      setSecondsRemaining(null);
      return;
    }
    expiredRef.current = false;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    // Recompute immediately when a backgrounded tab becomes visible again.
    const onVisibility = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [deadlineAt]);

  return secondsRemaining;
}
