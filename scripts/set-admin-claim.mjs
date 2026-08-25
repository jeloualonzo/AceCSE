#!/usr/bin/env node
/**
 * Creates an AceCSE admin account, and grants or revokes the `admin` custom
 * claim on a Firebase Auth account.
 *
 * WHY A SCRIPT: admin authority must be unforgeable from the browser, so it
 * lives in a custom claim inside the signed ID token. Only a privileged
 * server-side caller can set one. This script is that caller. There is no admin
 * password anywhere in this repository, no `admin`/`admin123` account, and no
 * client-side flag that grants access — see docs/admin/ADMIN_ACCESS.md.
 *
 * USAGE
 *   node scripts/set-admin-claim.mjs --create --email you@example.com
 *   node scripts/set-admin-claim.mjs --email you@example.com
 *   node scripts/set-admin-claim.mjs --email you@example.com --revoke
 *   node scripts/set-admin-claim.mjs --uid <firebase-uid>
 *
 * `--create` makes the account and grants the claim in one run. It prompts for
 * the password on the terminal with echo off; the password is never passed as an
 * argument (argv is visible to every process on the machine), never printed,
 * never written to a file, and never stored in this repository. For CI, set
 * ADMIN_BOOTSTRAP_PASSWORD instead of prompting.
 *
 * AGAINST THE AUTH EMULATOR (no credentials needed, nothing real is touched):
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   GOOGLE_CLOUD_PROJECT=demo-acecse \
 *   node scripts/set-admin-claim.mjs --create --email dev-admin@example.com
 *
 * AGAINST A REAL PROJECT: point GOOGLE_APPLICATION_CREDENTIALS at a service
 * account JSON key stored OUTSIDE this repository. The script refuses to read a
 * key that sits inside the repo unless git already ignores it, because a key
 * committed by accident is a project-wide compromise. Key contents are never
 * printed.
 *
 * Zero dependencies: the RS256 assertion is signed with node:crypto and
 * exchanged for an access token, then the Identity Toolkit REST API is called
 * directly. Nothing here ships to the browser.
 */

import { createSign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import process from 'node:process';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const IDENTITY_SCOPES = [
  'https://www.googleapis.com/auth/identitytoolkit',
  'https://www.googleapis.com/auth/cloud-platform',
].join(' ');

/** The claim the app and firestore.rules both read. Keep all three in sync. */
const ADMIN_CLAIM_KEY = 'admin';

/**
 * Stricter than Firebase's 6-character floor on purpose: this one account can
 * rewrite every question in the bank, and it is typed once and then stored in a
 * password manager, so length costs the operator nothing.
 */
const MIN_PASSWORD_LENGTH = 12;

/** Substrings that appear on every published password list. */
const GUESSABLE_PASSWORD_PARTS = [
  'admin123',
  'password',
  'acecse123',
  'letmein',
  'qwerty',
  '12345678',
];

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { email: null, uid: null, name: null, revoke: false, create: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--revoke') args.revoke = true;
    else if (token === '--create') args.create = true;
    else if (token === '--email') args.email = argv[index += 1] ?? null;
    else if (token === '--uid') args.uid = argv[index += 1] ?? null;
    else if (token === '--name') args.name = argv[index += 1] ?? null;
    else if (token.startsWith('--email=')) args.email = token.slice('--email='.length);
    else if (token.startsWith('--uid=')) args.uid = token.slice('--uid='.length);
    else if (token.startsWith('--name=')) args.name = token.slice('--name='.length);
    else if (token === '--help' || token === '-h') args.help = true;
    // Deliberately no --password flag: argv is readable by other processes and
    // lands in shell history. Use the prompt or ADMIN_BOOTSTRAP_PASSWORD.
    else if (token === '--password' || token.startsWith('--password=')) {
      fail(
        'There is no --password flag, on purpose: command-line arguments are visible\n' +
        '  to other processes and are saved in shell history. Run --create without it\n' +
        '  to be prompted, or set ADMIN_BOOTSTRAP_PASSWORD for non-interactive use.'
      );
    }
    else fail(`Unknown argument: ${token}`);
  }
  return args;
}

/**
 * Refuses a key path inside the repo that git is not already ignoring.
 *
 * `git check-ignore` is the authority rather than a hand-rolled .gitignore
 * parse, so the answer is exactly what git would do on `git add`.
 */
