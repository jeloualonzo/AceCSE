# Admin Access

The Content Bank is admin-only. This document is the whole story of how that is
enforced and how you get an admin account.

## The short version

```bash
# 1. Sign in to AceCSE once with the account you want to be admin (Google or
#    email/password). This creates the Firebase Auth user.

# 2. Grant the claim (needs a service account key, see below):
GOOGLE_APPLICATION_CREDENTIALS=/path/outside/repo/acecse-key.json \
  npm run admin:grant -- --email you@example.com

# 3. In the app, press "Check again" on the admin screen, or sign out and back in.
```

## There is no admin password

There is no `admin` / `admin123` account, no admin password, no `VITE_ADMIN_*`
variable, and no client-side flag anywhere in this repository. Searching for one
will turn up nothing, by design.

Admin authority is a **Firebase Auth custom claim** — the single key `admin: true`
inside the account's signed ID token. Two consequences follow, and they are the
entire reason for this design:

- **The browser cannot forge it.** Only a privileged server-side caller can mint
  a custom claim. Editing localStorage, setting a query parameter, or patching
  the bundle changes nothing about the token.
- **The UI is not the boundary.** `firestore.rules` checks the same claim on the
  same token (`request.auth.token.admin == true`). A tampered-with client can
  render the admin screens and still have every read and write rejected by the
  server. Faking your way in gets you empty pages, not data.

Three places read the claim, and they must stay in lockstep:

| Where | What it does |
| --- | --- |
| `src/lib/adminClaim.ts` | `isAdminClaim()` — requires a literal boolean `true` |
| `src/components/auth/RequireAdmin.tsx` | Route guard for `/app/content-bank/**` |
| `firestore.rules` → `isAdmin()` | The actual security boundary |

`isAdminClaim` is deliberately stricter than truthiness: the string `'true'`, the
number `1`, and `{}` are all truthy in JavaScript but none of them equal `true` in
the Firestore rule. Accepting them would show admin screens whose writes the
backend then refuses. Covered by `src/lib/adminClaim.test.ts`.

## Development: the Auth emulator (no credentials, nothing real)

The fastest safe path. No service account key, no production data, nothing that
outlives the emulator.

```bash
# Terminal 1 — start the Auth emulator
firebase emulators:start --only auth

# Terminal 2 — point the app at it, then sign up in the UI with any
# email/password (e.g. dev-admin@example.com / a throwaway password)
```

To make the app talk to the emulator, add to `.env.local`:

```
VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

Then grant the claim — the emulator accepts the literal `owner` token, so no key
is involved:

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
GOOGLE_CLOUD_PROJECT=demo-acecse \
  npm run admin:grant -- --email dev-admin@example.com
```

Pick any throwaway password you like for the emulator account. Do not reuse a
real one, and do not carry that account or its password into production.

## Production: grant the claim with a service account key

1. **Create the account first.** Sign in to the deployed app once with the
   account that should be admin. The script refuses to invent accounts — it only
   promotes ones that already exist.

2. **Get a service account key.** Firebase Console → Project settings → Service
   accounts → *Generate new private key*. This file can do anything to your
   project.

3. **Store it outside this repository.** Somewhere like
   `~/.config/acecse/admin-key.json`. The script calls `git check-ignore` and
   **refuses to read a key that sits inside the repo unless git already ignores
   it**, because a key committed by accident is a project-wide compromise. The
   `.gitignore` patterns (`*serviceAccount*.json`, `*-adminsdk-*.json`, …) are a
   backstop, not the plan.

4. **Grant:**

   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=~/.config/acecse/admin-key.json \
     npm run admin:grant -- --email you@example.com
   ```

   Or by uid: `npm run admin:grant -- --uid <firebase-uid>`.

5. **Refresh the token.** The claim is baked into the ID token at issue time, so
   a session that was already signed in does not see it until the token
   refreshes. Press **Check again** on the admin screen, or sign out and back in.
   (Firebase also refreshes on its own roughly hourly.)

### Revoking

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.config/acecse/admin-key.json \
  npm run admin:revoke -- --email former-admin@example.com
```

Revocation takes effect for that user on their next token refresh — up to about
an hour for an open session. To cut access immediately, revoke the claim and then
disable or sign out the account from the Firebase Console.

## What the script does and does not do

`scripts/set-admin-claim.mjs`, zero dependencies:

- Signs an RS256 JWT assertion with `node:crypto`, exchanges it at
  `oauth2.googleapis.com/token` for an access token, then calls Identity Toolkit
  `accounts:lookup` and `accounts:update`. Nothing from this file ships to the
  browser.
- **Preserves other claims.** Only the `admin` key is added or removed.
- **Reads the account back after writing** and fails loudly if the claim did not
  take, rather than reporting a success it did not verify.
- **Never prints key contents.** Errors name the path and the reason only.
- Refuses `--email` and `--uid` together, and refuses an unignored in-repo key.

It does not create accounts, does not set passwords, and does not touch
Firestore.

## Deploying the rules

The claim is only half of it — the rules that check it have to be live:

```bash
firebase deploy --only firestore:rules
```

Until that runs, `refinementBatches` writes are refused by the previous
default-deny ruleset and the Content Bank falls back to browser-local storage,
which it labels honestly in the UI.
