import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveFocus } from '@/types';

export interface PassiveTimingSnapshot {
  /** Total active session time, excluding hidden-tab segments, in milliseconds. */
  sessionElapsedMs: number;
  /** Cumulative primary-view time keyed by encountered question id. */
  questionTimeSpentMs: Record<string, number>;
  /** Cumulative shared-task/directions time keyed by stable task id. */
  taskTimeSpentMs?: Record<string, number>;
}

export interface PassiveTimingOptions {
  sessionElapsedMs?: number;
  questionTimeSpentMs?: Readonly<Record<string, number>>;
  taskTimeSpentMs?: Readonly<Record<string, number>>;
  /** New exclusive focus source of truth. */
  activeFocus?: ActiveFocus;
  /** Legacy question-only input retained for old callers. */
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

function sameFocus(left: ActiveFocus, right: ActiveFocus): boolean {
  if (left === right) return true;
  if (!left || !right || left.type !== right.type) return false;
  if (left.type === 'task' && right.type === 'task') return left.taskId === right.taskId;
  if (left.type === 'question' && right.type === 'question') return left.questionId === right.questionId;
  return false;
}

function legacyFocus(activeQuestionId: string | null | undefined): ActiveFocus {
  return activeQuestionId ? { type: 'question', questionId: activeQuestionId } : null;
}

/**
 * Timestamp accumulator for one active session. It intentionally has no
 * interval of its own: callers flush on transitions and may sample the
 * session stopwatch with one shared display interval.
 *
 * The task/question focus is exclusive. A task block and a question can never
 * accumulate from the same segment because both use this one controller and
 * one `activeFocusStartedAt` timestamp.
 */
export class PassiveTimingController {
  private sessionElapsedMs: number;
  private questionTimeSpentMs: Record<string, number>;
  private taskTimeSpentMs: Record<string, number>;
  private activeFocus: ActiveFocus;
  private sessionStartedAt: number | null;
  private activeFocusStartedAt: number | null;
  private visible: boolean;
  private stopped = false;

  constructor(options: PassiveTimingOptions = {}) {
    const now = options.now ?? clockNow();
    this.sessionElapsedMs = positive(options.sessionElapsedMs);
    this.questionTimeSpentMs = Object.fromEntries(
      Object.entries(options.questionTimeSpentMs ?? {}).map(([id, value]) => [id, positive(value)])
    );
    this.taskTimeSpentMs = Object.fromEntries(
      Object.entries(options.taskTimeSpentMs ?? {}).map(([id, value]) => [id, positive(value)])
    );
    this.activeFocus = options.activeFocus !== undefined
      ? options.activeFocus
      : legacyFocus(options.activeQuestionId);
    this.visible = options.visible ?? true;
    this.sessionStartedAt = this.visible ? now : null;
    this.activeFocusStartedAt = this.visible && this.activeFocus ? now : null;
  }

  private flushSegment(now: number): void {
    if (!this.visible) return;
    if (this.sessionStartedAt !== null) {
      this.sessionElapsedMs += Math.max(0, now - this.sessionStartedAt);
      this.sessionStartedAt = now;
    }
    if (this.activeFocus && this.activeFocusStartedAt !== null) {
      const elapsed = Math.max(0, now - this.activeFocusStartedAt);
      if (this.activeFocus.type === 'task') {
        this.taskTimeSpentMs[this.activeFocus.taskId] =
          (this.taskTimeSpentMs[this.activeFocus.taskId] ?? 0) + elapsed;
      } else {
        this.questionTimeSpentMs[this.activeFocus.questionId] =
          (this.questionTimeSpentMs[this.activeFocus.questionId] ?? 0) + elapsed;
      }
      this.activeFocusStartedAt = now;
    }
  }

  private snapshotAt(now: number): PassiveTimingSnapshot {
    const questionTimeSpentMs = { ...this.questionTimeSpentMs };
    const taskTimeSpentMs = { ...this.taskTimeSpentMs };
    let sessionElapsedMs = this.sessionElapsedMs;
    if (!this.stopped && this.visible && this.sessionStartedAt !== null) {
      sessionElapsedMs += Math.max(0, now - this.sessionStartedAt);
    }
    if (!this.stopped && this.visible && this.activeFocus && this.activeFocusStartedAt !== null) {
      const elapsed = Math.max(0, now - this.activeFocusStartedAt);
      if (this.activeFocus.type === 'task') {
        taskTimeSpentMs[this.activeFocus.taskId] =
          (taskTimeSpentMs[this.activeFocus.taskId] ?? 0) + elapsed;
      } else {
        questionTimeSpentMs[this.activeFocus.questionId] =
          (questionTimeSpentMs[this.activeFocus.questionId] ?? 0) + elapsed;
      }
    }
    const snapshot: PassiveTimingSnapshot = { sessionElapsedMs, questionTimeSpentMs };
    if (Object.keys(taskTimeSpentMs).length > 0) snapshot.taskTimeSpentMs = taskTimeSpentMs;
    return snapshot;
  }

  /** Restart an active segment after an effect cleanup or session resume. */
  resume(now: number = clockNow()): PassiveTimingSnapshot {
    if (this.stopped) return this.snapshotAt(now);
    if (this.visible) {
      if (this.sessionStartedAt === null) this.sessionStartedAt = now;
      if (this.activeFocus && this.activeFocusStartedAt === null) {
        this.activeFocusStartedAt = now;
      }
    }
    return this.snapshotAt(now);
  }

  /** Move the one exclusive task/question segment without resetting totals. */
  setActiveFocus(focus: ActiveFocus, now: number = clockNow()): PassiveTimingSnapshot {
    if (this.stopped) return this.snapshotAt(now);
    if (sameFocus(focus, this.activeFocus)) {
      if (this.visible && focus && this.activeFocusStartedAt === null) {
        this.activeFocusStartedAt = now;
      }
      return this.snapshotAt(now);
    }
    this.flushSegment(now);
    this.activeFocus = focus;
    this.activeFocusStartedAt = this.visible && focus ? now : null;
    return this.snapshotAt(now);
  }

  /** Legacy question-only entry point retained for existing callers/tests. */
  setActiveQuestion(questionId: string | null, now: number = clockNow()): PassiveTimingSnapshot {
    return this.setActiveFocus(legacyFocus(questionId), now);
  }

  /** Pause or resume both session and the one active task/question target. */
  setVisibility(visible: boolean, now: number = clockNow()): PassiveTimingSnapshot {
    if (this.stopped) return this.snapshotAt(now);
    if (visible === this.visible) return this.snapshotAt(now);
    if (!visible) {
      this.flushSegment(now);
      this.visible = false;
      this.sessionStartedAt = null;
      this.activeFocusStartedAt = null;
    } else {
      this.visible = true;
      this.sessionStartedAt = now;
      this.activeFocusStartedAt = this.activeFocus ? now : null;
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
      this.activeFocusStartedAt = null;
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
 * task/question and never a per-second localStorage write.
 */
export function usePassiveTiming({
  sessionKey,
  sessionElapsedMs = 0,
  questionTimeSpentMs = {},
  taskTimeSpentMs = {},
  activeFocus,
  activeQuestionId,
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
        taskTimeSpentMs,
        activeFocus: activeFocus !== undefined ? activeFocus : legacyFocus(activeQuestionId),
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
    const focus = activeFocus !== undefined ? activeFocus : legacyFocus(activeQuestionId);
    report(controller.setActiveFocus(focus));
  }, [activeFocus, activeQuestionId, controller, enabled, report]);

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
