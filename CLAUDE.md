# AceCSE — Engineering Guide

AceCSE is a free, honest Philippine Civil Service Examination (CSE) simulator for Professional
and Subprofessional examinees. Philosophy: **Simulation first, learning second** — and **never
lie to the user**. No fake data, no inflated question counts, no fabricated progress.

## Current State (2026-08)

- Full rewrite from the original AI Studio scaffold: real routing, real auth, real persistence.
- Question bank: ~239 validated original questions across all five subjects
  (`content/questions/*.json`). Full 170-item Professional simulation is unlocked; the
  Subprofessional full exam stays locked until Clerical Ability supply reaches 35.
- Firebase: Google sign-in ONLY (product decision — no email/password, no anonymous yet),
  Firestore profiles + attempt history with offline persistence, least-privilege rules in
  `firestore.rules`.
- Product focus: Subprofessional level first. Professional stays fully supported in the
  engine/data model but is hidden from the UI (`ACTIVE_EXAM_LEVEL` in AppLayout).

## Architecture

```
Landing (/) → Auth (/auth) → App shell (/app/*) → Exam focus mode (/app/exam)
```

- **`src/config/exam.ts`** — single source of truth for the CSC blueprint: subject
  distributions (Pro 40/40/50/40 = 170 over 190 min; Sub 40/35/50/40 = 165 over 160 min),
  80% passing mark, simulation tiers (20/50/100/full), practice sizes.
- **`src/lib/examEngine.ts`** — honest session generation. Samples WITHOUT replacement,
  never relabels subjects, throws `InsufficientBankError` instead of repeating questions.
  Simulation tiers are offered only when every subject has enough unique supply
  (`simulationOptions`). Largest-remainder method scales distributions.
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
writes. Questions ship as static JSON (no Firestore reads); when the bank grows large or needs
moderation, migrate to a `questions` collection with public read + admin-only write.

## Question Bank

- Files: `content/questions/{numerical,analytical,verbal,clerical,general,seed}.json`.
- Schema: canonical `Question` in `src/types/index.ts` — id, examLevel, subject, topic,
  difficulty, question, passage?, choices (A–D, in order), correctOptionId, explanation,
  reference?, tags.
- **`npm run validate:questions`** enforces structure, unique ids, unique stem+choices, and
  reports per-subject supply and answer-letter balance. Run it after any content change.
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

- Subprofessional full exam locked (needs ≥ 35 clerical items; currently 33).
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
- **Landing page is the default entry.** Get Started (primary) and Sign In (secondary) both lead
  to Google auth.
- **No fake data, ever.** Empty states like "No exam history yet." until real data exists.
- When a UX decision is ambiguous, follow the existing AceCSE vision — not generic SaaS patterns
  — and ask the owner rather than inventing.
