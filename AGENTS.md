# Before Writing Code

Future AI coding agents working on AceCSE MUST strictly follow this mandatory workflow before touching code:

1. **Explore Existing Implementation:** Inspect `src/types.ts`, `src/lib/examGenerator.ts`, `src/data/mockQuestions.ts`, and relevant component files.
2. **Compare Against Requested Feature:** Map the user's explicit request to existing architectural boundaries.
3. **Perform Gap Analysis:** Identify what exists vs. what is missing.
4. **Produce Minimal Implementation Plan:** Draft a concise plan (max 3–4 bullet points) stating exactly which files will change and why.
5. **Wait for Approval:** Ask the user to confirm the plan if there are structural decisions or ambiguities.
6. **Execute Cleanly:** Only write code after validating the scope and receiving approval.

---

# Development Rules

- **Do NOT Rewrite Architecture:** The unidirectional data flow (Question Bank -> Generator -> Immutable Session -> Engine -> Grading -> Results) is frozen. Do not alter it.
- **Do NOT Overengineer:** Keep code clean, modular, and readable. Avoid unnecessary abstractions, factory functions, or speculative interfaces.
- **Prefer Modifying Existing Files:** Extend existing components in `src/components/` and utility functions in `src/lib/` rather than creating redundant files.
- **Keep MVP Clean & Functional:** Do not introduce fake backend loaders, simulated network delays, or placeholder mock APIs.

---

# UI Rules

- **Zero Gamification:** Strictly NO streaks, NO XP, NO achievements, NO badges, NO leaderboards, NO coins.
- **Strict Visual Style:**
  - White/light background canvas (`bg-slate-50`, `bg-white`).
  - Dark slate typography (`text-slate-900`, `text-slate-700`).
  - Emerald accent (`bg-emerald-600`, `hover:bg-emerald-700`).
  - 1px slate borders (`border-slate-200`).
- **Forbidden UI Patterns:**
  - NO dark mode gradients (e.g. purple-to-blue).
  - NO glassmorphism or neumorphism.
  - NO flashy or unnecessary animations.
  - NO horizontal divider lines below page header titles.
  - NO descriptive subtitles underneath top page header titles.
  - NO bullet metadata separators (e.g., `30 Items • 30 mins`). Use icons or stacked text instead.
- **Accessibility & Touch:** Touch targets must be at least 44px (`min-h-[44px]`). Focus visible rings must use `focus-visible:ring-2 focus-visible:ring-emerald-600`.

---

# Question Bank Rules

Every question inserted into the system MUST satisfy the canonical `Question` schema in `src/types.ts`:

- `id`: String (unique identifier; e.g. `'num-001'`).
- `examLevel`: `'Professional' | 'Subprofessional' | 'Both'`.
- `subject`: `'Numerical Reasoning' | 'Verbal Ability' | 'Analytical Reasoning' | 'Clerical Ability' | 'General Information'`.
- `topic`: String describing specific sub-topic (e.g., `'Work & Rate Problems'`).
- `difficulty`: `'Easy' | 'Medium' | 'Hard'`.
- `question`: String (item prompt text).
- `choices`: Array of exactly 4 objects `[{ id: 'A', text: '...' }, { id: 'B', text: '...' }, { id: 'C', text: '...' }, { id: 'D', text: '...' }]`.
- `correctOptionId`: `'A' | 'B' | 'C' | 'D'`.
- `explanation`: String (detailed solution step or law reference).
- `source`: String (e.g., `'1987 Constitution Article XI'`, `'CSC Official Practice Standard'`).
- `tags`: String array.
- `active`: Boolean (`true`).

**Strict Content Standards:**
- **NO Duplicate IDs:** Ensure every question ID is unique across the entire bank.
- **NO Fake Explanations:** Explanations must be step-by-step mathematical solutions, grammatical rules, or official Philippine statutory references.
- **NO Fabricated Sources:** Only cite official Philippine laws (R.A. 6713, 1987 Constitution, Civil Service Rules) or standard CSC subject standards.

---

# Architecture Rules

- **Question Bank (`src/data/mockQuestions.ts`):** Stores static data. Never owns runtime state.
- **Exam Generator (`src/lib/examGenerator.ts`):** Creates exam sessions and grades results. Never mutates input questions.
- **Exam Session (`ExamSession`):** Immutable representation of an active exam. Never regenerates or shuffles items once instantiated.
- **Exam Engine (`ActiveSimulatorView.tsx`):** Handles navigation, active question pointer, flag toggles, and countdown timer.
- **Grading Engine (`gradeExamSession`):** Computes score percentages and subject diagnostic statistics.
- **Results Screen (`PostExamResultsScreen.tsx`):** Displays diagnostic outcomes and item explanations.
- **Analytics View (`AnalyticsPlaceholder.tsx`):** Displays overall readiness and historical attempt trends.

**Never mix responsibilities between layers.**

---

# Current Development Priority

The current highest priority for AceCSE is **building a high-quality, authentic Civil Service Examination question bank with factual explanations and official sources**.

Future work should focus strictly on **question content expansion, data validation, and import pipeline scaling**, rather than redesigning the user interface.
