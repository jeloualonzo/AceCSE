# AceCSE — Engineering Guide

AceCSE is a free, honest Philippine Civil Service Examination (CSE) simulator for Professional
and Subprofessional examinees. Philosophy: **Simulation first, learning second** — and **never
lie to the user**. No fake data, no inflated question counts, no fabricated progress.

## Current State (2026-08)

- Full rewrite from the original scaffold: real routing, real auth, real persistence.
- Question bank: 424 validated original questions across all five subjects
  (`content/questions/<subject>/*.json` — one file per authored batch; see
  `docs/content/JSON_SPEC.md`, which is the schema authority, not this file). Both the
  full 170-item Professional and full 165-item Subprofessional simulations are unlocked
  (every subject meets its blueprint supply).
- Firebase: Google sign-in AND email/password (sign-up, sign-in, password reset), with
  provider linking so a Google user can add a password to the same uid (Settings → Account).
  Firestore profiles + attempt history with offline persistence, plus a create-only
  `feedback` collection, least-privilege rules in `firestore.rules`.
- Both examination levels are live, and there is **no app-wide "active level"**: every screen
  shows all applicable content. Simulation offers the two examinations as two cards; Practice
  derives its per-level options from `SUBJECTS_BY_LEVEL` + build-time supply
  (`src/lib/practiceLevels.ts`); Dashboard and History show every attempt and label each one
  with its own `examLevel`. A level belongs to a session, a question, or an attempt — never to
  the application.
- Two application experiences, one sign-in: the **learner app** (`/app/*`) and a genuinely
  separate **admin app** (`/admin/*`) with its own login, layout, sidebar, dashboard, and
  navigation — Content Bank and the refinement workspaces.
  Admin authority is the Firebase custom claim `admin: true`; accounts are created with
  `npm run admin:create` (interactive password prompt, never a flag or a file). See
  docs/admin/ADMIN_ACCESS.md.

## Architecture

Two applications behind one sign-in. Post-login routing is role-aware.

```
Landing (/) → Auth (/auth) → Learner shell (/app/*) → Exam focus mode (/app/exam)
Admin login (/admin/login) → Admin shell (/admin/*) → Exam focus mode (/app/exam)
```

- **Route guards:** `RequireAuth` protects `/app/*` (guests → `/auth` with a `from` deep link);
  `RequireAdmin` protects the whole `/admin` tree (guests → `/admin/login`, signed-in non-admins →
  an honest refusal screen, never a redirect); `RedirectWhenAuthed` makes `/`, `/auth`, and
  `/admin/login` guest-only. Guards are on the parent route, so a page added later cannot ship
  ungated by omission. Both guards **wait** on `adminResolved` rather than reading "not yet known"
  as "not an admin" — the claim is read asynchronously off the ID token. Sign-out uses the
  `signingOut` flag in AuthContext so the landing page renders during the transition without
  bouncing back into the app.
- **Learner vs admin:** `AppLayout` (learner) and `AdminLayout` share `shellContext.ts` but nothing
  else — separate header, sidebar, nav config (`navConfig.ts` vs `adminNavConfig.ts`), and
  dashboard. Content Bank and the refinement workspaces are admin-only and must never appear in
  learner navigation. `src/navigation/appRoutes.ts` is the single source of route constants for
  both trees; `appRoutes.test.ts` asserts the two navigations share no path.
- **Content review runs:** the Batch Workspace launches the real learner `PracticePage`/`ExamPage`
  on an exact list of question ids — no second engine. `ExamSession.internalReview` (set from
  `ExamLaunchRequest.internalReview`) is the ONLY flag that suppresses the Firestore write in
  `ExamPage`'s `finishWith`, so the run is graded and reviewable but never enters learner History
  or analytics. Nothing else sets it. See docs/admin/ADMIN_ACCESS.md.
- **Structure management foundation (groups / directions / instructions):** `src/data/contentStructures.ts`
  builds a **read-only** normalized view of the two authored structure sources —
  `content/groups/<subject>/core-groups.json` and `sharedTaskDefinitions` in
  `content/taxonomy/taxonomy.json` — and projects each one into Review Markdown or its exact
  authored JSON. `/admin/content-bank/structures/:subjectSlug` (`ContentBankStructuresPage`)
  renders it and is marked read-only tooling; editing is deliberately not built yet. Two rules
  hold it honest: `buildSubjectStructures` filters out the `singleton:<id>` pseudo-groups
  `normalizeContent` invents, and the learner-facing column comes from `resolveSharedTaskContext`
  in `src/data/sharedTaskContext.ts` — the same derivation the booklet's `SectionRenderer` uses, so
  the screen cannot drift from what an examinee reads. Nothing here writes anywhere; structure
  content stays source-controlled.
- **One export surface:** `src/components/contentBank/ExportDocumentPanel.tsx` is the ONLY
  implementation of character counting, 8,000-character chunk display, Copy Chunk, and the
  integrity gate. Callers pass `sources` that each `build()` an `ExportDocument`;
  `ReviewExportPanel` (batch review) and the structures workspace are both thin adapters over it.
