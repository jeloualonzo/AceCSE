# AceCSE — Master Content-Authoring Guide

**Audience:** any capable AI or human author producing question content for AceCSE.
**Status:** permanent reference. Read this end to end before writing a single item.
**Statistics snapshot:** all figures labelled *as of 2026-08-05* are computed from the live
corpus on that date. Recompute before relying on them for a new batch.

If this document ever conflicts with the code, the code wins. Authority order:

`src/types/index.ts` → `scripts/validate-questions.mjs` → the existing datasets → app behaviour → this guide → `CLAUDE.md`.

`CLAUDE.md` is the engineering guide and is **known stale** on question count, content file
paths, and the schema field list. Never cite it as schema authority. (Specific stale claims are
listed in *Common mistakes to avoid*.)

---

## 1. Project overview

AceCSE is a free, honest simulator for the Philippine **Career Service Examination (CSE)**
administered by the Civil Service Commission (CSC), covering both the **Professional** and
**Subprofessional** levels. It is a React/TypeScript web app; the question bank ships as static
JSON under `content/questions/`.

Two product surfaces consume the bank, and they are deliberately different:

| Surface | Purpose | Behaviour |
| --- | --- | --- |
| **Simulation** | Pressure and realism | Timed, no feedback during the exam, one final results page |
| **Practice** | Learning | Untimed by default, instant explanations, answers changeable, free skipping/restart |

The founding philosophy is **"never lie to the user."** No fake data, no inflated question
counts, no fabricated progress, no repeated questions inside a session, no subject relabeling to
fill a blueprint slot. The exam engine samples without replacement and throws
`InsufficientBankError` rather than repeating an item. This honesty principle is why difficulty
labels must be truthful (§10) and why answers must be verified rather than trusted (§21).

### Where content lives (as of 2026-08-05)

```
content/questions/analytical/core.json           81 items
content/questions/clerical/core.json             53 items
content/questions/general-information/core.json  92 items
content/questions/numerical/core.json            93 items
content/questions/verbal/core.json              105 items
                                                ----
                                                424 items
```

There is **no `seed.json`**. The 19 legacy `seed-*` items live inside the five subject files.
Each `core.json` is a JSON array at the root, UTF-8, 2-space indent.

---

## 2. Educational goals

The objective is **the best CSE reviewer available, not the largest question bank.** When quality
and quantity conflict, quality wins every time.

The standard every item must hit:

> A user who answers **incorrectly** must finish reading the explanation feeling smarter than
> before.

That teaching experience is the product's competitive advantage — not item volume. Concretely,
each item is expected to deliver four teaching payloads:

1. **explanation** — the governing rule or mechanism, taught from zero.
2. **steps** (where applicable) — a reproducible procedure the learner can re-run on a new item.
3. **distractorExplanations** — the specific misconception behind each wrong option, so a learner
   who fell for one learns *their own* error, not a generic correction.
4. **tip** — a transferable strategy that pays off on *future* items.

Banned outright: generic AI wording, explanations that repeat each other across items, obvious
throwaway distractors, and trivia with no educational value.

---

## 3. Target audience

- Filipino examinees preparing for the CSE Professional or Subprofessional level.
- Wide ability range: fresh graduates, career shifters, and long-serving government staff.
- Assume the reader has **never formally learned the topic**. Do not assume grade-school algebra
  fluency, familiarity with formal logic vocabulary, or legal training.
- English is the language of instruction. Filipino appears only where the exam itself tests it —
  Filipino vocabulary items exist in Verbal Ability (e.g. `verb-0079`, on *SALAT*). Even there,
  the explanation, distractor notes, and tip are written in **English house voice**, quoting the
  Filipino words themselves.
- Content is set in a Philippine civil-service world: offices, clerks, permits, applicants,
  agencies, peso amounts. Keep that register; it is both realistic and motivating.

Product focus is **Subprofessional first**; Professional is fully supported in the data model.
Both levels must stay authorable.

---

## 4. Professional vs Subprofessional blueprint

Source of truth: `src/config/exam.ts`. Do not restate these numbers from memory elsewhere.

| | Professional | Subprofessional |
| --- | --- | --- |
| Total items | 170 | 165 |
| Duration | 190 min (3 h 10 m) | 160 min (2 h 40 m) |
| Passing mark | 80% | 80% |
| Numerical Reasoning | 40 | 40 |
| Analytical Reasoning | 40 | — |
| Clerical Ability | — | 35 |
| Verbal Ability | 50 | 50 |
| General Information | 40 | 40 |

Official section order per level is defined by `SUBJECTS_BY_LEVEL`:
Professional = Numerical → Analytical → Verbal → General Information.
Subprofessional = Numerical → Clerical → Verbal → General Information.

Scaled simulations (tiers 20 / 50 / 100, plus the full-length exam) derive their subject mix
proportionally using the largest-remainder method, and a tier is offered **only** when every
subject in that level has enough unique supply to fill it without repeats. Practice drills run
10 / 20 / 30 items at 60 seconds per question when timed.

**Authoring consequence:** the bank is supply-constrained per subject, not in aggregate. A tier
unlocks only when the *scarcest* subject can fill its slot. Check per-subject supply against the
blueprint ratio before choosing what to write next.

Supply health as of 2026-08-05 (items in bank ÷ full-length blueprint requirement):

| Subject | Bank | Pro need | Sub need | Coverage |
| --- | --- | --- | --- | --- |
| Verbal Ability | 105 | 50 | 50 | 2.1× |
| Numerical Reasoning | 93 | 40 | 40 | 2.3× |
| General Information | 92 | 40 | 40 | 2.3× |
| Analytical Reasoning | 81 | 40 | — | 2.0× |
| Clerical Ability | 53 | — | 35 | 1.5× |

Clerical Ability is the thinnest subject and the natural priority for new Subprofessional supply.

---

## 5. Supported subjects

Exactly five, from the `Subject` union in `src/types/index.ts`. These strings are enum values —
spelling, spacing, and capitalisation are exact. No new subject may be invented.

| `subject` value | File directory | `examLevel` policy | Count (2026-08-05) |
| --- | --- | --- | --- |
| `Numerical Reasoning` | `numerical/` | `Both` | 93 |
| `Verbal Ability` | `verbal/` | `Both` | 105 |
| `Analytical Reasoning` | `analytical/` | `Professional` or `Both` | 81 |
| `Clerical Ability` | `clerical/` | `Subprofessional` only | 53 |
| `General Information` | `general-information/` | `Both` | 92 |

Observed `examLevel` spread as of 2026-08-05: `Both` 305, `Professional` 66, `Subprofessional` 53.
Every `Professional`-only item is Analytical; every `Subprofessional`-only item is Clerical.
Within Analytical, 66 items are `Professional` and 15 are `Both` (`ana-0041`–`ana-0055`).

---

## 6. Supported topics

`topic` is a free-text string, but it is **effectively a closed vocabulary**: reuse an existing
topic string exactly. Introducing a new topic is a deliberate act (Batch 001 introduced
`Number Theory` and `Exponents and Roots` in Numerical), and it must be justified against the CSC
blueprint, not invented for convenience. Ampersands, commas, and capitalisation are part of the
string — `Grammar & Usage` is not `Grammar and Usage`; `Filing & Alphabetizing` is not
`Filing and Alphabetizing`.

### Numerical Reasoning — 20 topics, 89 distinct subtopics

| Topic | Items |
| --- | --- |
| Percentages | 12 |
| Number Series | 8 |
| Data Interpretation | 7 |
| Fractions | 7 |
| Geometry | 7 |
| Ratio and Proportion | 6 |
| Probability | 5 |
| Averages | 4 |
| Basic Algebra | 4 |
| Distance, Speed, Time | 4 |
| Simple and Compound Interest | 4 |
| Statistics | 4 |
| Work Rate | 4 |
| Decimals | 3 |
| Mixture Problems | 3 |
| Money and Finance | 3 |
| Number Theory | 3 |
| Age Problems | 2 |
| Exponents and Roots | 2 |
| Order of Operations | 1 |

### Verbal Ability — 6 topics, 49 distinct subtopics

| Topic | Items |
| --- | --- |
| Grammar & Usage | 37 |
| Vocabulary | 26 |
| Reading Comprehension | 14 |
| Paragraph Organization | 11 |
| Sentence Completion | 10 |
| Error Identification | 7 |

### Analytical Reasoning — 5 topics, 76 distinct subtopics

