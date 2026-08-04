# AceCSE

AceCSE is a specialized, production-grade Civil Service Examination (CSE) simulation and diagnostic platform designed specifically for Philippine civil service examinees (Professional and Subprofessional eligibility levels).

- **Target Audience:** Filipino career service examinees, government aspirants, and civil service employees pursuing Professional or Subprofessional eligibility.
- **Purpose:** Provide an authentic, high-fidelity exam simulation environment that mirrors the exact timing, subject weight distribution, question structure, and official scoring benchmarks established by the Philippine Civil Service Commission (CSC).
- **Goals:** Eliminate exam anxiety, accurately measure real-time readiness, deliver diagnostic breakdowns by subject and topic, and provide clear explanations grounded in official Philippine laws, standard executive procedures, and quantitative logic.
- **Current Maturity:** The frontend application, UI/UX design system, immutable exam engine, grading & diagnostic pipeline, local question bank schema, and session management architecture are 100% feature-complete, polished, and validated. The repository is ready for scaling the question bank content and integrating cloud persistence/authentication in future phases.

---

# Product Philosophy

AceCSE adheres to strict product principles designed to serve serious test-takers:

1. **Simulation First, Learning Second**
   - The primary objective of AceCSE is to replicate real examination conditions: timed countdowns, strict option layouts, flagged question tracking, and high-focus visual discipline. Test-takers build endurance and time-management skills alongside subject mastery.

2. **Strict Alignment with the Civil Service Commission (CSC)**
   - All subject distributions, question models, time limits, and passing criteria strictly mirror official CSC guidelines:
     - **Professional Level:** 170 items, 3 hours 10 minutes (190 minutes). Covers Numerical Reasoning, Verbal Ability, Analytical Reasoning, and General Information.
     - **Subprofessional Level:** 165 items, 2 hours 40 minutes (160 minutes). Covers Numerical Reasoning, Verbal Ability, Clerical Ability, and General Information.
     - **Passing Threshold:** 80.0% overall score required to pass, matching CSC standards.

3. **Professional Government-Style Visuals**
   - AceCSE deliberately uses a authoritative, clean, high-density government-aesthetic UI (Slate and Emerald palette) that focuses examinee attention on question comprehension rather than flashy app elements.

4. **Zero Gamification**
   - **No Streaks. No XP. No Achievements. No Leaderboards. No Coins.**
   - *Rationale:* Civil service preparation is a serious career milestone. Gamification creates artificial pressure, distracts from diagnostic self-awareness, and encourages superficial engagement. Readiness is measured purely in score accuracy, speed, and topic mastery.

5. **Readiness Over Entertainment**
   - Success is measured by an examinee's **Readiness Rating**—an empirical calculation based on accuracy, time-per-question, subject coverage, and recent exam performance.

6. **Immediate Diagnostic Feedback**
   - Upon completing an exam, candidates receive an instant diagnostic breakdown highlighting subject strengths, weak sub-topics, time spent per section, and item-by-item explanations.

---

# UI / UX Design System

AceCSE follows an explicit "Anti-Slop" design philosophy focused on readability and authority:

- **Color Palette & Light Theme:** White/off-white canvas (`bg-slate-50`, `bg-white`), crisp slate text (`text-slate-900`, `text-slate-700`), subtle slate borders (`border-slate-200`), and a single primary emerald accent (`bg-emerald-600`, `hover:bg-emerald-700`) representing official passing status and primary actions.
- **No Gradients, No Glassmorphism, No Neumorphism:** Strictly banned. All panels use flat surfaces with clean 1px borders and subtle shadow elevation (`shadow-xs` or `shadow-sm`).
- **Whitespace Over Divider Lines:** Section separation is achieved through negative space (`gap-6`, `mb-8`) rather than cluttering horizontal rule dividers.
- **No Page Subtitles:** Page titles stand cleanly on their own without redundant descriptive paragraphs beneath header titles (e.g., "Dashboard", "Practice & Exam Center", "Settings").
- **Clean Metadata Display (No Bullet Separators):**
  - *Banned Pattern:* `30 Items • 30 mins` or `82% • Passed`.
  - *Mandatory Pattern:* Stacked labels, dedicated stat cards, or icon-anchored metadata tags (e.g., combining Lucide `<FileText className="w-3 h-3 text-slate-400" /> 30 Questions` with `<Clock className="w-3 h-3 text-slate-400" /> 30 Minutes`).