- **Code splitting:** every page is a `React.lazy` route chunk. Firestore is only reached through
  dynamic imports in `src/services/*` (facade + `*Impl.ts`) and lives in its own chunk — never
  import `src/lib/firestore.ts` statically.
- **Lazy question bank:** `src/data/questionBank.ts` glob-imports content lazily; each dataset
  file is its own content-hashed chunk fetched when a session needs that subject. Availability
  counts come from `virtual:question-manifest`, computed at build time by
  `scripts/vite-plugin-question-manifest.ts`. Adding a batch file requires no code change.

- **`src/config/exam.ts`** — single source of truth for the CSC blueprint: subject
  distributions (Pro 40/40/50/40 = 170 over 190 min; Sub 40/35/50/40 = 165 over 160 min),
  80% passing mark, simulation tiers (20/50/100/full), practice sizes.
- **`src/lib/examEngine.ts`** — honest session generation. Samples WITHOUT replacement,
  never relabels subjects, throws `InsufficientBankError` instead of repeating questions.
  Simulation tiers are offered only when every subject has enough unique supply
  (`simulationOptions`, synchronous via the build-time manifest); the UI now surfaces only the
  full examination for each level, via `fullSimulationOption(level)`. The shortened 20/50/100
  tiers remain in the configuration and are deliberately unreachable — a shortened run is not a
  simulation. Session builders are async — they lazy-load only the subjects the session needs.
  Largest-remainder method scales distributions.
- **`src/lib/grading.ts`** — pure `gradeSession(session, index) → Attempt`.
- **`src/lib/analytics.ts`** — all dashboard stats derive from real attempts; fields are
  `null` (rendered as honest empty states) when no data exists.
- **`src/hooks/useCountdown.ts`** — deadline-based timer (wall-clock `deadlineAt`), immune to
  interval drift and tab throttling. Never use decrementing `setInterval` counters.
- **`src/lib/sessionStorage.ts`** — active session persists to localStorage on every answer;
  `ExamPage` resumes it after refresh/crash. Expired timed sessions grade as-is at deadline.
- **`src/pages/ExamPage.tsx`** — owns the session state machine: `pre → active → results`.
  Launches come from router state (`ExamLaunchRequest`); resume comes from localStorage. The
  `internalReview` flag rides on `ExamSession` (not `SessionConfig`), so it survives a refresh and
  still cannot reach Firestore — `gradeSession` builds the Attempt from an explicit field whitelist.
- **`src/context/AuthContext.tsx`** — Google popup + email/password (sign-in, sign-up with
  display name, password reset) and `linkEmailPassword` provider linking. Unauthenticated
  visitors never reach the app shell (RequireAuth).

## Firestore

```
users/{uid}                    profile (displayName, email, isAnonymous, timestamps)
users/{uid}/attempts/{id}      immutable Attempt records (mode, level, counts, percentage,
                               passed, durations, subjects[], items[] ≤ 200)
feedback/{id}                  create-only user feedback (uid, email, category, message,
                               createdAt, appVersion) — reviewed in the console
```

Rules: default-deny, owner-only access, attempts immutable after create, field validation on
writes, `createdAt` immutable on profile updates. `preferredExamLevel` is still an *optional*
allowed key in the profile rules — the client no longer writes it, and the key was deliberately
left in place so legacy documents stay writable. Questions ship as static JSON (no Firestore
reads) as lazy per-file chunks, so bank growth no longer affects the initial payload; migrate to
a `questions` collection only if moderation/hotfix speed or non-engineer authorship demands it
(see docs/content/CONTENT_PIPELINE.md, "Firestore migration path").

## Question Bank

- Files: `content/questions/<subject>/*.json` where `<subject>` ∈ numerical, analytical,
  verbal, clerical, general-information. `core.json` is each subject's baseline; every new
  batch is its own dated file (see `docs/content/JSON_SPEC.md` §1). The directory convention
  is load-bearing — the runtime fetches by subject directory and the validator enforces the
  subject/directory match.
- Schema: canonical `Question` in `src/types/index.ts` — id, examLevel, subject, topic,
  difficulty, question, passage?, choices (A–D, in order), correctOptionId, explanation,
  reference?, tags.
- **`npm run validate:questions`** enforces structure, unique ids, unique stem+choices,
  teaching-quality gates, and the subject/directory convention, and reports per-subject
  supply and answer-letter balance. Run it after any content change.
- Content rules: original wording only; verify facts against primary sources (Constitution,
  Republic Acts on lawphil.net, csc.gov.ph); cite `reference` for fact-based items; verify
  all math/logic computationally before committing; keep answer letters balanced.

## Conventions

