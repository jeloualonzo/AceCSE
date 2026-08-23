#!/usr/bin/env node
/**
 * Grants or revokes the AceCSE `admin` custom claim on a Firebase Auth account.
 *
 * WHY A SCRIPT: admin authority must be unforgeable from the browser, so it
 * lives in a custom claim inside the signed ID token. Only a privileged
 * server-side caller can set one. This script is that caller. There is no admin
 * password anywhere in this repository, no `admin`/`admin123` account, and no
 * client-side flag that grants access — see docs/admin/ADMIN_ACCESS.md.
 *
 * USAGE
 *   node scripts/set-admin-claim.mjs --email you@example.com
 *   node scripts/set-admin-claim.mjs --email you@example.com --revoke
 *   node scripts/set-admin-claim.mjs --uid <firebase-uid>
 *
 * AGAINST THE AUTH EMULATOR (no credentials needed, nothing real is touched):
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   GOOGLE_CLOUD_PROJECT=demo-acecse \
 *   node scripts/set-admin-claim.mjs --email dev-admin@example.com
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
import process from 'node:process';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const IDENTITY_SCOPES = [
  'https://www.googleapis.com/auth/identitytoolkit',
  'https://www.googleapis.com/auth/cloud-platform',
].join(' ');

/** The claim the app and firestore.rules both read. Keep all three in sync. */
const ADMIN_CLAIM_KEY = 'admin';

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { email: null, uid: null, revoke: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--revoke') args.revoke = true;
    else if (token === '--email') args.email = argv[index += 1] ?? null;
    else if (token === '--uid') args.uid = argv[index += 1] ?? null;
    else if (token.startsWith('--email=')) args.email = token.slice('--email='.length);
    else if (token.startsWith('--uid=')) args.uid = token.slice('--uid='.length);
    else if (token === '--help' || token === '-h') args.help = true;
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

async function lookupAccount(target, { email, uid }) {
  const body = await identityToolkit(target, '/accounts:lookup', email ? { email: [email] } : { localId: [uid] });
  const account = body.users?.[0];
  if (!account) {
    fail(
      `No account found for ${email ?? uid} in ${target.mode}.\n` +
      `  Create it first by signing in to the app once (Google or email/password),\n` +
      `  then run this script again.`
    );
  }
  return account;
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
AceCSE admin claim

  node scripts/set-admin-claim.mjs --email <address>     grant admin
  node scripts/set-admin-claim.mjs --email <address> --revoke
  node scripts/set-admin-claim.mjs --uid <firebase-uid>

Environment
  GOOGLE_APPLICATION_CREDENTIALS   service account JSON key, stored OUTSIDE this repo
  FIREBASE_AUTH_EMULATOR_HOST      e.g. 127.0.0.1:9099 — no credentials required
  GOOGLE_CLOUD_PROJECT             project id when using the emulator

The account must already exist: sign in to AceCSE once, then run this.
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

  const target = await resolveTarget();
  const account = await lookupAccount(target, args);
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
  const noChange = wasAdmin === isAdminNow;

  console.log(`
✓ ${args.revoke ? 'Revoked admin from' : 'Granted admin to'} ${account.email ?? account.localId}
  Target:  ${target.mode}
  UID:     ${account.localId}
  Claims:  ${JSON.stringify(claims)}${noChange ? '  (was already set — re-applied)' : ''}

  The change lands in the browser on the next ID token refresh. Either sign out
  and back in, or press "Check again" on the admin screen.
`);
}

await main();