- **Typography & Scale:** Standard sans-serif stack with high legibility. Heading levels progress logically without skipping steps.
- **Touch & Accessibility:** Minimum 44px touch targets on interactive elements, explicit `focus-visible:ring-2 focus-visible:ring-emerald-600` outline rings, and high text contrast meeting WCAG AA standards.

---

# Architecture

The AceCSE application follows a strict unidirectional, single-responsibility architectural data flow:

```
┌─────────────────────────┐
│  LOCAL_QUESTION_BANK    │  (Static Repository of Validated Questions)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Exam Generator      │  (Filters by Scope, Samples Topics, Shuffles Choices)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│      Exam Session       │  (Immutable Session Contract with Target Timers)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│       Exam Engine       │  (Manages Answers, Flagged Items, Timers, Active Question Index)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Grading Engine      │  (Computes Scores, Passing Status, Topic Breakdown, Time Spent)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Post-Exam Results &     │  (Visualizes Score Summary, Diagnostic Analysis & Detailed Review)
│ Analytics Diagnostic    │
└─────────────────────────┘
```

### Layer Responsibilities

1. **Question Bank (`src/data/mockQuestions.ts`):** Raw, canonical question data adhering strictly to the `Question` interface. Static and immutable at runtime.
2. **Exam Generator (`src/lib/examGenerator.ts`):** Pure utility function (`generateExamSession`) that accepts an `examLevel` and option configuration, selects valid questions, shuffles choices while preserving option IDs, and constructs a fresh `ExamSession`.
3. **Exam Session (`src/types.ts`):** The runtime state representing an active or completed exam, containing session ID, startTime, duration, target level, and an array of `ExamQuestion` items.
4. **Exam Engine (`src/components/ActiveSimulatorView.tsx`, `ExamFocusLayout.tsx`):** Handles focus-mode state management, navigation between items, answer selection, flagging questions for review, and countdown timer execution.
5. **Grading Engine (`src/lib/examGenerator.ts` -> `gradeExamSession`):** Pure function that evaluates candidate answers against correct option IDs, calculates overall percentages, subject score distributions, and time metrics.
6. **Results & Analytics (`src/components/exam/PostExamResultsScreen.tsx`, `AnalyticsPlaceholder.tsx`):** Presentation components displaying score cards, passing verdicts, detailed item reviews with explanations, and historical performance trends.

---

# Current Folder Responsibilities

```
src/
├── types.ts                        # Global TypeScript interfaces (Question, ExamSession, ExamQuestion, ExamResult)
├── data/
│   └── mockQuestions.ts            # Canonical local question bank with comprehensive Civil Service questions
├── lib/
│   └── examGenerator.ts            # Pure business logic: exam session creation, sampling, and grading engines
├── navigation/
│   └── navConfig.ts                # Navigation menu definitions & tab routing items
├── components/
│   ├── App.tsx                     # Main application view switcher & layout controller
   ├── Navbar.tsx                  # Public landing top header navigation
   ├── HeroSection.tsx             # Public landing hero banner
   ├── CoreFeaturesSection.tsx     # Landing feature highlights
   ├── ExamCoverageSection.tsx     # Subject breakdown grid
   ├── InteractiveQuestionSection.tsx # Landing page live question trial widget
   ├── ProductPreviewSection.tsx  # Interactive simulator preview card
   ├── PracticeModal.tsx           # Quick exam setup modal overlay
   ├── FAQSection.tsx              # Frequently asked questions
   ├── Footer.tsx                  # Landing page footer
   ├── shell/                      # Application Shell Components
   │   ├── AppShell.tsx            # Main layout wrapper with sidebar & header
   │   ├── AppHeader.tsx           # Inner app top bar with profile dropdown & scope switch
   │   ├── AppSidebar.tsx          # Collapsible navigation drawer
   │   ├── AppBottomNav.tsx        # Mobile tab bar
   │   ├── AppCanvas.tsx           # Content canvas container wrapper
   │   └── ExamFocusLayout.tsx     # Full-screen borderless simulator header/timer bar
   ├── exam/                       # Exam Engine & Simulator Views
   │   ├── ActiveSimulatorView.tsx # Core exam engine view (timer, navigator, current card)
   │   ├── QuestionCard.tsx        # Exam item display component (question text, options, flag toggle)
   │   ├── PreExamScreen.tsx       # Pre-exam instructions & rules overview screen
   │   └── PostExamResultsScreen.tsx # Post-exam score summary & answer key review
   └── views/                      # Main App Navigation Tab Views
       ├── DashboardPlaceholder.tsx # Primary examinee dashboard (readiness, stats, quick start)
       ├── PracticePlaceholder.tsx  # Subject practice modules & full mock exams list
       ├── AnalyticsPlaceholder.tsx # Exam history & subject performance diagnostics
       └── SettingsPlaceholder.tsx  # Exam scope target toggle & app preferences
```

