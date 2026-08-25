# Admin Access

AceCSE is two applications behind one sign-in. `/app/*` is the learner app;
`/admin/*` is the admin app — Content Bank and the refinement workspaces. This
document is the whole story of how the boundary between them is enforced and how
you get an admin account.

## The short version

```bash
# Create the dedicated admin account and grant it the claim in one run.
# Prompts for the password with echo off — there is no --password flag.
GOOGLE_APPLICATION_CREDENTIALS=/path/outside/repo/acecse-key.json \
  npm run admin:create -- --email you@example.com

# Then sign in at /admin/login with that email and password.
```

If the account already exists (someone signed in with Google, say), promote it
instead:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/outside/repo/acecse-key.json \
  npm run admin:grant -- --email you@example.com
# then press "Check again" on the admin screen, or sign out and back in
```

## There is no admin password in this repository

There is no `admin` / `admin123` account, no `VITE_ADMIN_*` variable, and no
client-side flag anywhere in this repository. Searching for one will turn up
nothing, by design. `admin:create` sets a password you choose at the terminal;
that password exists as one string in memory, is sent once over TLS, and is never
printed, logged, or written to a file.

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
| `src/components/auth/RequireAdmin.tsx` | Route guard on `/admin` (the whole tree) |
| `firestore.rules` → `isAdmin()` | The actual security boundary |

`isAdminClaim` is deliberately stricter than truthiness: the string `'true'`, the
number `1`, and `{}` are all truthy in JavaScript but none of them equal `true` in
the Firestore rule. Accepting them would show admin screens whose writes the
backend then refuses. Covered by `src/lib/adminClaim.test.ts`.

## How the two apps are separated

| Route | Guard | Who gets there |
| --- | --- | --- |
| `/`, `/auth` | `RedirectWhenAuthed` | Guests. Signed-in users are sent to their own app. |
| `/admin/login` | `RedirectWhenAuthed fallback={/admin}` | Guests. Email/password only; no Google, no sign-up. |
| `/app/*` | `RequireAuth` | Any signed-in account, admin or not. |
| `/admin/*` | `RequireAdmin signInPath={/admin/login}` | Only a token carrying `admin: true`. |

Post-login routing is role-aware: an admin lands on `/admin`, a learner on
`/app/dashboard`. Both guards **wait** on `adminResolved` rather than reading "not
yet known" as "not an admin" — the claim is read asynchronously off the ID token,
so redirecting early would send every admin to the learner dashboard on a cold
load, which is indistinguishable from having lost access. Covered by
`RedirectWhenAuthed.test.tsx` and `RequireAdmin.test.tsx`.

Admins can still use the real learner app through **View Learner App** in the
admin header — the same engine learners use, not a copy. A session started there
is a real learner session and is recorded like any other.

### The one run that is not recorded

A Batch Workspace's **Practice these N questions** launches the real Practice
engine on the batch's exact ids with `internalReview: true` on the session. That
flag is the only thing in the app that suppresses the attempt write
(`ExamPage`), so an admin checking a batch cannot land in a learner's History or
in any average derived from it. The screen says so. Nothing else sets it: normal
learner Practice and Simulation record attempts exactly as before.

## Development: the Auth emulator (no credentials, nothing real)

The fastest safe path. No service account key, no production data, nothing that
outlives the emulator.

```bash
# Terminal 1 — start the Auth emulator
firebase emulators:start --only auth
```

To make the app talk to the emulator, add to `.env.local`:

```
VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

Create a throwaway admin against it — the emulator accepts the literal `owner`
token, so no key is involved:

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
GOOGLE_CLOUD_PROJECT=demo-acecse \
  npm run admin:create -- --email dev-admin@example.com
```

Pick any throwaway password you like for the emulator account. Do not reuse a
real one, and do not carry that account or its password into production.

## Production: creating the dedicated admin account

1. **Get a service account key.** Firebase Console → Project settings → Service
   accounts → *Generate new private key*. This file can do anything to your
   project.

2. **Store it outside this repository.** Somewhere like
   `~/.config/acecse/admin-key.json`. The script calls `git check-ignore` and
   **refuses to read a key that sits inside the repo unless git already ignores
   it**, because a key committed by accident is a project-wide compromise. The
   `.gitignore` patterns (`*serviceAccount*.json`, `*-adminsdk-*.json`, …) are a
   backstop, not the plan.

3. **Create the account:**

   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=~/.config/acecse/admin-key.json \
     npm run admin:create -- --email admin@yourdomain.com --name "AceCSE Admin"
   ```

   It prints the target, then prompts twice:

   ```
     New admin account: admin@yourdomain.com
     Target:            Firebase project acecse-ee960

     New admin password (min 12 chars, not shown):
     Confirm password:
   ```

   Nothing is created until the password passes, so a rejected password leaves no
   half-made account behind. `--name` is optional and only applies to `--create`.

4. **Store the password in a password manager immediately.** It is not printed,
   not logged, and not recoverable from anywhere — if you lose it, use *Forgot the
   admin password?* on `/admin/login`.

5. **Sign in at `/admin/login`.** The claim is already on the account, so the
   first token issued at sign-in carries it. No refresh step is needed for a
   freshly created account.

### Why the password rules are stricter than Firebase's

Firebase accepts six characters. This script requires **twelve**, rejects
leading/trailing whitespace (almost always a paste accident), and rejects
passwords containing strings from the standard published lists (`admin123`,
`password`, `qwerty`, …). The account can rewrite every question in the bank, and
the password is typed once and then stored in a password manager, so length costs
the operator nothing. Rejection messages never echo any part of the password —
a fragment is still reusable material, and it would sit in terminal scrollback.

### Why there is no `--password` flag

Command-line arguments are visible to every other process on the machine and are
saved in shell history. Passing `--password` is a hard error with that
explanation, not a silently accepted convenience. For non-interactive use (CI),
set `ADMIN_BOOTSTRAP_PASSWORD` in the environment — it goes through the same
validation, and the script says out loud that it used it.

The prompt requires a real terminal. With no TTY attached and no
`ADMIN_BOOTSTRAP_PASSWORD` set, the script refuses rather than reading a password
from a pipe.

### Promoting an account that already exists

`admin:create` refuses to touch an existing account — silently resetting
someone's password because a command ran twice would be a surprise. Use
`admin:grant` instead:

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.config/acecse/admin-key.json \
  npm run admin:grant -- --email you@example.com
```

Or by uid: `npm run admin:grant -- --uid <firebase-uid>`.

The claim is baked into the ID token at issue time, so a session that was already
signed in does not see it until the token refreshes. Press **Check again** on the
admin screen, or sign out and back in. (Firebase also refreshes on its own roughly
hourly.)

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
  `accounts:lookup`, `accounts` (create), and `accounts:update`. Nothing from this
  file ships to the browser.
- **Preserves other claims.** Only the `admin` key is added or removed.
- **Reads the account back after writing** and fails loudly if the claim did not
  take, rather than reporting a success it did not verify. `--create` also reads
  the new account back before writing the claim, so the claim always targets an
  account that provably exists.
- **Never prints key contents, and never prints a password or any part of one.**
  Errors name the path and the reason only.
- **Leaves `emailVerified` at its default (`false`)** on `--create`, matching what
  the Console's *Add user* does. Nothing in AceCSE gates on it, and asserting a
  verification that never happened would be a lie in the auth record.
- Refuses `--email` and `--uid` together, refuses `--create` with `--uid` or
  `--revoke`, and refuses an unignored in-repo key.

It does not touch Firestore, and it does not delete accounts.

## Deploying the rules

The claim is only half of it — the rules that check it have to be live:

```bash
firebase deploy --only firestore:rules
```

Until that runs, `refinementBatches` writes are refused by the previous
default-deny ruleset and the Content Bank falls back to browser-local storage,
which it labels honestly in the UI.