| Topic | Items |
| --- | --- |
| Number and Letter Pattern | 20 |
| Logical Reasoning | 19 |
| Ordering and Arrangement | 16 |
| Assumption and Conclusion | 13 |
| Word Analogy | 13 |

### Clerical Ability — 4 topics, 50 distinct subtopics

| Topic | Items |
| --- | --- |
| Filing & Alphabetizing | 21 |
| Spelling | 13 |
| Clerical Operations | 11 |
| Office Procedures & Correspondence | 8 |

### General Information — 9 topics, 42 distinct subtopics

| Topic | Items |
| --- | --- |
| 1987 Constitution | 38 |
| RA 6713 Code of Conduct | 17 |
| Environment Management and Protection | 12 |
| Human Rights and Peace | 7 |
| Philippine History | 7 |
| Philippine Government Structure | 4 |
| Philippine Culture and National Symbols | 3 |
| Philippine Geography | 3 |
| Philippine Economics and Taxation | 1 |

Note the subtopic granularity: Analytical averages ~1.07 items per subtopic and Numerical ~1.04.
**Subtopics are descriptive, not categorical** — they name the specific skill an item exercises
("Perimeter from Area", "Sequencing with an Immediacy Constraint", "Nothing Before Something"),
so a fresh, precise subtopic string per item is normal and correct. Topic is the closed
vocabulary; subtopic is the fine-grained label.

---

## 7. Classification rules

### 7.1 Blueprint fidelity — what belongs at all

Official CSC coverage bounds the bank:

- **General Information:** Philippine Constitution; RA 6713 Code of Conduct; peace and human
  rights issues and concepts; environment management and protection. The bank also carries
  Philippine history, geography, culture/national symbols, government structure, and basic
  taxation as **accepted extensions**.
- **Analytical Ability:** word association, identifying assumptions and conclusions, logic, data
  interpretation, numerical computation.

**Reject as off-blueprint:**

- Pure basic-science trivia (human organs, photosynthesis, conservation of mass). Batch 001
  rejected these.
- Figural/spatial reasoning (rotating arrows, shape sequences, odd-figure-out). Doubly
  disqualified: off-blueprint *and* unrenderable, because AceCSE questions are text-only and the
  schema has no image field.
- Borderline science is acceptable **only** when it directly supports an existing blueprint
  strand. `gen-0089` (atmospheric composition) was accepted because it feeds the RA 8749
  clean-air strand; the explanation makes that connection explicit.

### 7.2 Non-obvious taxonomy rules

These caused real reclassifications and are binding:

1. **Word analogy is Analytical Reasoning, not Verbal Ability.** Source exams routinely print
   analogy items in the verbal section. AceCSE files them under `Analytical Reasoning`, topic
   `Word Analogy` (see `ana-0065`, `ana-0066`, `ana-0078`).