---

# Features Completed

1. **Public Landing Page & Interactive Trial:**
   - Hero banner with immediate "Get Started" and "Sign In" actions.
   - Live interactive sample question widget allowing prospective users to test answer selection and view instant explanations.
   - Complete exam subject coverage breakdown and interactive simulator preview.

2. **App Shell & Layout Framework:**
   - Responsive sidebar and mobile bottom navigation.
   - Header with quick "Target Exam Scope" switcher (Professional vs. Subprofessional) and seamless return to landing page.
   - Clean `AppCanvas` wrapper with standardized header titles and action slots.

3. **Examinee Dashboard:**
   - Overall Readiness Rating display (0–100%).
   - Exam count metrics, total practice hours, and subject accuracy meters.
   - Quick "Start Full Simulation" launch trigger and recent attempt history logs.

4. **Practice & Exam Center:**
   - Pre-configured practice modules (Numerical Reasoning, Verbal Ability, Analytical Reasoning, Clerical Ability, General Information).
   - Custom exam launch modal with level selection (Professional vs. Subprofessional).

5. **Focus-Mode Exam Simulator:**
   - Full-screen distraction-free interface with live countdown timer and progress gauge.
   - Grid-based Question Navigator palette with visual state indicators (Answered, Unanswered, Flagged, Active).
   - Ability to flag items for review and update responses at any time.
   - Auto-saving state during exam navigation.

6. **Post-Exam Diagnostic Breakdown:**
   - Passing verdict banner (Passed ≥ 80%, Failed < 80%).
   - Score breakdown, completion time metrics, and accuracy percentage.
   - Subject-by-subject score breakdown bars.
   - Complete question review list with candidate choice, correct choice highlight, and source-backed explanations.

7. **Analytics & Performance History:**
   - Score trend chart over past attempts.
   - Subject diagnostic matrix highlighting areas needing improvement.
   - History table of completed practice and full mock exam sessions.

---

# Current Application State

- **UI & UX:** 100% complete, fully responsive, and styled with consistent professional visual rules.
- **Exam Engine:** Fully functional and immutable. Sessions are instantiated cleanly without mutating state.
- **Question Bank Architecture:** Implemented in `mockQuestions.ts` using the canonical `Question` interface.
- **Grading & Scoring:** Completely implemented in `examGenerator.ts`.
- **Firebase Infrastructure:** Provisioned in `src/lib/firebase.ts` but **intentionally unused** at present. The application operates entirely client-side/locally to preserve maximum speed, simplicity, and zero external dependency friction.
- **Authentication:** Not implemented yet. Profile dropdown and buttons trigger application entry directly.

---

# Project Decisions Log

1. **Immutable Exam Sessions:**
   - *Decision:* Once an `ExamSession` is generated by `generateExamSession()`, its list of questions, choices, and timer limits remain frozen.
   - *Rationale:* Re-generating or mutating questions mid-exam destroys exam integrity, skews timing diagnostics, and causes state sync bugs.