- TypeScript strict; `npm run typecheck` must pass. Path alias `@/* → src/*`.
- Tailwind v4 utility classes; slate/emerald palette; dark UI for exam/results, light for shell.
- Accessibility: real `<button>`s, `role="radiogroup"/"radio"` for options, `aria-expanded` on
  disclosures, visible focus rings, 44px min touch targets, honest `role="status"/"alert"`.
- Never introduce: fake data, placeholder stats, question repetition, subject relabeling,
  decorative "X • Y" separators, or unverifiable questions.

## Known Limitations / Next Steps

- (resolved 2026-08) Subprofessional full exam unlocked — Clerical Ability supply is 53 ≥ 35.
- Vitest is in place (`npm test`). Coverage is deepest where correctness is load-bearing: the pure
  engine (`examEngine`, `grading`, `analytics`), route/nav separation, the admin guards, the
  Markdown export/chunking, the Practice level derivation (`practiceLevels`), and both directions
  of the attempt-persistence gate (`src/pages/attemptPersistence.test.tsx`). Simulation, Dashboard,
  and History now have page tests too; most other page components are still untested.
- Attempt review stores question ids; if a question is removed from the bank, grading skips it
  and ResultsScreen hides it gracefully. Prefer deactivating over deleting bank questions.
- Bookmarks, notes, admin moderation, PWA — see README roadmap. (Google↔password provider linking shipped.)

## Product Rules (owner-set — do not "improve" without asking)

- **Learner and admin are two experiences, not one experience with extra pages.** The admin app
  gets its own layout, sidebar, dashboard, and navigation hierarchy inside AceCSE's design
  language. Never build it as the learner shell with Content Bank bolted on, and never surface an
  admin destination in learner navigation. Admins reach the learner app only through the explicit
  **View Learner App** action, which uses the real learner engine — never a copy.
- **Admin authority is the `admin: true` custom claim, enforced in `firestore.rules`.** Client
  guards are UX. Never authorize on a Firestore profile field, an email allowlist, or any
  client-only flag, and never weaken the rules to make a screen work.
- **Content review runs are not learner data.** A Batch Workspace review run must never write an
  attempt, and the UI must say plainly that it is not recorded.
- **There is no global active exam level.** Never reintroduce an app-wide level selector, switch,
  or "current level" state, and never filter a screen by one. Levels are metadata on a session, a
  question, or an attempt; where a level genuinely changes what a launch would draw, derive the
  options from `src/config/exam.ts` plus real supply rather than hard-coding them.
- **Simulation and Practice are two different products.** Simulation = pressure and realism:
  timed, no feedback, no explanations, one final results page. Practice = learning: untimed by
  default, instant explanations, answers changeable, skip and restart freely. Never merge their
  UX again. They live on separate pages (`SimulationPage`, `PracticePage`).
- **No flag/bookmark feature in the MVP** — intentionally removed; do not reintroduce.
- **No page subtitles under titles, no divider lines under titles, no "•"/"·" metadata
  separators.** Use whitespace, stacked label/value pairs, or badges.
- **Practice feedback is calm:** selection styling is always emerald (never red/green
  verdict colors), there is NO separate Correct/Incorrect banner, and the full teaching
  explanation sits behind a "Show Explanation" accordion. The explanation itself carries the
  verdict. Applies to Practice and the landing sample question alike.
- **Explanations look like documentation, not alerts:** white (light) / dark surface (dark)
  card with only a left emerald accent border. No tinted green backgrounds.
- **Questions are not carded:** question number label, subject badge, question, passage, and
  choices sit directly on the page; only the explanation is a card.
- **Radius scale is professional** (Linear/GitHub register): global tokens in index.css remap
  rounded-lg→6px, rounded-xl→8px, rounded-2xl→10px. Don't reintroduce bubble radii.
- **Brand mark:** src/components/BrandMark.tsx (A-with-check on emerald tile), mirrored in
  public/favicon.svg. Keep the two in sync; don't revert to placeholder icons.
- **Exam layout:** desktop is two-column (question/passage/explanation left, choices right)
  with header-based navigation and the timer centered; mobile keeps the footer nav with the
  timer centered in the header. Never use `items-center` on an overflow container (it clips
  tall content) — auto margins center safely.
- **Theme:** Light / Dark / System, persisted locally, set in Settings, applied via the `dark`
  class on <html> (Tailwind class strategy, `@custom-variant` in index.css). App and exam
  surfaces are light-first with `dark:` variants. Landing and Auth stay light-only.
- **Landing:** primary CTA "Get Started with Google"; secondary scrolls to the sample question
  — two CTAs must never do the same thing. The sample question uses real bank items and the
  exact in-app ExplanationPanel (light theme).
- **Landing page is the default entry.** Get Started (primary) and Sign In (secondary) both lead
  to Google auth.
- **No fake data, ever.** Empty states like "No exam history yet." until real data exists.
- When a UX decision is ambiguous, follow the existing AceCSE vision — not generic SaaS patterns
  — and ask the owner rather than inventing.
