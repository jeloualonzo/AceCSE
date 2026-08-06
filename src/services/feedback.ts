/**
 * Feedback facade. The Firestore SDK is loaded on first use via dynamic
 * import (see `feedbackImpl.ts`), keeping it off the critical path.
 */

export type FeedbackCategory = 'bug' | 'feature' | 'general';

export const FEEDBACK_CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: 'bug', label: 'Bug Report' },
  { id: 'feature', label: 'Feature Request' },
  { id: 'general', label: 'General Feedback' },
];

export const FEEDBACK_MESSAGE_MAX = 4000;

export async function submitFeedback(input: {
  uid: string;
  email: string | null;
  category: FeedbackCategory;
  message: string;
}): Promise<void> {
  await (await import('./feedbackImpl')).submitFeedback(input);
}