2. **Canonical `Question` Model:**
   - *Decision:* All questions in the system share a single TypeScript interface specifying `id`, `examLevel`, `subject`, `topic`, `difficulty`, `question`, `choices`, `correctOptionId`, `explanation`, `source`, `tags`, and `active`.
   - *Rationale:* Establishes a strict contract required for importing large question datasets without custom parsers or schema conversions.

3. **Firebase Provisioned But Unused:**
   - *Decision:* Firebase initialization code exists in `src/lib/firebase.ts`, but all application state uses React local state and mock data.
   - *Rationale:* Avoids blocking user practice with auth walls or network failures during initial deployment while leaving cloud sync hooks ready for future backend integration.

4. **Rejection of Gamification:**
   - *Decision:* Explicitly removed study streaks, XP, achievements, and leaderboards. Replaced with "Readiness Rating".
   - *Rationale:* Civil service test-takers need accurate assessment of exam readiness, not artificial engagement loops.

5. **UI Polish & Subtitle Removal:**
   - *Decision:* Removed page subtitles and horizontal header dividers across all main application screens (`Dashboard`, `Practice`, `Analytics`, `Settings`).
   - *Rationale:* Creates a cleaner, quieter interface with better information hierarchy, allowing examinees to focus directly on data cards and controls.

6. **Elimination of Bullet (`•`) Metadata Separators:**
   - *Decision:* Replaced inline bullet strings (`30 Items • 30 mins`) with structured stat boxes, Lucide icons, or labeled fields.
   - *Rationale:* Inline bullets look like low-effort templates ("AI Slop"). Icon-anchored and stacked metadata look professionally engineered.

---

# Coding Principles

1. **Single Responsibility & Pure Business Logic:** Keep business calculations (exam sampling, score grading, topic distribution) in pure functions within `src/lib/` separate from React UI components.
2. **Never Mutate Source Data:** The question bank (`LOCAL_QUESTION_BANK`) is a read-only source of truth. The generator creates fresh copies when building an exam session.
3. **No Duplicated Grading Logic:** All score calculations must route through `gradeExamSession()` in `src/lib/examGenerator.ts`.
4. **Prefer Modifying Over Creating:** Extend existing modular files rather than proliferating unnecessary single-use components or helpers.
5. **Types First:** Maintain type safety in `src/types.ts` for any new exam parameters or diagnostic metrics before implementation.

---

# Current Roadmap

1. **Priority 1 — Real Civil Service Question Bank:** Populate `mockQuestions.ts` (or split into structured JSON files under `src/data/questions/`) with thousands of verified CSC practice questions.
2. **Priority 2 — Source-Backed Explanations:** Ensure every question includes detailed, authoritative explanations citing the 1987 Philippine Constitution, R.A. 6713, CSC rules, or standard mathematical solutions.
3. **Priority 3 — Question Import & Validation Pipeline:** Build an internal script or module to validate JSON question batches before merging into the main bank.
4. **Priority 4 — User Authentication:** Integrate Firebase Auth (or custom auth) for examinee registration and login.
5. **Priority 5 — Cloud Persistence:** Sync attempt history, bookmarks, and diagnostic ratings to Firestore.
6. **Priority 6 — Advanced Analytics:** Provide deep weakness diagnostic reporting and custom adaptive review sets based on weak topics.
7. **Priority 7 — Production Deployment:** Final performance tuning and Cloud Run deployment.

---

# Things Future AI Must Never Do

1. **NEVER add gamification** (no XP, no streaks, no badges, no coins, no leaderboards).
2. **NEVER redesign the UI system** or add dark-mode gradients, glassmorphism, or flashy entrance animations.
3. **NEVER re-introduce bullet separators (`•`)** for item metadata or descriptive subtitles under page titles.
4. **NEVER fabricate question explanations or sources**; all questions must have factual, verifiable solutions.
5. **NEVER mutate `ExamSession` questions** or regenerate questions mid-exam.
6. **NEVER break the canonical `Question` interface** in `src/types.ts`.
7. **NEVER create placeholder backend calls** or mock API loaders that simulate network delay. Keep client logic fast and local until real Firebase persistence is enabled.
8. **NEVER remove existing functionality** or screens without explicit user instructions.
