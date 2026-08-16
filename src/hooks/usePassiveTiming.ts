import { useCallback, useEffect, useRef, useState } from 'react';

export interface PassiveTimingSnapshot {
  /** Total active session time, excluding hidden-tab segments, in milliseconds. */
  sessionElapsedMs: number;
  /** Cumulative primary-view time keyed by encountered question id. */
  questionTimeSpentMs: Record<string, number>;
}

export interface PassiveTimingOptions {
  sessionElapsedMs?: number;
  questionTimeSpentMs?: Readonly<Record<string, number>>;
  activeQuestionId?: string | null;
  visible?: boolean;
  now?: number;
}

function clockNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function positive(value: number | undefined): number {
  return Number.isFinite(value) && value && value > 0 ? value : 0;
}

function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

/**
 * Timestamp accumulator for one active session. It intentionally has no
 * interval of its own: callers flush on transitions and may sample the
 * session stopwatch with one shared display interval.
 */
export class PassiveTimingController {
  private sessionElapsedMs: number;
  private questionTimeSpentMs: Record<string, number>;
  private activeQuestionId: string | null;
  private sessionStartedAt: number | null;
  private activeQuestionStartedAt: number | null;
  private visible: boolean;
  private stopped = false;

  constructor(options: PassiveTimingOptions = {}) {
    const now = options.now ?? clockNow();
    this.sessionElapsedMs = positive(options.sessionElapsedMs);
    this.questionTimeSpentMs = Object.fromEntries(
      Object.entries(options.questionTimeSpentMs ?? {}).map(([id, value]) => [id, positive(value)])
    );
    this.activeQuestionId = options.activeQuestionId ?? null;
    this.visible = options.visible ?? true;
    this.sessionStartedAt = this.visible ? now : null;
    this.activeQuestionStartedAt = this.visible && this.activeQuestionId ? now : null;
  }

  private flushSegment(now: number): void {
    if (!this.visible) return;
    if (this.sessionStartedAt !== null) {
      this.sessionElapsedMs += Math.max(0, now - this.sessionStartedAt);
      this.sessionStartedAt = now;
    }
    if (this.activeQuestionId && this.activeQuestionStartedAt !== null) {
      const elapsed = Math.max(0, now - this.activeQuestionStartedAt);
      this.questionTimeSpentMs[this.activeQuestionId] =
        (this.questionTimeSpentMs[this.activeQuestionId] ?? 0) + elapsed;
      this.activeQuestionStartedAt = now;
    }
  }

  private snapshotAt(now: number): PassiveTimingSnapshot {
    const questionTimeSpentMs = { ...this.questionTimeSpentMs };
    let sessionElapsedMs = this.sessionElapsedMs;
    if (!this.stopped && this.visible && this.sessionStartedAt !== null) {
      sessionElapsedMs += Math.max(0, now - this.sessionStartedAt);
    }
    if (!this.stopped && this.visible && this.activeQuestionId && this.activeQuestionStartedAt !== null) {
      questionTimeSpentMs[this.activeQuestionId] =
        (questionTimeSpentMs[this.activeQuestionId] ?? 0) + Math.max(0, now - this.activeQuestionStartedAt);
    }
    return { sessionElapsedMs, questionTimeSpentMs };
  }

  /** Restart an active segment after an effect cleanup or session resume. */
  resume(now: number = clockNow()): PassiveTimingSnapshot {
    if (this.stopped) return this.snapshotAt(now);
    if (this.visible) {
      if (this.sessionStartedAt === null) this.sessionStartedAt = now;
      if (this.activeQuestionId && this.activeQuestionStartedAt === null) {
        this.activeQuestionStartedAt = now;
      }
    }
    return this.snapshotAt(now);
  }

  /** Move the one primary-question segment without resetting its total. */
  setActiveQuestion(questionId: string | null, now: number = clockNow()): PassiveTimingSnapshot {
    if (this.stopped) return this.snapshotAt(now);
    if (questionId === this.activeQuestionId) {
      if (this.visible && questionId && this.activeQuestionStartedAt === null) {
        this.activeQuestionStartedAt = now;
      }
      return this.snapshotAt(now);
    }
    this.flushSegment(now);
    this.activeQuestionId = questionId;
    this.activeQuestionStartedAt = this.visible && questionId ? now : null;
    return this.snapshotAt(now);
  }