function assertKeyPathIsSafe(keyPath) {
  const absolute = isAbsolute(keyPath) ? keyPath : resolve(process.cwd(), keyPath);
  const inside = relative(REPO_ROOT, absolute);
  if (inside.startsWith('..') || isAbsolute(inside)) return absolute;

  try {
    execFileSync('git', ['check-ignore', '--quiet', '--', absolute], {
      cwd: REPO_ROOT,
      stdio: 'ignore',
    });
  } catch {
    fail(
      `The service account key is inside this repository and git is NOT ignoring it:\n` +
      `    ${inside}\n\n` +
      `  Move it outside the repo (recommended), or add it to .gitignore first.\n` +
      `  A committed key compromises the whole Firebase project.`
    );
  }
  return absolute;
}

function base64Url(input) {
  return Buffer.from(input).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/** Signs the OAuth2 JWT assertion for a service account (RS256). */
function signAssertion(credentials) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: IDENTITY_SCOPES,
    aud: credentials.token_uri ?? TOKEN_URI,
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(credentials.private_key).toString('base64')
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  return `${header}.${payload}.${signature}`;
}

async function readJsonResponse(response, what) {
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    fail(`${what} returned a non-JSON response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    // Google error bodies carry no secrets; the request body (which does) is
    // never echoed here.
    const detail = parsed?.error?.message ?? parsed?.error_description ?? `HTTP ${response.status}`;
    fail(`${what} failed: ${detail}`);
  }
  return parsed;
}

async function loadServiceAccount() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    fail(
      'Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON key path,\n' +
      '  or set FIREBASE_AUTH_EMULATOR_HOST to run against the Auth emulator.\n' +
      '  See docs/admin/ADMIN_ACCESS.md.'
    );
  }
  const safePath = assertKeyPathIsSafe(keyPath);
  let credentials;
  try {
    credentials = JSON.parse(await readFile(safePath, 'utf8'));
  } catch (error) {
    // Report the path and the reason, never the file contents.
    fail(`Could not read the service account key at ${safePath}: ${error.message}`);
  }
  for (const field of ['client_email', 'private_key', 'project_id']) {
    if (typeof credentials[field] !== 'string' || !credentials[field]) {
      fail(`The service account key at ${safePath} is missing "${field}".`);
    }
  }
  return credentials;
}

async function fetchAccessToken(credentials) {
  const response = await fetch(credentials.token_uri ?? TOKEN_URI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signAssertion(credentials),
    }),
  });
  const body = await readJsonResponse(response, 'Access token exchange');
  if (!body.access_token) fail('Access token exchange returned no access_token.');
  return body.access_token;
}

/**
 * Resolves how to reach Identity Toolkit: the emulator needs no credentials and
 * accepts the literal owner bearer token, a real project needs a signed one.
 */
async function resolveTarget() {
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (emulatorHost) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? 'demo-acecse';
    return {
      mode: `Auth emulator at ${emulatorHost}`,
      projectId,
      baseUrl: `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/projects/${projectId}`,
      authorization: 'Bearer owner',
    };
  }
  const credentials = await loadServiceAccount();
  const accessToken = await fetchAccessToken(credentials);
  return {
    mode: `Firebase project ${credentials.project_id}`,
    projectId: credentials.project_id,
    baseUrl: `https://identitytoolkit.googleapis.com/v1/projects/${credentials.project_id}`,
    authorization: `Bearer ${accessToken}`,
  };
}

