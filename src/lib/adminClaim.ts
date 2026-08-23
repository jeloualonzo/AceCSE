/**
 * The one definition of "this user is an AceCSE admin".
 *
 * Admin authority lives in a Firebase Auth **custom claim**, minted server-side
 * by `scripts/set-admin-claim.mjs` and carried inside the signed ID token. The
 * client can read it but cannot write it, which is the whole point: there is no
 * localStorage flag, no `?admin=1`, no environment variable, and no email
 * allow-list anywhere in this codebase. A tampered-with client sees the admin
 * screens and still gets every Firestore write rejected, because
 * `firestore.rules` checks the same claim on the same token.
 *
 * Keep this predicate in exact lockstep with the rules helper:
 *
 * ```
 * function isAdmin() { return isSignedIn() && request.auth.token.admin == true; }
 * ```
 */

/** The claim key. Also the key the bootstrap script writes. */
export const ADMIN_CLAIM_KEY = 'admin';

/**
 * True only for a literal boolean `true` held directly on the claim set.
 *
 * Deliberately not truthiness: `'false'`, `'0'`, `1`, and `{}` are all truthy in
 * JavaScript but none of them equal `true` in the Firestore rule, so accepting
 * them here would let the UI promise access the backend then denies. A claim
 * that arrives in any other shape is a misconfigured claim, and the honest
 * response is to treat it as absent. The own-property check keeps an inherited
 * `admin` off the prototype chain from counting as a claim on this token.
 */
export function isAdminClaim(claims: unknown): boolean {
  if (typeof claims !== 'object' || claims === null) return false;
  if (!Object.prototype.hasOwnProperty.call(claims, ADMIN_CLAIM_KEY)) return false;
  return (claims as Record<string, unknown>)[ADMIN_CLAIM_KEY] === true;
}
