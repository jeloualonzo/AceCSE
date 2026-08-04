# AceCSE

**A realistic, free Philippine Civil Service Examination simulator.**
Simulation first. Learning second.

AceCSE helps Career Service Examination (CSE) examinees prepare through honest, timed exam
simulations that mirror the official CSC experience — real subject proportions, real time
pressure, a real passing mark — plus targeted subject practice with instant explanations.

No gamification. No fake progress. No invented statistics. Everything you see is computed
from your actual results.

## Screenshots

> _Screenshots coming soon._

## Features

- **Timed simulations** following the official CSC blueprint — subject proportions, section
  order, and proportionally scaled time limits (full exams: 170 items / 3 h 10 m Professional,
  165 items / 2 h 40 m Subprofessional).
- **Honest exam sizes.** Simulation tiers (20 / 50 / 100 / full) unlock only when the validated
  question bank can fill them with unique questions. Questions are never repeated or relabeled
  to fake a longer exam.
- **Subject practice** — Numerical, Analytical, Verbal, Clerical, and General Information
  drills with instant feedback, worked explanations, and optional per-question timing.
- **Crash-proof sessions.** Deadline-based timing (immune to interval drift and background-tab
  throttling) and local session persistence — a refresh never destroys an in-progress exam.
- **Real diagnostics.** Score, subject mastery, weak-area detection, pass rate, and a readiness
  estimate — all derived from your attempt history. Honest empty states until data exists.
- **Full item review** after every session: your answer, the correct answer, the rationale,
  and legal references for fact-based items.
- **Guest-first accounts.** Start instantly with an anonymous account; upgrade to a permanent
  email account later without losing any data.
- **Offline-friendly.** Firestore offline persistence keeps history readable and queues writes
  until connectivity returns.
- **Verified question bank.** Original items authored against primary sources (1987
  Constitution, RA 6713, RA 9003, RA 8749, and standard quantitative/verbal conventions),
  with per-item explanations, difficulty, topics, tags, and references. Structural validation
  runs in CI via `npm run validate:questions`.

## Technology Stack

| Layer | Technology |
| --- | --- |
| UI | React 19, TypeScript (strict), Tailwind CSS v4 |
| Routing | React Router 7 |
| Build | Vite 6 |
| Backend | Firebase Authentication (anonymous + email), Cloud Firestore |
| Icons | Lucide |

## Installation

```bash
git clone https://github.com/jeloualonzo/AceCSE.git
cd AceCSE
npm install
```

## Environment Variables

Copy the example file and fill in your Firebase web app configuration
(Firebase Console → Project Settings → General → Your apps):

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project id |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender id |
| `VITE_FIREBASE_APP_ID` | Web app id |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | Optional; leave empty for the default database |

> Firebase web config values identify your project to Google's SDK; access control is enforced
> by Firestore Security Rules and Firebase Auth, not by keeping these values secret.

### Firebase setup

1. Create a Firebase project and a web app.
2. Enable **Authentication → Sign-in methods**: Anonymous and Email/Password.
3. Create a **Cloud Firestore** database.
4. Deploy the security rules: `firebase deploy --only firestore:rules` (rules live in
   [`firestore.rules`](firestore.rules)).

## Running Locally

```bash
npm run dev            # start the dev server on http://localhost:3000
npm run typecheck      # strict TypeScript check
npm run validate:questions  # validate the question bank
npm run build          # production build
npm run preview        # preview the production build
```

## Project Structure

```
content/questions/     Question bank (JSON, validated)
scripts/               Build & validation scripts
src/
  components/          UI components (auth, exam, landing, shell)
  config/exam.ts       CSC blueprint: distributions, durations, passing mark
  context/             Auth context
  data/                Question bank loader, landing content
  hooks/               useAttempts, useCountdown
  lib/                 Exam engine, grading, analytics, CSV, time, storage
  pages/               Routed pages (Landing, Auth, Dashboard, Practice, Exam, History, Settings)
  services/            Firestore access (profiles, attempts)
  types/               Canonical domain types
firestore.rules        Firestore security rules (default deny, least privilege)
```

## Question Bank

Questions are original works authored for AceCSE. Fact-based items cite primary public
sources — the 1987 Constitution, Republic Acts (6713, 9003, 8749), and official CSC-published
exam coverage. Philippine government edicts (laws, the Constitution) are not subject to
copyright under Sec. 176 of the Intellectual Property Code; explanatory text is our own.

Every question carries: exam level, subject, topic, difficulty, four choices, the correct
answer, a worked explanation, tags, and (where applicable) a legal reference.
`npm run validate:questions` enforces the schema, unique ids, unique stems, and reports
per-subject supply and answer-letter balance.

## Roadmap

- [ ] Grow the validated bank to full-exam supply for both levels (Subprofessional full exam
      currently locked pending more Clerical Ability items)
- [ ] Bookmarks and per-question notes
- [ ] Improvement-over-time charts
- [ ] Question versioning and moderation workflow (admin)
- [ ] Google sign-in linking
- [ ] PWA install + full offline exams
- [ ] Community question review pipeline

## Contributing

Contributions are welcome — especially verified, original exam questions.

1. Fork and branch from `main`.
2. For question contributions, follow the schema in `content/questions/` and run
   `npm run validate:questions`. Cite primary sources for fact-based items. Never copy
   copyrighted reviewer content.
3. `npm run typecheck && npm run build` must pass.
4. Open a pull request describing what you changed and why.

## License

[MIT](LICENSE)