2. **Assumption/conclusion evaluation is Analytical Reasoning** — even when the source wraps it
   in a short reading stimulus. The test is the *skill*, not the format:
   - Drawing or evaluating a logical conclusion, or identifying an unstated premise
     → `Analytical Reasoning` / `Assumption and Conclusion` (see `ana-0076`, `ana-0077`, both
     lifted from a source exam's verbal section).
   - Extracting meaning, main idea, or details from a passage
     → `Verbal Ability` / `Reading Comprehension`.
3. **Spelling and alphabetical filing are Clerical Ability**, which is Subprofessional-only.
   A spelling item therefore *cannot* be imported from a Professional-only source as a
   Professional item. Either file it as Clerical with `examLevel: "Subprofessional"`, or reject it.
4. **`examLevel` follows the CSC blueprint, not the source exam's label.** No exceptions:

   | Subject | Permitted `examLevel` |
   | --- | --- |
   | `Clerical Ability` | `Subprofessional` (never `Professional` — not tested at Pro level) |
   | `Analytical Reasoning` | `Professional` or `Both` (never `Subprofessional`) |
   | `Numerical Reasoning` | `Both` |
   | `Verbal Ability` | `Both` |
   | `General Information` | `Both` |

   When an Analytical item is genuinely accessible at both levels the bank uses `Both`
   (`ana-0041`–`ana-0055`); when it comes from a Professional mock or demands Professional-level
   abstraction, use `Professional`. Default to `Professional` when unsure.

### 7.3 Choosing topic and subtopic

- Pick the topic that names the **skill being tested**, not the surface dressing. A word problem
  about a budget that is really a percentage-change exercise is `Percentages`, not
  `Money and Finance`.
- `Money and Finance` is for items where the money mechanics *are* the skill (currency handling,
  budgeting); a peso sign alone does not make an item financial.
- Subtopic should be specific enough that reading it alone tells you the item's exact skill.
  Good: "Reverse Percentage from a Complement", "Universal Negative with a Particular Premise".
  Bad: "Word Problems", "Logic".

---

## 8. Naming conventions

| Element | Convention | Example |
| --- | --- | --- |
| Subject directory | lowercase, hyphenated, matches the subject | `general-information/` |
| Baseline content file | `core.json`, one per subject — the historical accumulation | `verbal/core.json` |
| New batch file | `YYYY-MM-DD-HHMM-<descriptive-name>.json` — see §8.1 | `verbal/2026-08-05-1430-jvc-professional-mock.json` |
| `subject` | exact enum string, Title Case | `Analytical Reasoning` |
| `topic` | Title Case, reuse existing string verbatim | `Grammar & Usage` |
| `subtopic` | Title Case, descriptive phrase; en dash for a qualifier | `Suffix Vowel Error — -ance` |
| `tip.label` | Title Case, from the closed set only | `Common Mistake` |
| `difficulty` | `Easy` \| `Medium` \| `Hard` | — |
| `examLevel` | `Professional` \| `Subprofessional` \| `Both` | — |
| Option ids | uppercase `A`,`B`,`C`,`D`, in that order | — |

Batch working files live **outside** the repository and follow `work_<subject>.md` for work orders
and `out_<subject>.json` for the authored output.

### 8.1 Batch file naming — official standard

**New question batches are never appended directly to `core.json`.** Every imported batch is
committed as its own JSON file inside the relevant subject directory, named:

```
YYYY-MM-DD-HHMM-<descriptive-name>.json
```

| Segment | Meaning | Rule |
| --- | --- | --- |
| `YYYY-MM-DD` | date the batch was processed | zero-padded |
| `HHMM` | 24-hour time the batch was generated | zero-padded, no colon |
| `<descriptive-name>` | where the questions came from — source, exam name, review centre, OCR file, PDF title, social post | lowercase kebab-case, short but meaningful |

Filename rules, all mandatory:

- lowercase only
- kebab-case only
- no spaces
- no underscores
- no special characters except hyphens
- `.json` extension

Conforming examples:

```
content/questions/verbal/2026-08-05-1430-jvc-professional-mock.json
content/questions/numerical/2026-08-06-0900-cse-review-book-1.json
content/questions/general-information/2026-08-06-2015-facebook-public-questions.json
content/questions/analytical/2026-08-07-0930-csc-review-center-set-a.json
content/questions/clerical/2026-08-08-2130-facebook-group-set-4.json
content/questions/verbal/2026-08-09-1800-ocr-book-volume-1.json
content/questions/numerical/2026-08-10-1030-ocr-practice-test-a.json
```

Non-conforming — do not do this: `Batch_2.json`, `verbal-new.json`, `2026_08_05_batch.json`,
`2026-8-5-1430-mock.json` (segments not zero-padded), `2026-08-05-1430-JVC-Mock.json` (uppercase),
`2026-08-05-jvc-mock.json` (missing `HHMM`).

**Why this is the standard:**

- **Preserves Git history.** A new file is an addition, so `git log --follow` on a batch file shows
  that batch's entire life. Appending 93 items to a 3,000-line `core.json` buries them in a diff
  nobody can review.
- **Makes every import traceable.** The filename alone answers when a batch landed and where it
  came from, without consulting a commit message or an external log.
- **Identifies the source immediately.** Provenance is part of the path, which matters when a
  source later turns out to be unreliable and its items need auditing as a group.
- **Avoids merge conflicts.** Two batches prepared in parallel touch two different files and merge
  cleanly; two batches appending to the same `core.json` conflict on the closing bracket every time.
- **Allows multiple AIs to generate batches independently.** Different models, or different subject
  agents in the same run, can each emit their own file with no coordination and no shared write lock.
- **Makes reviewing and reverting easy.** Reviewing a batch is opening one file. Reverting one is
  deleting one file — not surgically extracting 93 objects from a merged array.
- **Keeps `core.json` stable.** A file that rarely changes is a file whose diffs are meaningful, and
  it stops being a perpetual source of churn and conflict.

**Mechanics — no code change is required.** `src/data/questionBank.ts` discovers content with
`import.meta.glob('../../content/questions/**/*.json', { eager: true })`, and
`scripts/validate-questions.mjs` walks the same tree recursively, so a correctly placed batch file is
loaded and validated automatically the moment it exists.

Two loader behaviours are worth knowing:

1. Files are loaded in path order (`localeCompare`), and a date-prefixed filename sorts **before**
   `core.json` because digits precede letters. Ordering has no effect on exam generation, which
   samples the whole bank, but it does decide which copy of a duplicated id survives: the loader
   keeps the **first** id it sees and drops later ones with a dev-only warning.
2. That silent drop is backstopped by the build validator, which treats a duplicate id as a **fatal**
   error. So if a merge maintenance pass copies items into `core.json` and forgets to delete the
   batch file, `npm run validate:questions` fails loudly rather than shipping a half-shadowed bank.

**Hazard.** The glob ships *anything* under `content/questions/`. Only validated, accepted batches
belong there. Staging output, rejected items, and backups must live outside that tree — see the
pipeline doc's Stage 10.

For the end-to-end operating procedure and the periodic consolidation task, see
`CONTENT_PIPELINE.md`.

---

## 9. ID conventions

Format: `<prefix>-NNNN`, where `NNNN` is **zero-padded to exactly four digits**.

| Subject | Prefix | Highest used | **Next free id** |
| --- | --- | --- | --- |
| Analytical Reasoning | `ana-` | `ana-0078` | **`ana-0079`** |
| Clerical Ability | `cler-` | `cler-0050` | **`cler-0051`** |
| General Information | `gen-` | `gen-0089` | **`gen-0090`** |
| Numerical Reasoning | `num-` | `num-0088` | **`num-0089`** |
| Verbal Ability | `verb-` | `verb-0100` | **`verb-0101`** |

*(Next-free values are as of 2026-08-05. Always recompute from the live files before assigning —
another batch may have landed.)*

Rules:

- **Ids are globally unique and permanent.** The validator fails on duplicates across all files.
- **Never reuse an id, ever** — not even one whose item was deleted. Attempt records in Firestore
  reference question ids; reusing one silently corrupts a user's history.
- **Never renumber** existing items.
- Assign ids **sequentially with no gaps** within a batch, continuing from the current maximum
  for that subject.
- **Legacy `seed-*` ids exist but are not the pattern to continue.** Nineteen items carry ids of
  the form `seed-ana-001`, `seed-num-004`, `seed-verb-005`, etc. (3 analytical, 3 clerical,
  3 general, 5 numerical, 5 verbal). They are original scaffold content, are valid, and must not
  be renamed — but no new item may use that shape. Note that they are excluded from the
  four-digit numbering, so `verb-0100` really is the highest verbal number even though 105 verbal
  items exist.
- Every id must match `^(ana|cler|gen|num|verb)-\d{4}$` for new content.

---

## 10. Difficulty calibration

`difficulty` is `Easy` | `Medium` | `Hard`. Current spread as of 2026-08-05:

| | Easy | Medium | Hard | Total |
| --- | --- | --- | --- | --- |
| Bank | 130 (30.7%) | 214 (50.5%) | 80 (18.9%) | 424 |
| Target | ~25% | ~50% | ~25% | — |
| Analytical | 26 | 37 | 18 | 81 |
| Clerical | 17 | 25 | 11 | 53 |
| General Information | 29 | 53 | 10 | 92 |
| Numerical | 32 | 42 | 19 | 93 |
| Verbal | 26 | 57 | 22 | 105 |

The bank is short on Hard items overall, and General Information is the most skewed
(10 Hard out of 92). **Future sourcing should favour Hard**, especially in General Information.

### The honesty rule

> Difficulty must reflect **actual solving effort**, never be inflated to hit a distribution
> quota.

Batch 001 came out Easy 41 / Medium 48 / Hard 4 because the source was an entry-level mock. The
labels were left honest and the skew was **reported** rather than papered over. If a batch is
easy, say so in the batch report and fix it by sourcing harder material next time — never by
relabelling. Mislabelling difficulty breaks the analytics the learner uses to decide what to
study, which is a direct violation of the "never lie to the user" principle.

### What each level actually looks like in this bank

**Numerical Reasoning**

| Level | Test | Example |
| --- | --- | --- |
| Easy | One operation, or a formula applied directly with no setup | `num-0085` "Three consecutive integers have a sum of 96. What is the largest integer?" |
| Medium | Two chained steps, or one step plus a conceptual trap | `num-0079` area → missing width → perimeter; `num-0084` successive +20% then −20% |
| Hard | Three or more steps, or a principle most examinees have not met | `num-0087` modular remainders (7k+4 doubled); `num-0080` equal perimeters, unequal areas; `num-0065` dependent probability without replacement |

**Verbal Ability**

| Level | Test | Example |
| --- | --- | --- |
| Easy | One rule, one clear signal, no competing plausible reading | `verb-0093` MITIGATE = lessen; `verb-0097` formal-register choice |
| Medium | A rule with a well-known exception, or a distractor set where two options are defensible until the rule is applied | `verb-0096` "Ten kilometers **is**"; `verb-0099` inference from "Speed is not enough…" |
| Hard | Multi-error sentence correction, or idiomatic/collocational knowledge that cannot be derived from a rule | `verb-0061`, `verb-0062` (Sentence Correction); `verb-0065` idiomatic prepositions |

**Analytical Reasoning**

| Level | Test | Example |
| --- | --- | --- |
| Easy | One inference, one pattern, or a relationship nameable in a sentence | `ana-0071` 3×3 grid +2 per row; `ana-0078` BLUEPRINT : BUILDING :: OUTLINE : ESSAY |
| Medium | Two constraints to combine, or a distractor that overreaches by a quantifier | `ana-0073` confounding variable; `ana-0077` "Some" vs "All" in a required assumption |
| Hard | A constraint set requiring a technique (block welding, exhaustive search) or a logical form that reverses direction | `ana-0064` immediacy constraint; `ana-0075` "Only A may B" → "If B, then A" |

**Clerical Ability**

| Level | Test | Example |
| --- | --- | --- |
| Easy | A single filing rule or a common misspelling | `cler-0034` `-ance` suffix; `seed-cler-002` double consonants |
| Medium | Multi-word comparison, or an office procedure with an ordering | `cler-0049` PDS/CS Form 212 entry; `cler-0050` outgoing-correspondence sequence |
| Hard | A composite coding system, or a spelling pair distinguished only by meaning in context | `cler-0044`, `cler-0045` alphanumeric date/document codes; `cler-0048` confusable clerical words |

**General Information**

| Level | Test | Example |
| --- | --- | --- |
| Easy | A headline fact any reviewer covers | `gen-0087` RA 8749 = Clean Air Act; `gen-0085` why the Katipunan was founded |
| Medium | A named provision applied to a described situation, or two adjacent norms/branches to distinguish | `gen-0083` "efficient use of resources" → commitment to public interest, not simple living; `gen-0088` waste hierarchy |
| Hard | Subsection-level statutory detail, or an enumeration where an insider distinction decides it | `gen-0048` ECC requirement under RA 9003; `gen-0050` DOE/DENR emission-standard mandate under RA 8749; `gen-0076` grounds for impeachment |

Rule of thumb: if a competent reviewer who has studied the topic once would answer correctly in
under 15 seconds, it is Easy. If they need to apply a named rule deliberately, Medium. If they
would plausibly get it wrong on the first pass despite knowing the topic, Hard.

---

## 11. Question writing standards

The stem (`question`) carries the item. Requirements:

- **Minimum 10 characters** (validator). Observed medians as of 2026-08-05: Numerical 96 chars,
  Verbal 80, Analytical 75, Clerical 96, General Information 125.
- **Self-contained.** Everything needed to answer is in `question` plus `passage`. Never refer to
  "the diagram", "the figure above", or another item.
- **One question per item.** No compound "Which is true and what follows?" stems.
- **Ask for exactly one thing, unambiguously.** If the answer depends on an assumption not stated,
  state the assumption (`num-0081` explicitly says "Using π = 22/7").
- **Emphasise the pivot word in CAPS** where the item hinges on it — the house pattern uses caps
  for the target word in vocabulary items (`verb-0080` "opposite in meaning to METICULOUS"), for
  negations ("which does NOT belong"), and for correctness polarity ("spelled CORRECTLY" /
  "spelled INCORRECTLY", `cler-0047`). This is not decoration; it prevents a real misread.
- **No trick questions.** Difficulty comes from genuine conceptual depth, never from ambiguous
  phrasing or a hidden double negative.
- **Philippine civil-service setting.** Applicants, clerks, permits, records rooms, agencies,
  peso amounts. It grounds the item and matches the real exam's register.
- **Original wording.** Never copy a source exam's sentence verbatim. Re-author the item.

### Shared stem templates are house style

Multiple items may legitimately read *"Which of the following words is spelled correctly?"* or
*"What is the next number in the series: …"*. The stem is a **template**; the content differs.
**Reuse the canonical stem** rather than inventing a paraphrase — a fresh paraphrase for each item
makes the bank read as inconsistent and gains nothing. This is not duplication (§22).

### Passages

`passage` is optional and appears on 37 of 424 items (as of 2026-08-05): Analytical 15,
Verbal 12, Numerical 6, Clerical 4, General Information 0.

- Use it only when the item genuinely needs a stimulus: a reading passage, a described data
  table, or a puzzle setup.
- **In the JSON, `passage` is placed immediately before `question`** — this is the observed
  house order in all 37 passage items.
- If two items share the same stimulus, **repeat the full passage text in both items.** Items are
  sampled independently, so a learner may see one without the other. `verb-0090`/`verb-0091` and
  `num-0088` follow this.
- Observed passage lengths: Verbal median 625 chars (max 701), Clerical median 373,
  Analytical median 216, Numerical median 205. Verbal reading passages are the long ones;
  data-table and puzzle setups are short and dense.

---

## 12. Grammar standards

The bank is a grammar reviewer; its own prose must be flawless.

- **Standard American English**, matching CSC exam usage. `organize`, `analyze`, `center`.
- Philippine proper nouns and legal titles keep their official form:
  *Commission on Audit*, *Sangguniang Bayan*, *Republic Act No. 9003*.
- **Serial (Oxford) comma** in lists of three or more.
- Subject–verb agreement, parallel structure, and modifier placement in explanations are
  non-negotiable — a dangling modifier inside an explanation of dangling modifiers is a
  humiliating and shipped-to-users defect.
- Sentence case for all prose; Title Case only for labels, topics, and proper nouns.
- Numbers: spell out one through nine in prose ("three consecutive integers"); use digits for
  quantities, measurements, currency, percentages, dates, and anything computational.
- No exclamation marks. No rhetorical questions in explanations.
- Every distractor note and step is a **complete sentence** ending in a period.

---

## 13. Wording standards (house voice)

The house voice is a calm, precise, expert tutor. Confident where the answer is certain, honest
where a subtlety exists.

### Typographic characters — use the real ones

The bank uses real Unicode, not ASCII substitutes. Observed usage as of 2026-08-05:
em dash `—` 1,438 occurrences, en dash `–` 236, `₱` 593, `×` 658, `÷` 256, `²` 147, `≈` 42,
`³` 28, `°` 27, `½` 14, `…` 14, `¾` 7, `√` 7, `∛` 3.

| Use | Character | Not |
| --- | --- | --- |
| Parenthetical break, appositive | `—` (em dash, unspaced or spaced per context) | `--` |
| Ranges, compound modifiers, subtopic qualifiers | `–` | `-` |
| Peso | `₱2,400` | `P2400`, `PHP 2400` |
| Multiplication / division | `×` `÷` | `*` `/` |
| Exponents, roots, fractions | `2⁵`, `cm²`, `√0.0081`, `∛125`, `¾`, `½` | `2^5`, `cm2`, `sqrt()` |
| Degrees, approximation, ellipsis | `°`, `≈`, `…` | `deg`, `~`, `...` |

Curly quotes appear in some analytical stems (`ana-0073`, `ana-0075`) where a rule or claim is
quoted. Straight quotes are more common overall. **Be internally consistent within an item** and
match the neighbouring items in the file you are appending to.

### Forbidden phrasings

Never write any of these:

- "It is important to note that…"
- "Let's break this down."
- "Simply put…" / "In essence…" / "At its core…"
- "This is incorrect." (as a whole distractor note)
- "The correct answer is X." (as a whole distractor note)
- "Great question!" or any address to the reader as a chat partner.
- Hedging where the answer is certain: "generally", "usually", "it could be argued".
  Hedge only where the subject matter genuinely is hedged, and then say *why*.
- The same sentence pattern opening three items in a row. Vary the entry point.

### Positive markers of house voice

- Name the rule, then apply it.
- Pre-empt the error: *"Notice that subtracting the whole parts separately forces a borrow, which
  is where most examinees lose the item."*
- Compressed contrast pairs (the house favourite, see §17).
- Concrete verification: *"Verify: 0.09 × 0.09 = 0.0081."*
- Honest acknowledgement of a real subtlety, then resolution. `verb-0095` concedes that "effect"
  *can* be a verb meaning "to bring about", then explains why "affect" is nonetheless required
  after the modal "will".

---

## 14. Distractor philosophy

Distractors are teaching instruments, not filler. **Every wrong option must be the output of a
specific, nameable mis-procedure that a real examinee would actually perform.**

Design rules:

- **Each distractor encodes one distinct error.** Three wrong options = three different
  misconceptions, not three flavours of "not the answer".
- **Distractors must be plausible.** An option nobody would choose teaches nothing and wastes a
  slot. If you cannot name the error that produces an option, replace the option.
- **Parallel form.** All four options share grammatical structure, comparable length, and the same
  unit/format. A conspicuously longer or more qualified option is a giveaway.
- **No "All of the above" / "None of the above."** They are absent from the bank; keep them out.
- **Common distractor families in Numerical:** the value asked for in the *previous* step
  (`num-0067`: 225 is the amount distributed, not the amount remaining); the correct number with
  a decimal/sign slip; the right procedure with the wrong denominator (`num-0072`: dividing by
  the new value instead of the original); the complementary formula (`num-0081`: 154 is the area,
  not the circumference); the answer to the inverse operation.
- **In Analytical:** quantifier overreach ("All" where the premises support only "Some"),
  direction reversal (converse instead of the implication), a restated premise offered as a new
  conclusion, and a statement that directly contradicts a premise.
- **In Verbal:** near-synonyms clustered so that the odd one out is the answer (`verb-0080` —
  *thorough*, *precise*, *methodical* are all near-synonyms of METICULOUS; *careless* is the
  antonym), and the "sounds right, breaks the rule" option.
- **In General Information:** the sibling statute, the adjacent norm, the neighbouring
  constitutional article, the plausible-but-wrong office.

### Writing the `distractorExplanations` note

Structure: **why this option is tempting → the precise error → what the right move was.**

Length: minimum 20 characters (validator). House medians as of 2026-08-05 — General Information
196, Numerical 160, Verbal 157, Analytical 113, Clerical 125. **Aim 90–220 characters.**

These notes render in the app prefixed with **"Your choice."** when the learner selected that
option, so each note must read well standalone and must never begin with "This option" or
reference "the other choices".

Real example, `num-0087` option D:

> "8 doubles the remainder but stops one step early. A remainder must be smaller than the
> divisor, so 8 must give up a full 7, leaving 8 − 7 = 1."

That note names the tempting move, names the violated principle, and completes the correction.

**The correct option's letter must never appear as a key** in `distractorExplanations` — the
validator rejects it. Exactly the three wrong letters, no more, no fewer.

---

## 15. Premium explanation philosophy

`explanation` is the product. It is what a learner reads after getting an item wrong, and it is
the sole reason to choose AceCSE over a free PDF of past questions.

**Hard gate:** ≥ 100 characters. **House target: 400–700 characters.**

Observed medians as of 2026-08-05:

| Subject | Min | Median | Max |
| --- | --- | --- | --- |
| General Information | 479 | 609 | 795 |
| Verbal Ability | 431 | 586 | 777 |
| Clerical Ability | 320 | 539 | 1,261 |
| Numerical Reasoning | 370 | 509 | 634 |
| Analytical Reasoning | 175 | 494 | 669 |

Bank-wide the median sits near 540. An explanation under 300 characters is almost certainly
restating the answer rather than teaching; one over 800 has usually stopped being an explanation
and become a lecture. The 1,261-character clerical outlier is not a model to imitate.

### The four moves of a house explanation

1. **Name the governing rule, law, formula, or mechanism.** Not "D is correct because 55.925 is
   the sum" but "Decimal addition requires place-value alignment; pad to the longest decimal
   before adding."
2. **Apply it to this item**, showing the decisive move.
3. **Pre-empt the specific error** the examinee is about to make, or just made. This is the move
   that separates AceCSE from a solutions manual.
4. **Generalise** — state what transfers to the next item of this type.

### Assume zero prior knowledge

Define the term before using it. If the explanation says "confounding variable", it must also say
what one is. `ana-0073` does exactly this: it names the confound, explains that a rival cause
introduced simultaneously makes attribution impossible, and then generalises to "the standard way
to attack a causal claim is to find an alternative explanation for the same effect."

### Never repeat yourself across items

Two items on subject–verb agreement must not share an explanation skeleton. Repetition across a
batch is the single most detectable AI tell, and it is explicitly banned. Before finalising a
batch, read your explanations consecutively and rewrite any that rhyme with each other.

### Teach the whole set when the set is small

Where an item picks one member from a short enumerated list, the explanation should teach the
whole list. `gen-0084` enumerates all eight RA 6713 norms; `ana-0066` names the instrument for
every distractor (hygrometer, anemometer, rain gauge, altimeter) so the learner leaves with a
complete set rather than one fact.

---

## 16. Reasoning steps standards

`steps` is an array of strings, each ≥ 3 characters, **minimum 2 entries** when present
(validator). Observed: median 4 entries per item across every subject that uses steps.

### When steps are REQUIRED, optional, or omitted

The validator's `needsSteps()` rule is:

```js
if (q.subject === 'Numerical Reasoning') return true;
if (q.subject === 'Analytical Reasoning' && !/analog/i.test(q.topic ?? '')) return true;
return false;
```

| Subject | Status | Practice as of 2026-08-05 |
| --- | --- | --- |
| Numerical Reasoning | **REQUIRED — every item** | 93/93 |
| Analytical Reasoning, topic *not* matching `/analog/i` | **REQUIRED** | all such items |
| Analytical Reasoning, topic `Word Analogy` | Validator-exempt; **omit** | 78/81 overall have steps; the three newest analogy items (`ana-0065`, `ana-0066`, `ana-0078`) correctly omit them. Ten older analogy items carry steps — legacy, do not imitate |
| Verbal Ability | Optional; **use only for `Paragraph Organization`** | 11/105 — every one is a Paragraph Organization item (`verb-0037`–`verb-0042`, `verb-0087`–`verb-0089`, `verb-0100`, `seed-verb-004`) |
| Clerical Ability | Optional; use for multi-comparison filing and coding items | 30/53 — Filing & Alphabetizing 21, Clerical Operations 7, Office Procedures 2. Spelling items never carry steps |
| General Information | **Omit entirely** | 0/92 |

Note the validator floor is 2 entries but the bank's floor in practice is 3 for Analytical and
Clerical and 2 for Numerical. Three to five entries is the norm everywhere.

### Prefix style differs by subject — match your file

This is the most commonly botched convention. The observed corpus, not any prior brief, is
authoritative:

| Subject | Prefix | Evidence |
| --- | --- | --- |
| **Analytical Reasoning** | `"Step N: "` — colon | 74 of 78 stepped items |
| **Verbal Ability** | `"Step N — "` — em dash | 11 of 11 stepped items |
| **Numerical Reasoning** | **unprefixed** — plain sentences | 93 of 93 |
| **Clerical Ability** | mixed: 18 use `"Step N — "`, 12 unprefixed | Prefer `"Step N — "` for new reasoning items; unprefixed is acceptable for short mechanical sequences |

Real examples:

```
Analytical (ana-0075):
  "Step 1: Identify the logical role of 'only': it marks clearance as a necessary
   condition for entry, not a sufficient one."

Verbal (verb-0100):
  "Step 1 — Identify the pattern. Both sentences state benefits of reliable public
   data, and 'also' in the second marks addition, not contrast."

Numerical (num-0087):
  "Express the number using the divisor: it has the form 7k + 4."
```

Four analytical items (`ana-0067`, `ana-0068`, `ana-0069`, `ana-0071`) use unprefixed steps —
these are the purely computational analytical items, where numerical style leaked in. Acceptable
precedent for a pure-computation analytical item; for reasoning items use `"Step N: "`.

### Content rules for steps

- **One discrete operation per entry.** If an entry contains two operations, split it.
- **Full sentences**, arithmetic shown inline: `"Double it: 2(7k + 4) = 14k + 8."`
- **The final entry restates the answer** in words, closing the loop:
  `"Test a concrete case to confirm: 11 → 22, and 22 ÷ 7 = 3 remainder 1. The remainder is 1."`
  / `"Step 5 — Option C is the concluding sentence."`
- Steps must be **reproducible**: a learner following them on a fresh item of the same type must
  reach the right answer. They are a procedure, not a narration.
- Do not restate the explanation. Steps are the *how*; the explanation is the *why*.
- Observed entry lengths: Verbal median 170 chars (steps are prose reasoning), Analytical 82,
  Clerical 61, Numerical 51 (steps are terse computation).

---

## 17. Tip writing standards

`tip` is `{ label, text }`. Both required; `text` ≥ 10 characters (validator).
**House target for `text`: 100–220 characters.** Observed medians as of 2026-08-05 —
Analytical 183, General Information 177, Clerical 173, Verbal 172, Numerical 162.

### The closed label set

Fifteen labels. **Do not invent new ones.**

| Label | Bank count | Typical use |
| --- | --- | --- |
| `Exam Tip` | 87 | Any subject; strategy under time pressure |
| `Remember` | 43 | A fact or rule worth memorising |
| `Common Mistake` | 37 | Naming the error trap directly |
| `Grammar Rule` | 33 | Verbal grammar items |
| `Pattern Recognition` | 26 | Analytical sequences, series |
| `Logic Rule` | 26 | Syllogisms, conditionals |
| `Formula` | 26 | Numerical |
| `Law Reminder` | 26 | RA/statute items |
| `Math Shortcut` | 23 | Numerical |
| `Constitution Reminder` | 23 | 1987 Constitution items |
| `Vocabulary Trick` | 20 | Verbal vocabulary |
| `Mnemonic` | 16 | Memory device for a list |
| `Filing Rule` | 15 | Clerical filing |
| `Spelling Pattern` | 12 | Clerical spelling |
| `Historical Note` | 10 | Philippine history |

**Known defect:** `ana-0006` uses `"Degree of Intensity"`, which is outside the set. It is the
single violation in the bank. Do not treat it as precedent and do not silently fix it (§28).

Practical label affinities: Numerical leans `Formula`/`Math Shortcut`; Verbal leans
`Grammar Rule`/`Vocabulary Trick`; Analytical leans `Logic Rule`/`Pattern Recognition`; General
Information leans `Law Reminder`/`Constitution Reminder`/`Mnemonic`; Clerical leans
`Filing Rule`/`Spelling Pattern`.

### What a tip must be

**A reusable strategy that helps on a FUTURE item — never a restatement of this one.**

The house favourite is the **compressed contrast pair**. `gen-0003`:

> "Senate = 6 years, max 2 consecutive terms (12 years total before rest). House = 3 years, max 3
> consecutive terms (9 years total). Both = 24 senators, up to 250+ representatives."

Other valid tip shapes:

- A procedure: `num-0087` — "For remainder items, substitute the smallest number that fits
  (remainder 4 on ÷7 → use 11), then re-test with a second one such as 18. Keep every remainder
  below the divisor."
- A discriminating test: "Political neutrality is about *whom* you serve equally; professionalism
  is about *how* competently you serve."
- A sanity check: "Dividing by a number less than 1 must produce a *larger* result."
- A mnemonic for a closed list.

Failing tips, which must be rewritten: "Remember that 55.925 is the answer"; "Always read the
question carefully"; "Practice makes perfect."

---

## 18. References and citations

`reference` is optional in the schema but **mandatory by subject policy in General Information**.

| Subject | Coverage (2026-08-05) | Policy |
| --- | --- | --- |
| General Information | 92/92 | **MANDATORY on every item** |
| Verbal Ability | 50/105 | Grammar-rule label; required on grammar/usage/error items, omitted on vocabulary and reading items |
| Clerical Ability | 24/53 | ARMA/CSC citation on Filing & Alphabetizing (16/21) and Office Procedures (8/8); omitted on Spelling and Clerical Operations |
| Numerical Reasoning | 0/93 | **Omit the field entirely** |
| Analytical Reasoning | 0/81 | **Omit the field entirely** |

### General Information — house citation formats

```
1987 Constitution, Art. XI, Sec. 1
1987 Constitution, Art. IX-B, Sec. 2(1)
1987 Constitution, Arts. VI, VII, VIII
RA 6713, Sec. 4(A)(d)
RA 8749 (Philippine Clean Air Act of 1999)
RA 9003 (Ecological Solid Waste Management Act of 2000), Sec. 2
National Internal Revenue Code (NIRC), Sec. …
1987 Constitution, Art. II, Sec. 16; Oposa v. Factoran
1987 Constitution, Art. III; UDHR, Art. 5
```

Conventions: `Art.` and `Sec.` abbreviated with periods; article numbers in Roman numerals;
subsections in parentheses in statutory order `Sec. 4(A)(c)`; compound citations joined with a
semicolon; a statute's popular title in parentheses after its RA number. No trailing period in
General Information references.

Non-statutory General Information items still carry a reference — an authority or a factual
basis, not a bare fact:

```
Philippine History: Act of the Proclamation of Independence of the Filipino People, 12 June 1898, Kawit, Cavite
National Historical Commission of the Philippines …
Atmospheric composition: dry air is approximately 78% nitrogen, 21% oxygen, 0.93% argon, and 0.04% carbon dioxide
Philippine Statistics Authority (PSA); …
```

### Verbal Ability — the grammar-rule label

In Verbal, `reference` is **not a citation**. It is a named grammar rule, which the app surfaces
as the rule the item tests. Format: `Rule Name: clarifying gloss`.

```
Subject-Verb Agreement: "the number of" takes a singular verb; "a number of" takes a plural verb
Possessive Apostrophes: a plural noun already ending in -s takes only an apostrophe
Double Negatives: "barely", "hardly", and "scarcely" already carry negative force
Pronoun Case: Subject vs. Object pronouns
Latin-derived plurals: datum/data, criterion/criteria, phenomenon/phenomena
Future Perfect Tense: expressing completion before a future reference point
```

Distribution by topic: Grammar & Usage 34, Error Identification 7, Vocabulary 5,
Sentence Completion 3, Reading Comprehension 1. Omit it when no rule can be honestly named.

### Clerical Ability — ARMA and CSC citations

```
ARMA International Filing Rules, Rule 1 (Letter-by-Letter).
ARMA International Filing Rules, Rule 2 (Same Surnames).
ARMA International Filing Rules, Rule 4 (Nothing Before Something).
ARMA Rule 7 (Hyphens in Personal Names).
ARMA Rule 10 (Numbers in Business Names).
ARMA Rule 11 (Government Names); CSC Records Management Guidelines.
CSC MC No. 1, s. 2017 (Revised Personal Data Sheet); CSC Form 212 Instructions.
Administrative Code of 1987; CSC Rules on Deadlines for Official Correspondence.
```

Note that clerical references **do** end with a period, unlike General Information. Match the
file you are appending to.

### Verification and the VERIFY escape hatch

- Verify every legal or constitutional citation against a primary source: lawphil.net, the
  Supreme Court E-Library, csc.gov.ph, DENR-EMB for environmental statutes.
- **Never invent a section number.** If you cannot verify a provision with confidence, write the
  explanation without the citation and set `"reference": "VERIFY"`, then flag it in the batch
  report so the orchestrator resolves it before the batch is landed. `VERIFY` must never survive
  into a committed batch file or `core.json`.
- If a supplied citation looks wrong, set `"reference": "VERIFY"` and report it. Do not silently
  change a citation you were given.

---

## 19. Tag standards

`tags` is a required array of strings. **Per-subject consistency outranks global consistency.**
New questions match the tag convention of *their own subject file*.

| Subject | Convention | Real examples | Tags/item (min–avg–max) | Distinct tags |
| --- | --- | --- | --- | --- |
| General Information | lowercase space-separated phrases; statutes/acronyms keep real capitalisation | `constitution`, `bill of rights`, `norms of conduct`, `RA 6713`, `RA 8749`, `CHR`, `COA`, `Jose Rizal` | 3 – 4.4 – 7 | 198 |
| Verbal Ability | kebab-case lowercase | `subject-verb-agreement`, `context-clues`, `formal-register`, `civic-context` | 2 – 2.8 – 4 | 87 |
| Numerical Reasoning | kebab-case lowercase, **except established uppercase acronyms** | `word-problems`, `percentage-change`, `LCM`, `GCF`, `PEMDAS` | 2 – 3.0 – 5 | 106 |
| Clerical Ability | kebab-case, but proper nouns and form names keep capitalisation | `filing`, `nothing-before-something`, `letter-by-letter`, `Filipino-surnames`, `ARMA-rules`, `CS-Form-212`, `Dela`, `Sta.` | 3 – 4.6 – 7 | 109 |
| Analytical Reasoning | kebab-case lowercase **plus the difficulty as a tag** | `syllogism`, `undistributed-middle`, `word-analogy`, **`easy` / `medium` / `hard`** | 3 – 3.9 – 5 | 110 |

Hard rules:

- **Only Analytical Reasoning carries a difficulty tag.** Never add `easy`/`medium`/`hard` to any
  other subject. Every analytical item must carry exactly one, matching its `difficulty` field
  lowercased.
- **General Information never uses kebab-case.** Write `bill of rights`, not `bill-of-rights`.
- **Numerical preserves `LCM`, `GCF`, `PEMDAS` in uppercase.** Do not lowercase them.
- **Never modify an existing item's tags. Never do a repo-wide tag cleanup. Never rename an
  existing tag.** Divergences between subjects are intentional, not bugs.
- Before inventing a tag, check whether an equivalent already exists in that file and reuse it.
- Tags should describe topic, skill, and salient content — not restate `subject`, `topic`, or
  `difficulty` (except the analytical difficulty tag).

---

## 20. OCR cleanup workflow

Source material typically arrives as scanned or photographed reviewers and mock exams. OCR
artifacts are the leading cause of silently wrong content.

Run this pass **before** any authoring:

1. **Character confusions.** `0`/`O`, `1`/`l`/`I`, `5`/`S`, `8`/`B`, `6`/`b`, `rn`/`m`. Devastating
   in Numerical: `108` scanned as `1O8` breaks every downstream computation.
2. **Mathematical operators.** OCR mangles `÷` into `+`, `×` into `x` or `*`, `−` into `-` or `~`.
   Restore real operators (§13). Superscripts are frequently flattened: `2⁵` becomes `25`,
   `cm²` becomes `cm2`. **Any exponent that arrives as a plain digit pair is suspect** — recompute
   and see which reading makes the item solvable.
3. **Currency and separators.** `₱` becomes `P`, `1,200` becomes `1.200` or `1200`. Restore the
   peso sign and comma thousands separators.
4. **Decimal points.** A lost decimal point is the single most damaging OCR error. Recompute every
   arithmetic item from scratch.
5. **Broken words and hyphenation.** Line-break hyphens rejoined wrongly: `govern- ment` →
   `government`, not `govern ment`.
6. **Collapsed whitespace.** Double spaces, missing spaces after periods, spaces before commas.
7. **Quotes and dashes.** Convert straight-quote/hyphen soup to the house typography.
8. **Diacritics.** Filipino and Spanish-origin names: `Andrés Bonifacio`, `Rizal`, `Bagumbayan`,
   `Sta.` Restore accents that OCR dropped.
9. **Option-label bleed.** OCR often merges the label into the text: `"A) 135"` → `"135"`. The
   `text` field never contains the option letter.
10. **Truncation.** Check that every stem and option is a complete thought. A truncated option is
    often mistaken for a deliberately short distractor.
11. **Answer-key rows.** Source answer keys frequently OCR into the wrong column. Never trust
    them (§21).

Then do a **semantic** pass: read the item and ask whether it is *solvable as written*. If no
option is correct, or two are, the OCR probably corrupted a number or a word. Reconstruct from
context if you can prove the intended item; otherwise reject and report.

---

## 21. Answer verification workflow

> **Never trust a source's supplied answer key.** Batch 001's source supplied no key at all, and
> all 150 answers were derived independently.

| Item type | Required verification |
| --- | --- |
| Numerical | **Recompute programmatically**, never by inspection. Write a throwaway script that evaluates the arithmetic and asserts the result equals the keyed option's text. |
| Ordering / logic puzzles | **Solve by exhaustive search.** Enumerate all permutations, apply every constraint, and confirm the keyed option is the *only* valid one among those offered. |
| Syllogisms / conditionals | Test each option against a counter-model. A conclusion is valid only if no consistent model makes the premises true and the conclusion false. |
| Legal / constitutional | Verify against a primary source (lawphil.net, SC E-Library, csc.gov.ph, DENR-EMB). Confirm the article, section, **and subsection letter**. |
| Historical / factual | Two independent authoritative sources. Confirm dates and full official names. |
| Grammar | Name the rule that decides it. If you cannot name a rule, the item is a matter of taste and must be rejected or rewritten. |
| Vocabulary | Confirm the sense in a standard dictionary, and confirm no *second* option is also defensible in the stem's context. |

Additional checks on every item:

- **Exactly one option is defensible.** Actively try to argue for each distractor. If you can
  build a real case for two options, the item is defective — fix the stem or drop the offending
  option (see §26, the 5→4 procedure, which is often the fix).
- **`correctOptionId` matches the intended text**, not just the intended position. After any
  option reordering, re-derive the letter from the text.
- **Steps land on the keyed answer.** Reproduce the arithmetic inside `steps` and confirm it
  reaches the keyed option. **If it does not, STOP and flag it — do not "fix" the key.**
- When authoring against a work order where the answer was pre-verified: the answer, options,
  option order, target letter, topic, subtopic, and difficulty are **decided**. Changing any of
  them is a defect, not an improvement. Disagreements get flagged in the report, not applied.

---

## 22. Duplicate detection workflow

The validator catches only **exact** duplicate stem+choices (normalised: whitespace-collapsed,
lowercased). Editorial deduplication is far stricter and is **mandatory**.

**Rejection standard:** reject an item when an existing item already tests **the same concept at
the same difficulty**, even if the wording and numbers differ entirely.

Batch 001 rejected 45 of 150 items on this basis. Real examples: a father/son age problem
structurally identical to an existing one with different numbers; a fourth *modus tollens* item
when the bank already had two.

**Cap on any single logical form, rule, or formula: roughly 2–3 items bank-wide.** Before adding,
count what already exists.

Procedure:

1. Load all five `core.json` files.
2. Exact check — normalised stem+choices, matching the validator.
3. Near-duplicate check — high token overlap on the stem.
4. **Concept check (the one that matters).** Group by `topic` + `subtopic`, then read the stems.
   Ask: *does the bank already teach this exact rule at this difficulty?* If yes, reject.
5. **Structural check.** For Numerical and Analytical, compare the *solution shape*, not the
   surface story. "Two workers, combined rate" is one structure regardless of whether they are
   encoding reports or painting a fence.
6. Report the count rejected and the reason for each.

**Deliberate exception — shared stem templates are not duplicates.** Multiple items may read
"Which of the following words is spelled correctly?" The stem is a template; the content differs.
Reuse the canonical stem (§11).

---

## 23. Quality assurance checklist

Run this before submitting any batch. Every line must pass.

**Schema and structure**

- [ ] Root is a JSON array; file parses (`python3 -m json.tool <file>`).
- [ ] UTF-8, 2-space indent, no BOM, trailing newline.
- [ ] Key order: `id, examLevel, subject, topic, subtopic, difficulty, passage?, question, choices, correctOptionId, explanation, steps?, distractorExplanations, tip, reference?, tags`.
- [ ] Every id matches `^(ana|cler|gen|num|verb)-\d{4}$`, is sequential from the current max, and is unique bank-wide.
- [ ] `examLevel`, `subject`, `difficulty` are exact enum strings.
- [ ] `topic` reuses an existing topic string verbatim (or a deliberately introduced new one).
- [ ] `subtopic` present and specific.
- [ ] Exactly 4 choices, ids `A`,`B`,`C`,`D` **in that order**, no duplicate or empty text.
- [ ] No option text contains its own letter label.
- [ ] `correctOptionId` matches the assigned letter **and** the intended option text.

**Teaching quality**

- [ ] `explanation` ≥ 100 chars; targeted 400–700; names the rule; pre-empts the error.
- [ ] No explanation rhymes with another in the batch.
- [ ] `distractorExplanations` keyed by exactly the three wrong letters, correct letter absent,
      each ≥ 20 chars, targeted 90–220, each naming a distinct nameable mis-procedure.
- [ ] Every distractor note reads well standalone (it renders after "Your choice.").
- [ ] `tip` present; `label` from the closed 15; `text` ≥ 10 chars, targeted 100–220; teaches a
      transferable strategy, not this item's answer.
- [ ] `steps` present where required (§16), ≥ 2 entries, correct **prefix style for the subject**,
      final entry restates the answer.
- [ ] `steps` omitted where the subject omits them (General Information, Word Analogy, most Verbal).

**Content correctness**

- [ ] Every arithmetic result recomputed programmatically.
- [ ] Every puzzle solved by exhaustive search; keyed option uniquely valid.
- [ ] Every citation verified against a primary source; no `VERIFY` remaining.
- [ ] Exactly one defensible option per item.
- [ ] Classification follows §7 (analogy → Analytical, spelling/filing → Clerical, `examLevel`
      per blueprint).
- [ ] No off-blueprint content (basic science, figural reasoning).
- [ ] No conceptual duplicate of an existing item.

**Style**

- [ ] Real typographic characters (`—`, `₱`, `×`, `÷`, `²`, `≈`).
- [ ] No forbidden AI filler phrases (§13).
- [ ] Tag convention matches the subject file exactly; analytical difficulty tag present;
      no difficulty tag elsewhere.
- [ ] Philippine civil-service register throughout.

**Final gates**

- [ ] `npm run validate:questions` passes with zero errors.
- [ ] `npm run typecheck` passes.
- [ ] Answer-letter distribution moves the whole-bank balance in the right direction (§25).
- [ ] Batch report written (§25).

---

## 24. Common mistakes to avoid

**Stale documentation traps.** `CLAUDE.md` is wrong on all of the following. Do not propagate:

| `CLAUDE.md` claim | Reality as of 2026-08-05 |
| --- | --- |
| "~239 validated original questions" | **424** |
| "`content/questions/{numerical,analytical,verbal,clerical,general,seed}.json`" | Five directories, each containing `core.json`: `analytical/`, `clerical/`, `general-information/`, `numerical/`, `verbal/`. There is no `seed.json` and no `general.json` |
| Schema is "id, examLevel, subject, topic, difficulty, question, passage?, choices, correctOptionId, explanation, reference?, tags" | Omits `subtopic`, `steps`, `distractorExplanations`, `tip`, and `source`. Four of those five are validator-enforced |
| "Subprofessional full exam locked (needs ≥ 35 clerical items; currently 33)" | Clerical Ability is at **53**; the stated threshold is met |

**Authoring mistakes**

- Using the wrong `steps` prefix for the subject. Analytical is `"Step N: "`, Verbal is
  `"Step N — "`, Numerical is unprefixed (§16). Prior briefs got this wrong; the corpus is
  authoritative.
- Adding `steps` to a General Information item, or to a Word Analogy item.
- Adding a difficulty tag outside Analytical Reasoning.
- Kebab-casing General Information tags.
- Lowercasing `LCM`, `GCF`, `PEMDAS`.
- Including the correct letter as a key in `distractorExplanations` (hard validator failure).
- Inventing a `tip.label` outside the closed 15.
- Placing `passage` after `question`. All 37 passage items put it **before**.
- Filing a word-analogy item under Verbal Ability.
- Marking a Clerical item `Professional`, or an Analytical item `Subprofessional`.
- Inflating difficulty to hit the 25/50/25 target.
- Forcing an answer-letter pattern within a batch instead of balancing the whole bank.
- Writing distractors nobody would choose.
- Fabricating a section number instead of writing `"reference": "VERIFY"`.
- Reusing a retired id.
- "Improving" a pre-verified stem, answer, or option order supplied in a work order.
- Repeating the same explanation skeleton across a batch.
- Modifying existing questions' tags, or running a repo-wide tag cleanup.

---

## 25. Answer-letter database balancing

**Balance the ENTIRE DATABASE over time, never each batch in isolation.**

Standing figures **as of 2026-08-05** (total 424):

| Letter | Count | Share |
| --- | --- | --- |
| A | 105 | 24.8% |
| B | 112 | 26.4% |
| C | 107 | 25.2% |
| D | **100** | **23.6%** |

**D is currently the underrepresented letter. Bias the next batch toward D.**

Per-subject spread as of 2026-08-05:

| Subject | A | B | C | D |
| --- | --- | --- | --- | --- |
| Analytical Reasoning | 21 | 17 | 21 | 22 |
| Clerical Ability | 12 | 17 | 14 | 10 |
| General Information | 24 | 29 | 20 | 19 |
| Numerical Reasoning | 23 | 25 | 22 | 23 |
| Verbal Ability | 25 | 24 | 30 | 26 |

Procedure before generating any batch:

1. Recompute the A/B/C/D distribution across **all five files**. `npm run validate:questions`
   prints it, or compute it directly.
2. Identify the underrepresented letter(s).
3. Assign target letters for the new batch biased toward those letters, so the post-merge bank is
   closer to 25/25/25/25 than it was before.
4. **Never force a repeating pattern** — no ABCDABCD, no "every fourth item is D". Natural
   randomness within the bias is required; a detectable pattern is exploitable by a test-taker and
   destroys the simulation's validity.
5. Assign the letter **before** authoring, then place the verified correct answer at that letter
   and order the remaining distractors naturally around it.
6. Report the pre- and post-merge distribution in the batch report.

### Batch report — required contents

Every batch ends with a report covering: items received, imported, rejected (with reasons), OCR
fixes applied, answer corrections made, duplicates removed, answer-letter distribution
(before and after), difficulty distribution, `examLevel` distribution, and any issues needing
owner attention.

---

## 26. The 5-options-to-4 reduction procedure

Source exams routinely offer **five** options; the AceCSE schema requires **exactly four**. Every
such item needs a reduction. This is a mandatory, deliberate editorial step — not an arbitrary
trim.

1. **Identify and lock the correct option.** Verify it independently first (§21). Never drop it,
   never modify its text.
2. **Classify each of the four distractors by the misconception it encodes.** Write the
   misconception down for each. If you cannot name one, that option is a candidate for removal.
3. **Rank by educational value:**
   - Highest: the distractor produced by the single most common error on this item type (in
     Numerical, usually the previous-step value or the wrong-denominator result).
   - High: a distinct, plausible second error.
   - Low: a value with no derivation — a "random plausible number".
   - Lowest: an option that is incoherent, ungrammatical, or trivially eliminable.
4. **Drop the lowest-ranked option.** Keep the three that encode real misconceptions.
5. **Use the reduction to remove ambiguity.** If two options are *both* defensible, drop one of
   them — this fixes a real defect. In Batch 001, one source item had two grammatically correct
   options; dropping the incoherent fifth option and then the redundant correct one resolved it.
6. **Two distractors encoding the same error?** Drop one; they teach the same lesson twice.
7. **Re-check parallel form** after the drop: the surviving four must still match in structure,
   length, and format.
8. **Re-order to the assigned answer letter** (§25), then set `correctOptionId` from the *text*,
   not the old position.
9. **Write `distractorExplanations` for the three survivors.** If a survivor's note is hard to
   write, you probably kept the wrong option — reconsider step 4.

Only reduce; never pad. If a source item has three options, either build a fourth genuine
misconception distractor or reject the item.

---

## 27. Repository conventions

- **Never modify any file outside the content files you were assigned.** Batch authoring touches
  exactly one `out_<subject>.json`, which the orchestrator merges.
- Content lives under `content/questions/<subject-dir>/`. Root of every file is a JSON array.
  `core.json` is the subject's baseline; new batches are separate files named
  `YYYY-MM-DD-HHMM-<descriptive-name>.json` (§8.1). Never append a batch to `core.json`.
- **JSON style:** UTF-8, 2-space indent, no trailing commas, `"` quotes, trailing newline.
- **Key order** (canonical): `id, examLevel, subject, topic, subtopic, difficulty, passage?, question, choices, correctOptionId, explanation, steps?, distractorExplanations, tip, reference?, tags`.
  Eight key orders exist in the bank; seven items (`verb-0037`–`verb-0042`, `seed-verb-004`) put
  `explanation` last. That is a legacy deviation — do not imitate it, and do not "fix" it (§28).
- **Validation:** `npm run validate:questions` after any content change. It must exit 0. It also
  prints supply-by-subject, difficulty, and answer-letter reports — capture those for the batch
  report.
- `npm run typecheck` must pass (TypeScript strict). Path alias `@/* → src/*`.
- **Historical content is frozen.** Do not modify existing questions unless the owner explicitly
  requests it, or to fix a **confirmed** error.
- **Prefer deactivating over deleting** bank questions — attempt records reference question ids,
  and a deleted item silently drops out of a user's review history.
- Questions ship as static JSON; there are no Firestore reads for the bank. If the bank ever grows
  large enough to need moderation, migrate to a `questions` collection with public read and
  admin-only write.
- **Autonomy:** process batches end to end. Do not ask the owner to verify items one by one.
  Escalate only genuinely ambiguous items, and always in the batch report.

---

## 28. Known outstanding defects — do not silently fix

These are documented, acknowledged, and **awaiting the owner's explicit go-ahead**. Leave them
alone; new items must be correct.

1. **RA 6713 subsection letters in `general-information/core.json`.** Items `gen-0024`,
   `gen-0029`, and `gen-0032` cite wrong subsection letters — currently `Sec. 4(A)(j)`,
   `Sec. 4(A)(i)`, and `Sec. 4(A)(h)` respectively — and `gen-0024`'s body text miscites
   professionalism.

   The statute's Sec. 4(A) runs (a)–(h) only:

   | | Norm |
   | --- | --- |
   | (a) | Commitment to public interest |
   | (b) | Professionalism |
   | (c) | Justness and sincerity |
   | (d) | Political neutrality |
   | (e) | Responsiveness to the public |
   | (f) | Nationalism and patriotism |
   | (g) | Commitment to democracy |
   | (h) | Simple living |

   **New items must use the correct letters.** Memorise this table; it is the most frequently
   miscited enumeration in the subject.

2. **`ana-0006` uses the out-of-set `tip.label` `"Degree of Intensity"`.** Single violation of the
   closed label set. Not precedent.

3. **Ten legacy Word Analogy items carry `steps`** despite the validator exemption and the current
   convention to omit them. Not precedent.

4. **Seven verbal items place `explanation` last** in key order. Not precedent.

---

## 29. Future maintenance recommendations

Ordered by value.

1. **Source harder material.** The bank is at Easy 31% / Medium 50% / Hard 19% against a
   25/50/25 target. General Information is the worst offender (10 Hard of 92). Prioritise
   subsection-level statutory items, multi-step numerical problems, and constraint puzzles that
   require a technique.
2. **Grow Clerical Ability.** At 53 items it is the thinnest subject and the binding constraint on
   Subprofessional simulation tiers. It is also single-level, so every clerical item serves only
   half the audience — which is exactly why it needs deliberate investment rather than incidental
   growth.
3. **Fix the RA 6713 citations** once the owner authorises it, and add a validator rule rejecting
   any `RA 6713, Sec. 4(A)(x)` where `x` is outside `a`–`h`.
4. **Extend the validator** with gates this guide currently enforces only by review:
   - `tip.label` must be in the closed 15-label set.
   - `subtopic` required (already 424/424 in practice — make it enforced).
   - id must match `^(ana|cler|gen|num|verb)-\d{4}$`, grandfathering `seed-*`.
   - Analytical items must carry exactly one difficulty tag matching `difficulty`.
   - General Information items must carry a `reference`; Numerical and Analytical must not.
   - Steps prefix style per subject.
   - Reject `"reference": "VERIFY"`.
   - Warn when `explanation` falls outside 400–700 chars or `tip.text` outside 100–220.
5. **Add a duplicate-concept report** to the validator: cluster by `topic` + `subtopic` and flag
   clusters exceeding the 2–3 item cap on a single logical form.
6. **Keep this document's statistics fresh.** Re-derive every figure labelled *as of 2026-08-05*
   after each merged batch, and update the next-free-id table (§9) and the answer-letter standing
   figures (§25) in the same commit as the content.
7. **Retire `CLAUDE.md`'s Question Bank section** in favour of a pointer to this guide and to
   `JSON_SPEC.md`, so the stale schema list stops misleading readers.
8. **Consider a topic-coverage dashboard.** Some topics have one item (`Order of Operations`,
   `Philippine Economics and Taxation`); they will read as arbitrary to a learner who happens to
   draw them. Either grow them to 3+ or fold them into a neighbour.

---

## 30. Companion documents

- `JSON_SPEC.md` (same directory) — the exact field-by-field schema specification and a complete
  worked example item. Read it together with this guide before authoring.
- `src/types/index.ts` — canonical types. Authority over all prose.
- `scripts/validate-questions.mjs` — the enforced gates. Authority over this guide.
- `src/config/exam.ts` — the CSC blueprint.
