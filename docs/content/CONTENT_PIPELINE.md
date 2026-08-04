# AceCSE — Content Production Pipeline

How a Philippine Civil Service Examination question travels from a source exam to a learner's
screen, and how to run that chain thousands of times without diluting quality or burning tokens.

```
Source → OCR → Normalisation → Screening → Blueprint & Answer Derivation →
Work Orders → Generation → Validation → QA → Merge → Repo → App (→ Firestore)
```

Stages 1–4 and 8 are **deterministic**. Stages 5–7 and 9 are where LLM judgment is spent. The
central economic fact of this pipeline: mechanical work done by an LLM costs 100–1000× what the
same work costs as a script, and the script is more reliable. Every design choice below follows
from that.

## Baseline as of 2026-08-05

| Metric | Value |
|---|---|
| Bank size | 424 items across 5 subjects |
| Supply | Verbal 105 · Numerical 93 · General Information 92 · Analytical 81 · Clerical 53 |
| Answer letters | A=105 B=112 C=107 D=100 |
| Difficulty | Easy 130 (31%) · Medium 214 (50%) · Hard 80 (19%); target 25/50/25 |
| Median explanation | 494–610 chars depending on subject |
| Average item on disk | ~2.1 KB JSON ≈ ~550 tokens |
| Whole corpus | ~900 KB ≈ ~250k tokens |
| Last batch yield | 150 received → 93 imported (62%) |

That last row is the number to plan against. **Assume a 55–65% yield.** Sourcing 150 items to ship
93 is normal and healthy; the 57 rejections were 45 concept-level duplicates against the existing
bank, 6 internal duplicates within the batch, and 6 off-blueprint items. Yield will *fall* as the
bank grows, because concept collisions rise — see "Throughput and cost".

---

# Stage 1 — Source acquisition

**In:** reviewers, past CSC mock exams, statutory texts, curated topic lists.
**Out:** raw PDFs/images/text in a staging directory outside `content/`.
**Actor:** operator.

Record for every source: origin, date, exam level it claims, whether it supplies an answer key, and
its option count. Two facts about sources drive downstream work:

- **Source keys are not trusted.** Batch 001's source supplied no key at all and all 150 answers were
  derived independently at Stage 5. Even when a key exists it is verified, never adopted.
- **Sources often print five options.** The schema requires exactly four. Every such item needs a
  5→4 reduction at Stage 5.

**Failure modes:** un-OCR-able scans; sources that are themselves copies of material already in the
bank; sources heavy in figural/spatial items that cannot render in a text-only schema.

**Exit criteria:** source inventoried, legible, and plausibly on-blueprint.

---

# Stage 2 — OCR

**In:** source images/PDFs. **Out:** raw text, one file per source section.
**Actor:** OCR engine (deterministic), operator spot-check.

Do not let an LLM "read" a scan and simultaneously author the item. Separate extraction from
authorship — a model doing both will silently repair OCR damage in ways you cannot audit, and will
hallucinate over illegible regions rather than flagging them.

**Failure modes:** digit substitution (`0/O`, `1/l/I`, `5/S`, `8/B`, `6/G`) in statute numbers,
years, and article numbers; dropped negations; broken math glyphs (`÷`→`+`, lost decimal points,
`₱`→`P`); two-column bleed splicing unrelated clauses; mojibake in Filipino text (`Ã±` for `ñ`);
truncated options.

**Exit criteria:** text extracted with an explicit uncertainty marker on every region the engine
scored as low-confidence. Never silently interpolate.

---

# Stage 3 — Normalisation

**In:** raw OCR text. **Out:** a machine-readable candidate list — one record per item with stem,
options, source-supplied key (if any), and provenance.
**Actor:** deterministic script (`normalize.py` in the last batch).

This is pure parsing: strip page furniture, split items, split options, repair known glyph
substitutions from a fixed table, normalise whitespace and typographic characters. Anything the
script cannot parse goes to a rejects file for human eyes. **No LLM in this stage.**

**Exit criteria:** every candidate has a stem and an option list; the count of parsed items matches
the count of items in the source; the rejects file has been read.

---

# Stage 4 — Screening (dedup, blueprint, supply)

**In:** normalised candidate list. **Out:** an accept/reject decision per candidate, with reasons.
**Actor:** deterministic script first, LLM only on the residue.

This stage is where the last batch discarded 38% of its input, and it is the single largest token
saving available. **Screening before generation means you never pay to author an item you will
reject.** Authoring 150 items and rejecting 57 costs roughly 60% more than authoring 93.

