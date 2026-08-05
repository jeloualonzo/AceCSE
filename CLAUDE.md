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
- Firebase: Google sign-in ONLY (product decision — no email/password, no anonymous yet),
  Firestore profiles + attempt history with offline persistence, least-privilege rules in
  `firestore.rules`.
- Product focus: Subprofessional level first. Professional stays fully supported in the
  engine/data model but is hidden from the UI (`ACTIVE_EXAM_LEVEL` in AppLayout).

## Architecture

```
Landing (/) → Auth (/auth) → App shell (/app/*) → Exam focus mode (/app/exam)
```

- **Route guards:** `RequireAuth` protects `/app/*` (guests → `/auth` with a `from` deep link);
  `RedirectWhenAuthed` makes `/` and `/auth` guest-only (signed-in users → dashboard). Sign-out
  uses the `signingOut` flag in AuthContext so the landing page renders during the transition
  without bouncing back into the app.
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
  (`simulationOptions`, synchronous via the build-time manifest). Session builders are
  async — they lazy-load only the subjects the session needs. Largest-remainder method
  scales distributions.
- **`src/lib/grading.ts`** — pure `gradeSession(session, index) → Attempt`.
- **`src/lib/analytics.ts`** — all dashboard stats derive from real attempts; fields are
  `null` (rendered as honest empty states) when no data exists.
- **`src/hooks/useCountdown.ts`** — deadline-based timer (wall-clock `deadlineAt`), immune to
  interval drift and tab throttling. Never use decrementing `setInterval` counters.
- **`src/lib/sessionStorage.ts`** — active session persists to localStorage on every answer;
  `ExamPage` resumes it after refresh/crash. Expired timed sessions grade as-is at deadline.
- **`src/pages/ExamPage.tsx`** — owns the session state machine: `pre → active → results`.
  Launches come from router state (`ExamLaunchRequest`); resume comes from localStorage.
- **`src/context/AuthContext.tsx`** — Google sign-in via popup; nothing else. Unauthenticated
  visitors never reach the app shell (RequireAuth).

## Firestore

```
users/{uid}                    profile (displayName, email, isAnonymous, preferredExamLevel, timestamps)
users/{uid}/attempts/{id}      immutable Attempt records (mode, level, counts, percentage,
                               passed, durations, subjects[], items[] ≤ 200)
```

Rules: default-deny, owner-only access, attempts immutable after create, field validation on
writes, `createdAt` immutable on profile updates. Questions ship as static JSON (no Firestore
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
- No tests yet — the engine (`examEngine`, `grading`, `analytics`) is pure and highly testable;
  add Vitest when test infra lands.
- Attempt review stores question ids; if a question is removed from the bank, grading skips it
  and ResultsScreen hides it gracefully. Prefer deactivating over deleting bank questions.
- Bookmarks, notes, admin moderation, Google sign-in linking, PWA — see README roadmap.

## Product Rules (owner-set — do not "improve" without asking)

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
