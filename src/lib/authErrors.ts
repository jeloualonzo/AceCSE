/**
 * Firebase Auth error codes turned into plain sentences.
 *
 * Extracted from `AuthPage` so the learner sign-in and the admin sign-in report
 * the same failure the same way. `null` means "say nothing" — the user cancelled,
 * which is not an error.
 *
 * The credential cases deliberately collapse `user-not-found`, `wrong-password`,
 * and `invalid-credential` into one message: distinguishing them would tell an
 * attacker which emails have accounts.
 */
export function authErrorMessage(error: unknown): string | null {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null; // user changed their mind — not an error worth showing
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled for this project yet.';
    case 'auth/invalid-email':
      return 'That email address does not look valid.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment, then try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in with the method you originally used — if that was Google, you can add a password afterward from Settings.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Sign in with your original method first; you can link the other one from Settings.';
    case 'auth/weak-password':
      return 'Password is too weak — use at least 6 characters.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