async function identityToolkit(target, path, payload) {
  const response = await fetch(`${target.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: target.authorization },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(response, `Identity Toolkit ${path}`);
}

async function findAccount(target, { email, uid }) {
  const body = await identityToolkit(target, '/accounts:lookup', email ? { email: [email] } : { localId: [uid] });
  return body.users?.[0] ?? null;
}

async function lookupAccount(target, { email, uid }) {
  const account = await findAccount(target, { email, uid });
  if (!account) {
    fail(
      `No account found for ${email ?? uid} in ${target.mode}.\n` +
      `  Create it with:  npm run admin:create -- --email ${email ?? '<address>'}\n` +
      `  Or sign in to the app once with that account, then run this again.`
    );
  }
  return account;
}

/**
 * Why not print the offending part: any fragment of a rejected password is still
 * a fragment of a password the operator may reuse, and it would land in the
 * terminal's scrollback.
 */
function passwordProblem(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return 'No password was entered.';
  }
  if (password.trim() !== password) {
    return 'The password starts or ends with whitespace, which is almost always a paste accident.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return (
      `The admin password must be at least ${MIN_PASSWORD_LENGTH} characters. Firebase allows 6,\n` +
      `  but this account can rewrite every question in the bank.`
    );
  }
  const lowered = password.toLowerCase();
  if (GUESSABLE_PASSWORD_PARTS.some((part) => lowered.includes(part))) {
    return 'That password contains a string from the standard password lists. Choose another.';
  }
  return null;
}

/**
 * Reads a password from the terminal twice, with echo off.
 *
 * `_writeToOutput` is overridden to write nothing, so readline still handles
 * editing (backspace, ctrl-u) against its internal buffer while the characters
 * never reach the screen. The prompts are written directly instead.
 */
async function promptForPassword() {
  if (!process.stdin.isTTY) {
    fail(
      'No terminal is attached, so there is nowhere safe to type a password.\n' +
      '  For non-interactive use (CI), set ADMIN_BOOTSTRAP_PASSWORD in the environment.'
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = () => {};

  // ctrl-c and ctrl-d both end the prompt. Without the `close` listener,
  // `rl.question` simply never calls back on end-of-input and the process hangs
  // with the terminal still in raw mode.
  const ask = (label) =>
    new Promise((resolvePrompt, rejectPrompt) => {
      const cancel = () => {
        rl.off('SIGINT', cancel);
        rl.off('close', cancel);
        process.stdout.write('\n');
        rejectPrompt(new Error('Cancelled — no account was created.'));
      };
      rl.once('SIGINT', cancel);
      rl.once('close', cancel);
      process.stdout.write(label);
      rl.question('', (answer) => {
        rl.off('SIGINT', cancel);
        rl.off('close', cancel);
        process.stdout.write('\n');
        resolvePrompt(answer);
      });
    });

  try {
    const password = await ask(`  New admin password (min ${MIN_PASSWORD_LENGTH} chars, not shown): `);
    const confirmation = await ask('  Confirm password: ');
    return { password, confirmation };
  } finally {
    // Always close, so the terminal leaves raw mode even on ctrl-c. `fail()`
    // exits the process, so validation happens after this block, never inside.
    rl.close();
  }
}

/**
 * The password never becomes an argv entry, a log line, or a file. It exists as
 * one local string, is sent once over TLS to Identity Toolkit, and goes out of
 * scope.
 */
async function resolvePassword() {
  const fromEnv = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (fromEnv) {
    const problem = passwordProblem(fromEnv);
    if (problem) fail(`ADMIN_BOOTSTRAP_PASSWORD is not usable.\n  ${problem}`);
    console.log('  Using ADMIN_BOOTSTRAP_PASSWORD from the environment.');
    return fromEnv;
  }
  let entered;
  try {
    entered = await promptForPassword();
  } catch (error) {
    fail(error.message);
  }
  if (entered.password !== entered.confirmation) {
    fail('The two passwords did not match. No account was created.');
  }
  const problem = passwordProblem(entered.password);
  if (problem) fail(`${problem}\n  No account was created.`);
  return entered.password;
}

/**
 * Creates the account, then hands it back for the same claim write every other
 * path uses.
 *
 * Refuses to touch an account that already exists: silently resetting someone's
 * password because a command was run twice would be a surprise, and the fix
 * ("grant instead") is one line away.
 */
async function createAccount(target, { email, displayName }) {
  const existing = await findAccount(target, { email });
  if (existing) {
    fail(
      `An account already exists for ${email} in ${target.mode} (uid ${existing.localId}).\n` +
      `  This command will not change its password.\n` +
      `  To make that existing account an admin:  npm run admin:grant -- --email ${email}`
    );
  }

  // Stated before the prompt, not as "Creating…": nothing is created until the
  // password passes, and a failed run must not read as a partial one.
  console.log(`\n  New admin account: ${email}\n  Target:            ${target.mode}`);
  const password = await resolvePassword();

  // emailVerified is left at its default (false), matching what the Firebase
  // Console's "Add user" does. Nothing in AceCSE gates on it, and asserting a
  // verification that never happened would be a lie in the auth record.
  const created = await identityToolkit(target, '/accounts', {
    email,
    password,
    ...(displayName ? { displayName } : {}),
  });
  if (!created.localId) {
    fail('Identity Toolkit reported no uid for the new account, so nothing can be verified.');
  }
  // Read it back: the claim write below must target an account that provably
  // exists, not one the create response merely implied.
  return lookupAccount(target, { uid: created.localId });
}

function nextClaims(existingJson, revoke) {
  const claims = parseClaims(existingJson);
  // Other claims on the account are preserved; only `admin` is touched.
  if (revoke) delete claims[ADMIN_CLAIM_KEY];
  else claims[ADMIN_CLAIM_KEY] = true;
  return claims;
}

/** Tolerant parse: a corrupt claim blob is replaced rather than propagated. */
function parseClaims(existingJson) {
  if (!existingJson) return {};
  try {
    const parsed = JSON.parse(existingJson);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function hasAdminClaim(existingJson) {
  return parseClaims(existingJson)[ADMIN_CLAIM_KEY] === true;
}

function printHelp() {
  console.log(`
AceCSE admin account and claim

  node scripts/set-admin-claim.mjs --create --email <address> [--name "<display name>"]
                                                        create the account and grant admin
  node scripts/set-admin-claim.mjs --email <address>     grant admin to an existing account
  node scripts/set-admin-claim.mjs --email <address> --revoke
  node scripts/set-admin-claim.mjs --uid <firebase-uid>

Environment
  GOOGLE_APPLICATION_CREDENTIALS   service account JSON key, stored OUTSIDE this repo
  FIREBASE_AUTH_EMULATOR_HOST      e.g. 127.0.0.1:9099 — no credentials required
  GOOGLE_CLOUD_PROJECT             project id when using the emulator
  ADMIN_BOOTSTRAP_PASSWORD         --create only; skips the prompt for CI

--create prompts for the password with echo off. There is no --password flag:
argv is visible to other processes and is saved in shell history.

Full walkthrough: docs/admin/ADMIN_ACCESS.md
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.email && !args.uid) {
    printHelp();
    fail('Pass --email <address> or --uid <firebase-uid>.');
  }
  if (args.email && args.uid) fail('Pass either --email or --uid, not both.');
  if (args.create) {
    if (args.revoke) fail('--create and --revoke ask for opposite things.');
    if (!args.email) fail('--create needs --email <address>: the new account needs an address.');
    if (args.uid) fail('--create assigns its own uid. Drop --uid.');
  } else if (args.name) {
    fail('--name only applies to --create. An existing account keeps its display name.');
  }

  const target = await resolveTarget();
  const account = args.create
    ? await createAccount(target, { email: args.email, displayName: args.name })
    : await lookupAccount(target, args);
  const wasAdmin = hasAdminClaim(account.customAttributes);
  const claims = nextClaims(account.customAttributes, args.revoke);

  await identityToolkit(target, '/accounts:update', {
    localId: account.localId,
    customAttributes: JSON.stringify(claims),
  });

  // Read it back rather than trusting the write, so the report is a fact.
  const verified = await lookupAccount(target, { uid: account.localId });
  const isAdminNow = hasAdminClaim(verified.customAttributes);
  if (isAdminNow === Boolean(args.revoke)) {
    fail(`The claim did not take effect on ${account.email ?? account.localId}. Nothing changed for the client.`);
  }
  const noChange = !args.create && wasAdmin === isAdminNow;

  const headline = args.create
    ? `Created ${account.email} and granted admin`
    : `${args.revoke ? 'Revoked admin from' : 'Granted admin to'} ${account.email ?? account.localId}`;

  console.log(`
✓ ${headline}
  Target:  ${target.mode}
  UID:     ${account.localId}
  Claims:  ${JSON.stringify(claims)}${noChange ? '  (was already set — re-applied)' : ''}
${args.create
  ? `
  Sign in at /admin/login with that email and the password you just chose. The
  password was not printed, logged, or written anywhere — store it in a password
  manager now, or reset it from the sign-in page.
`
  : `
  The change lands in the browser on the next ID token refresh. Either sign out
  and back in, or press "Check again" on the admin screen.
`}`);
}

await main();