Three filters, cheapest first:

1. **Mechanical dedup** — normalised stem hash, option-set hash, and n-gram/embedding similarity
   against the whole corpus and against the batch itself. Catches exact and near-exact repeats for
   effectively zero cost.
2. **Concept-signature dedup** — the expensive part, and the only part that needs judgment. Each
   surviving candidate gets a one-line concept signature (the skill plus the exact rule or logical
   form: `two-person-age-ratio-solve-for-present-age`, `modus-tollens-single-conditional`,
   `the-number-of-vs-a-number-of-agreement`). Signatures are compared, not stems. Reject when an
   existing item tests the same concept at the same difficulty, even with different wording and
   numbers. Cap any single logical form at roughly **2–3 items bank-wide**.
   *Token trick:* the corpus side of this comparison is a pre-built signature index — a few dozen
   tokens per bank item, not the full 550. Build the index once, refresh it per batch.
3. **Blueprint filter** — reject off-blueprint items (pure basic science; figural/spatial, which
   cannot render in a text-only schema) and enforce the taxonomy rules: word analogy and
   assumption/conclusion evaluation are Analytical, not Verbal; spelling and alphabetical filing are
   Clerical and therefore Subprofessional; `examLevel` follows the CSC blueprint, not the source
   exam's label.

**Deliberate exception:** shared stem templates ("Which of the following words is spelled
correctly?", "What is the next number in the series: …") are house style, not duplication. Reuse the
canonical stem rather than inventing a paraphrase. The mechanical dedup script must whitelist them
or it will produce a wall of false positives.

**Exit criteria:** a screened candidate list with a written rejection reason per discarded item, and
a per-concept collision count for everything that survived.

---

# Stage 5 — Blueprint and answer derivation (the pre-verification stage)

**In:** screened candidates. **Out:** a fully-specified work order per subject.
**Actor:** orchestrator (LLM) plus verification scripts.

This is the stage that makes the rest of the pipeline cheap. Before any prose is written, decide and
**verify**:

- the correct answer, derived independently — never adopted from the source
- the 5→4 option reduction: drop the least plausible distractor, keep the ones encoding real
  misconceptions. This is also the ambiguity-removal opportunity — in Batch 001, one source item had
  two grammatically correct options and dropping the incoherent one fixed a genuine defect
- the final option order and therefore the **target answer letter**, assigned from a whole-bank
  balance plan (see Stage 5b)
- `subject`, `topic`, `subtopic`, `difficulty`, `examLevel`
- the `reference` string for General Information items, verified against a primary source
- the item `id`, allocated from the subject's current maximum

Verification standard: numerical answers are recomputed programmatically, never by inspection;
ordering and logic puzzles are solved by exhaustive search with confirmation that the keyed option
is the *only* valid one among those offered; legal citations are checked against lawphil.net, the
Supreme Court E-Library, csc.gov.ph, or DENR-EMB. If a provision cannot be verified, the work order
carries `REF: VERIFY` and the item is escalated rather than guessed.

## Stage 5b — Answer-letter balance planning

Balance the **entire database over time**, never each batch in isolation. Compute the current A/B/C/D
distribution across the whole bank, then bias the batch toward whichever letter is underrepresented.
Never force a repeating pattern (no ABCDABCD) — natural randomness is preferred. At 424 items the
bank stands A=105 B=112 C=107 D=100, so a new batch should lean D, then A.

This is a deterministic planning problem and belongs in a script, not in a prompt.

**Exit criteria:** every candidate has a verified key, four ordered options, a target letter, full
classification, and (where required) a verified citation. Nothing about the item's *truth* remains
undecided when Stage 6 begins.

---

# Stage 6 — Work orders

**In:** verified specifications. **Out:** one Markdown work order per subject.
**Actor:** orchestrator.

The work order is the contract between the orchestrator and the authoring agents. The pattern proven
in `work_verbal.md` and `work_general.md`:

- A header stating the subject, the fixed `examLevel`, the **tag convention for that subject**, the
  `steps` policy for that subject, the `reference` policy for that subject, and the exact output
  path.
- One compact block per item: `N` (source index) · `id` · topic · subtopic · difficulty · target
  letter · stem · the four options in final order · `REF` where applicable · `TAGS` · an optional
  `NOTE` telling the author what the item should *teach*.
- A pointer to `brief.md` (the authoring style contract) and to the subject's `core.json` — read from
  disk, never pasted.

The `NOTE` field is where the orchestrator's expensive thinking is banked. `NOTE: A, B, C are all
near-SYNONYMS of METICULOUS — that is the trap. Teach the "find the odd relationship" check` converts
a possible author misfire into a guaranteed teaching moment for about 30 tokens.

**Exit criteria:** an author reading only `brief.md`, the subject's `core.json`, and the work order
can produce shippable JSON with no further questions.

---

# Stage 7 — Generation

**In:** work order. **Out:** a JSON array at the specified path.
**Actor:** one LLM authoring agent per subject, fanned out in parallel.

The authoring agent writes **prose only**: `explanation`, `steps` (where the subject's convention
requires them), `distractorExplanations`, and `tip`. Everything else is copied from the work order
verbatim. Changing an answer, reordering options, or "improving" a stem is a defect, not an
improvement — an author who disagrees flags it in its report and changes nothing.

Fan out one agent per subject, not one per item. Each agent pays the style-context cost once
(`brief.md` plus a read of its own `core.json`) and amortises it over 12–40 items. Subjects are
independent, so all five run concurrently; wall-clock time for a batch is the slowest subject, not
the sum.

**Failure modes:** voice drift from the house style; repeated sentence frames across items within one
agent's output; generic AI filler; distractor notes that rationalise rather than diagnose; visible
reasoning artifacts leaking into prose (self-corrections, "wait", abandoned lines — this has reached
shipped content in `cler-0001`); silently invented citations.

**Exit criteria:** the file parses (`python3 -m json.tool`), item count matches the order, and the
agent's report lists every disagreement it had with a supplied answer and every `reference: VERIFY`
it left behind.

---

# Stage 8 — Validation (machine gates)

**In:** generated JSON. **Out:** pass/fail plus supply, difficulty, and letter reports.
**Actor:** `scripts/validate-questions.mjs` (`npm run validate:questions`). Zero LLM involvement.

Fatal gates: valid JSON and array root; present and unique `id`; valid `examLevel`/`subject`/
`difficulty` enums; present `topic`; non-empty `subtopic` when the key exists; `question` ≥ 10 chars;
`tags` is an array; exactly 4 choices with ids `A,B,C,D` **in order**, no duplicate or empty choice
text; `correctOptionId` in A–D; `explanation` ≥ 100 chars; `steps` ≥ 2 for Numerical and non-analogy
Analytical items with every entry a string ≥ 3 chars; `distractorExplanations` present, containing
exactly the three wrong letters at ≥ 20 chars each and never the correct letter; `tip` with a
non-empty `label` and `text` ≥ 10 chars; no exact duplicate of stem + option set.

Run this **before** QA, always. It is free, and sending a structurally broken batch to a reviewer
wastes tokens on defects a script would have named in 200 ms.

**Known gaps — deliberately out of scope for the script, and therefore Stage 9's job:** factual
truth, arithmetic, answer-key correctness, ambiguity, concept-level duplication, OCR damage that
still reads as English, `tip.label` membership in the closed set, `reference` presence/format/accuracy,
per-subject tag conventions, the `Step n —` prefix convention, `examLevel`↔`subject` blueprint
consistency, difficulty honesty, and voice quality.

**Exit criteria:** exit code 0.

---

# Stage 9 — QA review

**In:** validated JSON plus the existing corpus. **Out:** a structured QA report.
**Actor:** a reviewing LLM running `docs/content/AI_QA_PROMPT.md`, plus deterministic helpers.

Split the work by cost:

- **Scripts do:** arithmetic recomputation, exhaustive-search puzzle verification, internal
  consistency (does the last `steps` entry match the keyed option? does `distractorExplanations` key
  exactly the three wrong letters?), `tip.label` set membership, tag-convention regex per subject,
  `steps`-prefix convention per subject, `reference` presence per subject, key-order check, length
  bands, and the dedup signature diff.
- **The reviewer does:** answer-key derivation, ambiguity hunting (two defensible options),
  fact and citation verification, distractor-rationale execution, concept-level dedup adjudication,
  explanation quality, and voice.

The reviewer's governing constraint is that it must **not rewrite good questions** — only BLOCKER and
MAJOR findings justify an edit, and cosmetic churn is itself a defect. See the prompt file for the
full severity taxonomy and detection procedures.

**Exit criteria:** zero unresolved BLOCKERs; MAJORs either fixed with a minimal targeted patch or
escalated; MINOR/NIT logged and left alone.

---

# Stage 10 — Land the batch in the repo

**In:** QA-approved items. **Out:** one **new** file per subject at
`content/questions/<subject>/YYYY-MM-DD-HHMM-<descriptive-name>.json`.
**Actor:** deterministic write script.

**Never append a batch to `core.json`.** `core.json` is the subject's frozen baseline. Each batch is
a new file whose name carries its processing date, generation time, and source — the standard is
specified in `MASTER_GUIDE.md` §8.1 and summarised here:

```
YYYY-MM-DD-HHMM-<descriptive-name>.json      lowercase, kebab-case, hyphens only
2026-08-05-1430-jvc-professional-mock.json
2026-08-06-2015-facebook-public-questions.json
2026-08-07-0930-csc-review-center-set-a.json
2026-08-09-1800-ocr-book-volume-1.json
```

One batch spanning several subjects produces one file **per subject directory**, all sharing the same
date-time prefix and descriptive name — that shared prefix is what ties them back together as a
single import:

```
content/questions/verbal/2026-08-05-1430-jvc-professional-mock.json
content/questions/numerical/2026-08-05-1430-jvc-professional-mock.json
content/questions/analytical/2026-08-05-1430-jvc-professional-mock.json
content/questions/general-information/2026-08-05-1430-jvc-professional-mock.json
```

Within a batch file: never rewrite existing entries, never reindex ids, and preserve the canonical
key order:

```
id, examLevel, subject, topic, subtopic?, difficulty, question, passage?, choices,
correctOptionId, explanation, steps?, distractorExplanations, tip, reference?, source?, tags
```

Then run `npm run validate:questions` across the **whole tree** — cross-file duplicate ids and
cross-file duplicate stems only surface once the batch file is in place — followed by
`npm run typecheck` and `npm run build`.

**Critical repo hazard:** `src/data/questionBank.ts` glob-imports `../../content/questions/**/*.json`
eagerly. **Any** `.json` file anywhere under `content/questions/` ships to production. Staging files,
rejected batches, and backups must live outside that tree. Never write `out_verbal.json` into it.
This hazard is exactly why the batch filename is a standard rather than a preference: a
convention-conforming name is the signal that a file has passed QA and is meant to ship.

**Exit criteria:** the batch file(s) validate in place; per-subject counts, letter distribution, and
difficulty distribution recorded for the next batch's balance plan.

## The batch-file workflow, end to end

1. The AI processes the raw questions (Stages 1–9).
2. The AI emits **one new batch JSON per subject**, named per the standard above.
3. Save each file under the correct subject folder in `content/questions/`.
4. Run `npm run validate:questions` (then `npm run typecheck` and `npm run build`).
5. Commit and push. The commit adds files rather than rewriting `core.json`, so the diff is
   reviewable and the batch is revertible by deleting a file.
6. **Periodically** consolidate older batch files into `core.json` as a maintenance task — only
   after validation and deduplication, never as part of an import.

## Consolidation (maintenance task, not part of an import)

Batch files accumulate. Consolidating them into `core.json` is a deliberate, separate operation,
worth doing when a subject directory has grown to roughly 10–15 batch files or when a source has
been audited and confirmed good.

Procedure:

1. Pick the batch files to fold in — oldest first, and only ones that have been live long enough to
   be trusted.
2. Append their items to the subject's `core.json`, preserving key order and making no content edits.
3. **Delete the batch files in the same commit.** This is the step people forget, and forgetting it
   duplicates every id in the batch.
4. Run `npm run validate:questions`. A forgotten deletion fails here: the validator treats duplicate
   ids as fatal. That failure is the safety net — do not work around it by renaming.
5. Commit as a pure maintenance change (`chore(content): consolidate <n> batch files into core.json`)
   with no new questions mixed in, so the diff is verifiable as content-neutral.

Why the deletion matters mechanically: the loader keeps the **first** id it encounters and drops
later duplicates with a dev-only warning, and date-prefixed filenames sort before `core.json`. So a
half-finished consolidation would silently shadow the `core.json` copies rather than erroring at
runtime — the build validator is what turns that into a loud failure.

Consolidation is optional. A subject with 30 batch files and a clean validator run is not broken;
it is just noisier to browse. Never consolidate to "tidy up" mid-import.

---

# Stage 11 — Ship

**In:** merged repo. **Out:** the running app.
**Actor:** build and deploy.

`src/data/questionBank.ts` loads the glob at build time and re-validates defensively at runtime. Its
runtime filter is **looser** than the build validator: it requires only `id`, `question`,
`explanation`, `subject`, `topic`, valid `examLevel` and `difficulty`, 4 choices with ids in the A–D
set (order not checked), a valid `correctOptionId`, and an array `tags`. Items failing that are
**silently dropped** with a dev-only console warning; duplicate ids are dropped after the first.

The consequence: a question that fails the build validator but passes the runtime filter ships in a
degraded state (no tip, no distractor notes), and a question that fails both simply vanishes from the
bank without an error in production. The build validator is the real gate. Do not deploy on a red
validator.

**Exit criteria:** validator green, typecheck green, `QUESTION_BANK.length` equals the expected merged
count.

---

# Token efficiency — the recommended pattern

Token efficiency is a first-class design goal here, not a nicety. Premium quality is preserved by
spending tokens *only* on judgment. Every technique below was used successfully in the last batch.

### 1. Screen before you author
Rejecting at Stage 4 costs a signature comparison. Rejecting at Stage 9 costs a full authored item
plus a full review. At the last batch's 62% yield, screening first cut authoring spend by ~38%.
This is the single largest lever and it grows as the bank grows.

### 2. Never paste the corpus into a prompt
The corpus is ~250k tokens; one subject file is 25–65k. Give agents **paths**, not payloads:
`content/questions/verbal/core.json`, `brief.md`, `src/types/index.ts`. Agents read what they need.
For dedup, hand over a **pre-built concept-signature index** (a few dozen tokens per bank item)
rather than the items themselves — roughly a 10–20× reduction on the largest single context cost in
the pipeline.

### 3. Hand authors a pre-verified answer key and pre-selected options
The work order fixes the key, the four options, the option order, the target letter, the topic,
subtopic, difficulty, and reference. The author writes prose only. This does three things at once:
it removes the most expensive reasoning from the per-item path, it makes the output deterministic
enough to validate mechanically, and it eliminates the entire class of defect where an author
"improves" a verified item.

### 4. Deterministic work stays deterministic
Dedup screening, arithmetic verification, schema checks, letter balancing, key ordering, batch
statistics, tag regexes, and length bands are all scripts. An LLM doing arithmetic is both more
expensive and less reliable than `python3 -c`. If a check can be expressed as a rule, it must not be
a prompt.

### 5. Fan out by subject, in parallel
One agent per subject amortises the style-context read (`brief.md` + `core.json`) across 12–40 items
instead of paying it per item, and the five subjects run concurrently. Do not fan out per item; the
per-item context overhead dominates and cross-item repetition detection inside one subject is lost.

### 6. Write incrementally
Each authoring agent writes to its own output file (`out_verbal.json`, `out_general.json`, …) and
the merge happens only after all subjects land. A mid-run failure in one subject loses that subject,
not the batch. For long subjects, have the agent append in chunks so a timeout preserves completed
items.

### 7. Verify once, at the right stage
The answer is derived and verified exactly once, at Stage 5. Stage 7 does not re-derive it, Stage 8
cannot, and Stage 9 re-derives it as an independent check — which is the *point* of Stage 9 and the
one place duplicated effort is intentional.

### 8. Keep the QA reviewer from rewriting
An unconstrained reviewer will regenerate every item it reads. That is both the largest avoidable
token cost in the pipeline and a quality regression, because it churns content that already passed.
The "do not rewrite good questions" constraint is a cost control as much as an editorial one.

## Deterministic vs LLM, by stage

| Stage | Script | LLM | Notes |
|---|---|---|---|
| 1 Source | ✔ | | Operator |
| 2 OCR | ✔ | | Dedicated engine; never an LLM reading a scan while authoring |
| 3 Normalise | ✔ | | Parsing only |
| 4 Screen | ✔ mostly | ✔ residue | Hashes and similarity first; LLM only adjudicates concept signatures |
| 5 Derive | ✔ verify | ✔ decide | LLM classifies and reduces 5→4; scripts recompute and balance letters |
| 6 Work orders | | ✔ | Orchestrator |
| 7 Generate | | ✔ | Parallel by subject |
| 8 Validate | ✔ | | `validate-questions.mjs` |
| 9 QA | ✔ mechanical | ✔ judgment | Split as described above |
| 10 Merge | ✔ | | Append-only |
| 11 Ship | ✔ | | CI |

## Helper scripts worth building (specifications, not implementations)

**`dedup-screen.mjs`** — Input: a candidate JSON/JSONL file. Loads the whole bank, computes for each
candidate a normalised stem hash, an option-set hash, and a similarity score (character n-gram or
embedding) against every bank item and every other candidate. Whitelists the canonical shared stem
templates so they do not fire. Output: a TSV of `candidate → nearest bank ids → score → verdict
(exact / near / clear)`, plus a residue list for LLM concept adjudication. Highest-value script in
the set.

**`concept-index.mjs`** — Maintains `content/.index/concepts.tsv`, one line per bank item: `id,
subject, topic, subtopic, difficulty, concept-signature`. Signatures are authored once at import and
never recomputed. Everything downstream reads this file instead of the corpus.

**`letter-plan.mjs`** — Input: batch size and per-subject counts. Reads the bank's current A/B/C/D
distribution, emits a target letter per item id, biased toward underrepresented letters, randomised
with no runs longer than three and no repeating cycle. Also emits the projected post-merge
distribution so the plan can be sanity-checked before authoring.

**`batch-stats.mjs`** — Input: one or more batch files. Emits received / imported / rejected with
reasons, answer-letter distribution, difficulty distribution, `examLevel` distribution, per-subject
counts, explanation/distractor/tip length percentiles against house bands, and the closing bank
totals. This produces the mandatory end-of-batch report; the orchestrator should never assemble those
numbers by hand.

**`convention-lint.mjs`** — Non-fatal companion to the validator, covering exactly what the validator
deliberately does not: `tip.label` outside the closed set; tag-convention regex per subject
(space-separated for General Information, kebab-case elsewhere, difficulty tag required in Analytical
and forbidden elsewhere, uppercase `LCM`/`GCF`/`PEMDAS` preserved in Numerical); `Step n —` prefix
present in Verbal/Analytical/Clerical and absent in Numerical; `steps` forbidden in General
Information; `reference` mandatory in General Information; JSON key order; length bands; and a scan
for reasoning artifacts (`wait`, `hmm`, ` — no:`) and banned filler in prose fields.

**`answer-check.mjs`** — For items whose stem is machine-parseable (arithmetic, series, ratio,
percentage, LCM/GCF), recomputes the answer from the stem and asserts it matches the keyed option
text. Reports parse failures rather than guessing. Even 50% coverage removes the most expensive
class of QA finding.

**`id-alloc.mjs`** — Reads the maximum numeric suffix per subject prefix (`verb-`, `num-`, `gen-`,
`ana-`, `cler-`, ignoring the legacy `seed-*` ids) and allocates the next contiguous block. Prevents
the id collisions that otherwise only surface at Stage 10. It must scan **every** `.json` file in each
subject directory — `core.json` plus all landed batch files — not just `core.json`; and it must compare
numeric suffixes, not strings, because `seed-*` ids sort lexically above the numbered ones.

**`batch-name.mjs`** — Given a subject and a source description, emits the
`YYYY-MM-DD-HHMM-<descriptive-name>.json` filename per `MASTER_GUIDE.md` §8.1: slugs the description
to lowercase kebab-case, strips disallowed characters, stamps the current date and time, and refuses
to overwrite an existing path. Pair it with a `convention-lint` check in CI that fails any file under
`content/questions/` whose name is neither `core.json` nor a conforming batch name — that check is
what keeps a stray staging file from shipping through the eager glob.

---

# Firestore migration path

**Current state, stated honestly:** questions ship as static JSON. There are **no Firestore reads for
questions**. `src/data/questionBank.ts` eagerly glob-imports every `.json` file under
`content/questions/`, so the entire bank is bundled into the JavaScript payload at build time.
Firestore currently holds only `users/{uid}` profiles and `users/{uid}/attempts/{id}` records, under
default-deny, owner-only rules with attempts immutable after create.

`CLAUDE.md` records the intent: *"when the bank grows large or needs moderation, migrate to a
`questions` collection with public read + admin-only write."* That is the right destination; the
open question is when.

## When to make the call

Migrate when **any one** of these becomes true:

1. **Bundle size.** At ~2.1 KB per item, the bank is ~900 KB of JSON today and every byte is in the
   initial bundle. 1,500 items ≈ 3.2 MB, 3,000 items ≈ 6.3 MB. Past roughly **1,000–1,200 items
   (~2.5 MB)** the first-load cost stops being defensible on Philippine mobile connections, which is
   the primary audience. This is the trigger most likely to fire first.
2. **Moderation need.** The moment a wrong answer must be corrected faster than a redeploy, or a bad
   item must be pulled without shipping code, content has outgrown the repo.
3. **Non-engineer authorship.** If anyone who cannot open a pull request needs to add or edit
   questions, you need a datastore and an admin surface.
4. **Per-item telemetry.** Item-level difficulty calibration from real attempt data (p-values,
   discrimination) implies writing back to the item, which a static bundle cannot do.

Do **not** migrate merely because the item count sounds big. Static JSON has real advantages the
migration gives up: the build-time validator is a hard gate that cannot be bypassed, content is
diffable and code-reviewed, git is the audit log, rollback is a revert, and the app works offline
with zero read cost.

## What would have to change

- **Firestore rules.** Add a `questions/{id}` collection with `allow read: if true` and
  `allow write: if <admin claim>`. Admin identity needs a mechanism that does not exist yet — a
  custom claim or an `admins/{uid}` document — because the app is currently Google-sign-in-only with
  no role model.
- **Loader.** `questionBank.ts` becomes async. Every consumer of the currently-synchronous
  `QUESTION_BANK` and `QUESTION_INDEX` exports has to handle a loading state:
  `src/lib/examEngine.ts`, `src/lib/grading.ts`, `src/lib/analytics.ts`, `ExamPage`, and the landing
  page's sample question.
- **Caching.** Enable Firestore offline persistence for questions (profiles and attempts already use
  it) and read a version document so the client can skip a full re-fetch when nothing changed. Full
  re-download on every cold start would be worse than the bundle it replaced.
- **Validation moves from build time to write time.** This is the genuine loss. The current validator
  is a pre-merge gate; once content is written through an admin path, the equivalent checks must run
  as a Cloud Function or an admin-side script, and a rule violation becomes a runtime problem rather
  than a red build. Budget for it explicitly — do not migrate and discover this afterwards.
- **The repo stays the source of truth.** The recommended shape is: author in the repo exactly as
  today, validate at build time exactly as today, and **publish** the validated bank to Firestore
  from CI. Firestore becomes a read-optimised replica, not a second authoring surface. This preserves
  every advantage of the static pipeline and buys the bundle-size and hotfix wins. Move to
  authoring-in-Firestore only when requirement 3 (non-engineer authorship) actually arrives.
- **Attempt integrity.** `AttemptItem` stores `questionId`. If a question disappears, grading skips
  it and `ResultsScreen` hides it. That holds under Firestore too — but it means **deactivating, not
  deleting**, remains policy. Add an `active: boolean` field at migration time and filter on read.
- **Cost.** Public read on a 3,000-item collection is cheap only with caching. Reading the whole bank
  per session per user is 3,000 document reads; with an offline cache plus a version check it is
  approximately zero on repeat visits. Do not ship the migration without the version document.

**Recommended sequencing:** stay static through ~1,000 items. Between 1,000 and 1,500, implement the
CI-publish replica with an `active` flag, a version document, and offline persistence, keeping the
repo authoritative. Only build an admin authoring UI when a non-engineer actually needs one.

---

# Throughput and cost

Figures from the last batch, which produced 93 imported items from 150 sourced.

| Stage | Per 100 sourced items | Notes |
|---|---|---|
| OCR + normalise | minutes | Script-bound |
| Screening | ~10–20 min | Mostly script; LLM adjudicates the residue |
| Derivation + verification | the real bottleneck | Every key derived independently; every citation checked against a primary source |
| Work orders | ~15 min | Orchestrator |
| Generation | one pass, parallel across 5 subjects | Wall clock = slowest subject |
| Validation | seconds | |
| QA | proportional to items authored | ~5–15% of items yield a real finding |
| Merge + report | minutes | Scripted |

Planning rules of thumb:

- **Source 1.6× what you intend to ship.** 62% yield last batch; assume it declines.
- **Yield falls as the bank grows.** Concept collisions rise roughly with bank size for any fixed
  source pool. At 424 items a generic entry-level mock already collides on 30% of its content. At
  1,000+, generic sources will be mostly duplicates and sourcing must shift to *deliberately targeted
  gaps* — specific statutes, specific logical forms, specific arithmetic types — rather than whole
  mock exams.
- **Favour Hard.** The bank is 31/50/19 against a 25/50/25 target. Difficulty is never inflated to
  hit the target; the fix is at Stage 1, by sourcing harder material.
- **Clerical is the binding constraint on product.** The Subprofessional full exam unlocks at 35
  clerical items and the bank now has 53, but Clerical remains the smallest subject and is
  Subprofessional-only, which is the product's declared first focus. Weight sourcing accordingly.
- **Token spend is dominated by two things:** authoring prose, and any stage that reads the corpus.
  The first is irreducible and is where the product's value lives. The second is almost entirely
  avoidable with a signature index.

---

# Per-batch operator checklist

**Before sourcing**
- [ ] Run `npm run validate:questions` on a clean tree; record per-subject supply, difficulty split,
      and A/B/C/D counts.
- [ ] Identify the target gaps: which subjects are short, which difficulty is short (currently Hard),
      which topics are thin.
- [ ] Confirm the source is plausibly on-blueprint and note its option count and whether it supplies
      a key.

**Ingest**
- [ ] OCR with low-confidence regions marked, not interpolated.
- [ ] Normalise with a script; read the rejects file.
- [ ] Confirm parsed item count equals source item count.

**Screen**
- [ ] Mechanical dedup against the whole bank and within the batch.
- [ ] Concept-signature dedup; record collisions and per-form counts against the 2–3 cap.
- [ ] Blueprint filter; reject basic-science and figural items with a written reason.
- [ ] Apply the taxonomy rules (analogy → Analytical; assumption/conclusion → Analytical; spelling
      and filing → Clerical/Subprofessional; `examLevel` from the blueprint, not the source label).

**Derive**
- [ ] Derive every answer independently. Trust no supplied key.
- [ ] Recompute all arithmetic programmatically; solve all puzzles by exhaustive search and confirm
      uniqueness among the offered options.
- [ ] Perform the 5→4 reduction, dropping the least plausible distractor and removing any ambiguity
      it creates.
- [ ] Verify every citation against a primary source; mark unverifiable ones `VERIFY` and escalate.
- [ ] Generate the letter plan from the current whole-bank distribution.
- [ ] Allocate ids from each subject's current maximum.

**Author**
- [ ] Write one work order per subject with that subject's tag / `steps` / `reference` conventions
      stated explicitly.
- [ ] Fan out one agent per subject, in parallel, each writing to its own output file.
- [ ] Collect each agent's report: item count, disagreements with supplied answers, `VERIFY`
      references left behind.

**Verify**
- [ ] `python3 -m json.tool` each output file.
- [ ] Run the validator against the batch.
- [ ] Run `convention-lint` (tip labels, tags, step prefixes, reference policy, key order, length
      bands, reasoning artifacts).
- [ ] Run the QA reviewer with `docs/content/AI_QA_PROMPT.md`.
- [ ] Resolve every BLOCKER. Fix or escalate every MAJOR. Log MINOR/NIT and leave them alone.
- [ ] Confirm the reviewer did not rewrite passing items — if it touched most of the batch, discard
      its edits and re-run it.

**Land and ship**
- [ ] Write one **new** batch file per subject at
      `content/questions/<subject>/YYYY-MM-DD-HHMM-<descriptive-name>.json`; canonical key order; no
      existing item modified; nothing appended to `core.json`.
- [ ] Confirm the filename conforms: lowercase, kebab-case, hyphens only, zero-padded date and
      `HHMM`, and the same date-time prefix reused across every subject file in this batch.
- [ ] Confirm no staging or rejected `.json` file was left anywhere under `content/questions/`.
- [ ] Re-run the validator across the whole tree; run `npm run typecheck` and `npm run build`.
- [ ] Confirm `QUESTION_BANK.length` matches the expected new total.

**Report** (mandatory — every batch ends with this)
- [ ] Received · imported · rejected, with rejection reasons broken out.
- [ ] OCR fixes applied · answer corrections made · duplicates removed.
- [ ] Answer-letter distribution (batch and post-merge bank).
- [ ] Difficulty distribution · `examLevel` distribution.
- [ ] Items needing owner attention: `VERIFY` references, ambiguity escalations, known-open defects
      encountered.
- [ ] Updated baselines recorded for the next batch's balance plan.

---

# Standing rules that bound this pipeline

- **Quality beats quantity, always.** The objective is the best CSE reviewer available, not the
  largest bank. A user who answers incorrectly must finish the explanation feeling smarter.
- **Historical content is frozen.** Existing items change only on the owner's explicit request or to
  fix a confirmed error. Deactivate, never delete — attempt records reference question ids.
- **Never modify existing tags; never do a repo-wide tag cleanup.** Per-subject consistency outranks
  global consistency.
- **Never fabricate a citation, a section number, or a statistic.** `VERIFY` and escalate.
- **Never inflate difficulty to hit a quota.** Report the skew; fix it at the sourcing stage.
- **Never trust a source's answer key.**
- **The repo wins over prose docs.** Precedence: `src/types/index.ts` →
  `scripts/validate-questions.mjs` → existing datasets → app behaviour. `CLAUDE.md` is stale on
  question count, content file paths, and the schema field list; never cite it as schema authority.