  /** Pause or resume both session and active-question accumulation. */
  setVisibility(visible: boolean, now: number = clockNow()): PassiveTimingSnapshot {
    if (this.stopped) return this.snapshotAt(now);
    if (visible === this.visible) return this.snapshotAt(now);
    if (!visible) {
      this.flushSegment(now);
      this.visible = false;
      this.sessionStartedAt = null;
      this.activeQuestionStartedAt = null;
    } else {
      this.visible = true;
      this.sessionStartedAt = now;
      this.activeQuestionStartedAt = this.activeQuestionId ? now : null;
    }
    return this.snapshotAt(now);
  }

  /** Flush the current segment at a meaningful persistence boundary. */
  flush(now: number = clockNow()): PassiveTimingSnapshot {
    this.flushSegment(now);
    return this.snapshotAt(now);
  }

  stop(now: number = clockNow()): PassiveTimingSnapshot {
    if (!this.stopped) {
      this.flushSegment(now);
      this.stopped = true;
      this.sessionStartedAt = null;
      this.activeQuestionStartedAt = null;
    }
    return this.snapshotAt(now);
  }

  snapshot(now: number = clockNow()): PassiveTimingSnapshot {
    return this.snapshotAt(now);
  }
}

export interface UsePassiveTimingOptions extends PassiveTimingOptions {
  sessionKey: string;
  enabled?: boolean;
  /** Only Practice needs a once-per-second React display update. */
  showStopwatch?: boolean;
  onPersist?: (snapshot: PassiveTimingSnapshot) => void;
}

export interface UsePassiveTimingResult {
  elapsedMs: number;
  flush: () => PassiveTimingSnapshot;
  stop: () => PassiveTimingSnapshot;
}

/**
 * React lifecycle wrapper around PassiveTimingController. There is one
 * optional display interval for the Practice stopwatch, never one interval per
 * question and never a per-second localStorage write.
 */
export function usePassiveTiming({
  sessionKey,
  sessionElapsedMs = 0,
  questionTimeSpentMs = {},
  activeQuestionId = null,
  visible = isDocumentVisible(),
  enabled = true,
  showStopwatch = false,
  onPersist,
}: UsePassiveTimingOptions): UsePassiveTimingResult {
  const controllerRef = useRef<{ key: string; controller: PassiveTimingController } | null>(null);
  if (!controllerRef.current || controllerRef.current.key !== sessionKey) {
    controllerRef.current = {
      key: sessionKey,
      controller: new PassiveTimingController({
        sessionElapsedMs,
        questionTimeSpentMs,
        activeQuestionId,
        visible,
      }),
    };
  }
  const controller = controllerRef.current.controller;
  const persistRef = useRef(onPersist);
  persistRef.current = onPersist;
  const [elapsedMs, setElapsedMs] = useState(() => controller.snapshot().sessionElapsedMs);

  const report = useCallback(
    (snapshot: PassiveTimingSnapshot) => {
      if (showStopwatch) setElapsedMs(snapshot.sessionElapsedMs);
      persistRef.current?.(snapshot);
    },
    [showStopwatch]
  );

  useEffect(() => {
    if (!enabled) return;
    report(controller.setActiveQuestion(activeQuestionId));
  }, [activeQuestionId, controller, enabled, report]);

  useEffect(() => {
    if (!enabled) return;
    controller.resume();
    const onVisibilityChange = () => {
      report(controller.setVisibility(isDocumentVisible()));
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      report(controller.stop());
    };
  }, [controller, enabled, report]);

  useEffect(() => {
    if (!enabled || !showStopwatch) return;
    const tick = () => setElapsedMs(controller.snapshot().sessionElapsedMs);
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [controller, enabled, showStopwatch]);

  const flush = useCallback(() => {
    const snapshot = controller.flush();
    report(snapshot);
    return snapshot;
  }, [controller, report]);

  const stop = useCallback(() => {
    const snapshot = controller.stop();
    report(snapshot);
    return snapshot;
  }, [controller, report]);

  return { elapsedMs, flush, stop };
}
