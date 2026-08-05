# AceCSE Question JSON Specification

**Status:** authoritative content-format reference.
**Schema authority order:** `src/types/index.ts` → `scripts/validate-questions.mjs` → existing datasets → app behaviour.
`CLAUDE.md` is **not** schema authority (known stale on question count, content paths, and the field list).

All figures marked *(observed)* were computed from the live corpus of **424 items** across the five
`content/questions/<subject>/core.json` files as of 2026-08-05.

---

## 1. Where content lives

```
AceCSE/content/questions/
  analytical/core.json            81 items
  clerical/core.json              53 items
  general-information/core.json   92 items
  numerical/core.json             93 items
  verbal/core.json               105 items
```

Each file is a **JSON array of question objects** at the root. UTF-8, 2-space indent, no trailing
commas, no comments.

The runtime bank (`src/data/questionBank.ts`) discovers files with a lazy
`import.meta.glob('../../content/questions/**/*.json')` — each file becomes its own on-demand,
content-hashed chunk — plus a build-time supply manifest
(`scripts/vite-plugin-question-manifest.ts`), so **any** `.json` file placed in one of the five
subject directories above is picked up with no code change. The build-time validator walks the same
tree recursively.

**The directory is load-bearing:** questions are fetched by subject directory at runtime, so every
question in a file must carry the subject its directory maps to (`numerical/` ⇒ "Numerical
Reasoning", etc.). The validator fails a batch whose subject and directory disagree, and rejects
files outside the five subject directories.

`core.json` is each subject's **baseline** file — the historical accumulation. It is **not** where new
work goes. Every new batch is committed as its own file in the subject directory, named
`YYYY-MM-DD-HHMM-<descriptive-name>.json`, for example
`content/questions/numerical/2026-08-06-0900-cse-review-book-1.json`. **Never append a batch directly
to `core.json`.** The naming standard and its rationale are specified in `MASTER_GUIDE.md` §8.1; the
operating procedure is in `CONTENT_PIPELINE.md`.

Only validated, accepted batches may live under `content/questions/` — the glob ships everything it
finds there. Staging output and rejected items belong outside that tree.

---

## 2. Canonical field order

Keys are emitted in this exact order. Optional keys are omitted entirely when unused — never written
as `null` or `""`.

```
id
examLevel
subject
topic
subtopic
difficulty
passage?        ← when present, ALWAYS immediately before `question`
question
choices
correctOptionId
explanation
steps?
distractorExplanations
tip
reference?
tags
```

*(observed)* Confirmed empirically. Every one of the 37 items carrying a `passage` places it between
`difficulty` and `question` — 37/37, no exceptions. The eight distinct key orders present in the
corpus are all consistent with the template above except for one legacy cluster:

> **Known anomaly (do not replicate, do not fix):** `verb-0037` … `verb-0042` and `seed-verb-004`
> (7 items) serialize `explanation` **last**, after `tags`. JSON object key order is semantically
> irrelevant and Decision 4 freezes historical content, so these stay as-is. New items use the
> canonical order above.

---

## 3. Field reference

Legend: **R** = required by the validator · **C** = conditionally required · **O** = optional ·
**Rc** = required by convention (validator does not enforce, but the corpus is at 100% and reviewers do).

| # | Field | Type | Req | Rules |
|---|-------|------|-----|-------|
| 1 | `id` | `string` | **R** | Non-empty. Unique across the **entire bank**, not just the file. Format in §4. |
| 2 | `examLevel` | `'Professional' \| 'Subprofessional' \| 'Both'` | **R** | Exact enum. Determined by subject, not by the source exam's label — see §5. |
| 3 | `subject` | enum (5) | **R** | `Numerical Reasoning`, `Verbal Ability`, `Analytical Reasoning`, `Clerical Ability`, `General Information`. Exact strings, exact casing. Must match the directory it lives in. |
| 4 | `topic` | `string` | **R** | Non-empty. Drawn from the established per-subject topic list (§6) — do not invent new topics without owner sign-off. Drives the `steps` requirement for Analytical. |
| 5 | `subtopic` | `string` | **Rc** | Optional in `types/index.ts`; if present the validator requires a **non-empty** string. *(observed)* present on **424/424 items (100%)** in every subject → **treat as required**. Finer-grained than `topic`, Title Case, e.g. `"Simple Interest"`, `"Nothing-Before-Something (Initials vs Full Names)"`. 306 distinct values exist; reuse an existing one when it fits. |
| 6 | `difficulty` | `'Easy' \| 'Medium' \| 'Hard'` | **R** | Exact enum. Must reflect real solving effort (§9). |
| 7 | `passage` | `string` | **O** | Stimulus text: reading passage, puzzle setup, code/data table. Include only when the item genuinely cannot be read without it. If two items share a stimulus, **repeat the full passage text in both** — passages are never referenced by id. Newlines with `\n` are house style for tables and sentence lists. |
| 8 | `question` | `string` | **R** | **≥ 10 characters** (validator). The stem alone; never fold the option list into it. Multi-line stems (`P.`/`Q.`/`R.`/`S.` sentence lists, series with `…`) use `\n`. |
| 9 | `choices` | `QuestionChoice[]` | **R** | Exactly 4. See §7. |
| 10 | `correctOptionId` | `'A' \| 'B' \| 'C' \| 'D'` | **R** | Must be one of the four letters. Balanced database-wide, not per batch (§8). |
| 11 | `explanation` | `string` | **R** | **≥ 100 characters** (validator). Teaching prose, never a restatement. Length targets in §10. |
| 12 | `steps` | `string[]` | **C** | Required (**≥ 2 entries**) for computational items — see §11. When present at all: array of strings, each **≥ 3 characters**. |
| 13 | `distractorExplanations` | `Partial<Record<OptionId, string>>` | **R** | Must be a non-null object. Must contain a **≥ 20-character** string under **each of the three wrong letters**, and must **not** contain a key for `correctOptionId`. See §12. |
| 14 | `tip` | `{ label: string; text: string }` | **R** | `label` non-empty and from the closed set in §13; `text` **≥ 10 characters**. |
| 15 | `reference` | `string` | **C / Rc** | Not validator-enforced. **Mandatory by convention for General Information — 92/92 = 100% coverage** *(observed)*. See §14 for per-subject expectations and formats. |
| 16 | `tags` | `string[]` | **R** | Must be an array (validator accepts an empty array; the corpus never has one — min 2, median 4). Per-subject conventions in §15. |
| — | `source` | `string` | **O** | Declared in `types/index.ts` for "where the item was researched from, when distinct from `reference`". *(observed)* **used by 0/424 items.** Do not start using it without owner sign-off. |

### `QuestionChoice`

```ts
{ id: 'A' | 'B' | 'C' | 'D'; text: string }
```

---

## 4. `id` format

`<prefix>-<4-digit zero-padded sequence>` — lowercase, single hyphen.

| Directory | Subject | Prefix | Padding | Current max | **Next free id** |
|---|---|---|---|---|---|
| `analytical/` | Analytical Reasoning | `ana` | 4 | `ana-0078` | **`ana-0079`** |
| `clerical/` | Clerical Ability | `cler` | 4 | `cler-0050` | **`cler-0051`** |
| `general-information/` | General Information | `gen` | 4 | `gen-0089` | **`gen-0090`** |
| `numerical/` | Numerical Reasoning | `num` | 4 | `num-0088` | **`num-0089`** |
| `verbal/` | Verbal Ability | `verb` | 4 | `verb-0100` | **`verb-0101`** |

Rules:

- Sequences are **dense** — *(observed)* zero gaps in all five subjects. Never reuse an id, never
  renumber, never backfill a gap (there are none; if one ever appears, leave it).
- ids are permanent: `Attempt` records in user history reference question ids. Decision 4 —
  **prefer deactivating over deleting.**
- **Legacy `seed-*` exception:** 19 original bootstrap items use `seed-<prefix>-<3-digit>`:
  `seed-ana-001…003`, `seed-cler-001…003`, `seed-gen-001…003`, `seed-num-001…005`,
  `seed-verb-001…005`. These are valid, frozen, and numbered independently of the main sequence.
  **Never mint a new `seed-*` id.**

---

## 5. `examLevel` by subject (CSC blueprint, not the source exam's label)

| Subject | Permitted `examLevel` | *(observed)* |
|---|---|---|
| Clerical Ability | `Subprofessional` **only** — never Professional; not tested at Pro level | 53/53 Subprofessional |
| Analytical Reasoning | `Professional` or `Both` — **never** `Subprofessional` | 66 Professional / 15 Both |
| Numerical Reasoning | `Both` | 93/93 Both |
| Verbal Ability | `Both` | 105/105 Both |
| General Information | `Both` | 92/92 Both |

Within Analytical, `Both` is used for items an entry-level examinee can genuinely solve (mostly
`Number and Letter Pattern`, 9 of 20). `Assumption and Conclusion` and `Word Analogy` are 100%
`Professional`.

**Consequence of the blueprint:** a spelling item cannot be imported from a Professional-only source
as a Professional item. Either file it as Clerical (`Subprofessional`) or reject it.

---

## 6. Established topics (`topic` values in use)

Reuse these. Inventing a topic fragments the practice-mode filters.

**Numerical Reasoning** (20): Percentages · Number Series · Fractions · Data Interpretation ·
Geometry · Ratio and Proportion · Probability · Work Rate · Distance, Speed, Time · Averages ·
Basic Algebra · Statistics · Simple and Compound Interest · Decimals · Mixture Problems ·
Money and Finance · Number Theory · Age Problems · Exponents and Roots · Order of Operations

**Verbal Ability** (6): Grammar & Usage · Vocabulary · Reading Comprehension ·
Paragraph Organization · Sentence Completion · Error Identification

**Analytical Reasoning** (5): Number and Letter Pattern · Logical Reasoning ·
Ordering and Arrangement · Word Analogy · Assumption and Conclusion

**Clerical Ability** (4): Filing & Alphabetizing · Spelling · Clerical Operations ·
Office Procedures & Correspondence

**General Information** (9): 1987 Constitution · RA 6713 Code of Conduct ·
Environment Management and Protection · Human Rights and Peace · Philippine History ·
Philippine Government Structure · Philippine Geography ·
Philippine Culture and National Symbols · Philippine Economics and Taxation

### Taxonomy rules that are not obvious from the schema

1. **Word analogy is Analytical Reasoning, not Verbal Ability.** Source exams routinely print
   analogies in the verbal section; AceCSE files them under `Analytical Reasoning` /
   `Word Analogy`.
2. **Assumption / conclusion evaluation is Analytical Reasoning** — even when the source wraps it
   in a short reading stimulus. The test is the *skill*: drawing or evaluating a logical conclusion,
   or identifying an unstated premise → Analytical. Extracting meaning, main idea, or details from
   a passage → `Verbal Ability` / `Reading Comprehension`.
3. **Spelling and alphabetical filing are Clerical Ability** (hence Subprofessional-only).

### Off-blueprint — reject, do not file

- Pure basic-science items (human organs, photosynthesis, conservation of mass).
- Figural / spatial reasoning (rotating arrows, shape sequences, odd-figure-out). There is **no
  image field** in the schema; figural items cannot render.

A science-adjacent item is acceptable only when it directly supports an existing statutory strand —
e.g. an atmospheric-composition item supporting the RA 8749 clean-air strand was accepted.

---

## 7. Choice rules

- **Exactly 4** choice objects. Five-option source items require a 5→4 reduction: drop the least
  plausible distractor, keep the ones encoding real misconceptions. Use the reduction as a chance to
  remove ambiguity (two defensible options is a defect, not a hard item).
- `id`s must be **exactly `["A","B","C","D"]` in that array order** — the validator compares the
  serialized array, so `A,B,D,C` or a missing letter is fatal.
- **No duplicate `text`** after `.trim().toLowerCase()`.
- **No empty `text`.**
- Option text is short and parallel — *(observed)* median 13 characters, range 1–160. Keep the four
  options grammatically parallel and of similar length; a conspicuously longer option leaks the key.
- Do not reorder options to hit an answer-letter target after the item is written; choose the target
  letter first (§8) and build the option list around it.

---

## 8. Answer-letter balance

**Balance the entire database over time, never each batch in isolation.** Before generating a batch,
compute the current A/B/C/D counts bank-wide and bias the new batch toward the underrepresented
letters. Never impose a repeating pattern (no `ABCDABCD`); natural randomness is preferred.

Current standings *(observed, 2026-08-05)*: **A=105 B=112 C=107 D=100** (total 424).
→ `D` is the most underrepresented letter, `B` the most over-supplied.

`npm run validate:questions` prints the live standings on every run.

---

## 9. Difficulty

Enum: `Easy` | `Medium` | `Hard`. **Difficulty must reflect actual solving effort and is never
inflated to hit a quota.** If a batch skews easy because the source was entry-level, ship it honest
and report the skew.

Bank target ≈ **25 / 50 / 25**. *(observed)* actual is **Easy 130 (30.7%) / Medium 214 (50.5%) /
Hard 80 (18.9%)** → future sourcing should favour **Hard**.

Rough calibration:
- **Easy** — one rule, one step, no trap. Direct recall or a single arithmetic operation.
- **Medium** — two or three chained steps, or one rule plus a live misconception the distractors exploit.
- **Hard** — multiple interacting rules, a non-obvious setup, or a distractor that survives a
  plausible-but-wrong full procedure.

---

## 10. Length floors and house targets

The validator floors are hard build gates. The house targets are the editorial standard; *(observed)*
medians are computed over all 424 items.

| Field | Validator floor | **Observed median** | Observed IQR | House target |
|---|---|---|---|---|
| `question` | ≥ 10 chars | **101** | — | as short as the stem allows |
| `explanation` | ≥ 100 chars | **555** | 494–607 | **400–700** |
| each `distractorExplanations` note | ≥ 20 chars | **158** | 130–184 | **90–220** |
| `tip.text` | ≥ 10 chars | **172** | 155–188 | **100–220** |
| each `steps` entry | ≥ 3 chars | **66** | — | one discrete operation, full sentence |
| `steps` array length | ≥ 2 (when required) | **4** | — | **3–5** |
| `passage` | — | **249** | — | 110–700 |
| `choices[].text` | non-empty | **13** | — | keep the four parallel |

Per-subject medians *(observed)* — match the subject you are appending to:

| Subject | n | `explanation` | distractor note | `tip.text` | items with `steps` | median `steps` len |
|---|---|---|---|---|---|---|
| Analytical Reasoning | 81 | 494 | 113 | 183 | 78 (96%) | 4 |
| Clerical Ability | 53 | 539 | 125 | 173 | 30 (57%) | 5 |
| General Information | 92 | **609** | **196** | 177 | 0 (0%) | — |
| Numerical Reasoning | 93 | 509 | 160 | 162 | 93 (100%) | 4 |
| Verbal Ability | 105 | 586 | 157 | 172 | 11 (10%) | 4 |

General Information runs longest on both explanation and distractor notes — legal items need the
provision unpacked. Analytical runs the shortest distractor notes because the mis-step is usually
one sentence.

---

## 11. `steps` — conditional requirement

The validator's `needsSteps(q)`:

```js
if (q.subject === 'Numerical Reasoning') return true;
if (q.subject === 'Analytical Reasoning' && !/analog/i.test(q.topic ?? '')) return true;
return false;
```

So `steps` (array, **≥ 2 entries**) is **REQUIRED** when:

- `subject === 'Numerical Reasoning'` — always; or
- `subject === 'Analytical Reasoning'` **and** `topic` does **not** match `/analog/i`
  (i.e. every Analytical topic except `Word Analogy`).

It is **optional everywhere else** (Verbal, Clerical, General Information), and optional for
Analytical `Word Analogy`. Whenever `steps` is present — required or not — every entry must be a
string of **≥ 3 characters**.

*(observed)* Word Analogy is split: 10 of 13 analogy items carry `steps` voluntarily
(`ana-0001`…`ana-0010`), 3 do not (`ana-0065`, `ana-0066`, `ana-0078`). Both are legal. General
Information has **never** used `steps` — keep it that way.

### Step prose conventions *(observed — they differ by subject; match your file)*

| Subject | Prefix pattern | Counts |
|---|---|---|
| Numerical Reasoning | **no prefix** — plain sentences | 93/93 unprefixed |
| Analytical Reasoning | **`"Step 1: "`** (colon) | 74 colon / 4 unprefixed |
| Clerical Ability | **`"Step 1 — "`** (em dash) | 18 em dash / 12 unprefixed |
| Verbal Ability | **`"Step 1 — "`** (em dash) | 11/11 em dash |

> Note: `brief.md` describes the non-computational prefix as `"Step 1 — "` and cites `verb-0037`.
> That is accurate for Verbal and Clerical, but **Analytical actually uses a colon** (`"Step 1: "`)
> by a 74-to-4 margin. Follow the file you are appending to.

Content rules: one discrete operation per entry, full sentences, arithmetic shown inline with real
typographic operators (`×`, `÷`, `–`, `≈`, `→`, `²`, `₱`), and the **final entry restates the
answer**.

---

## 12. `distractorExplanations`

```jsonc
"distractorExplanations": {
  "A": "…", "C": "…", "D": "…"   // when correctOptionId is "B"
}
```

- Must be a non-null object.
- Must key **exactly the three wrong option letters**, each with a string of **≥ 20 characters**.
- Must **not** contain a key for `correctOptionId` — that is a fatal error, not a warning.
  *(observed)* 424/424 items comply.
- Key order follows A→B→C→D with the correct letter skipped.

Each note names the **specific mis-procedure or misconception that produces that exact option** —
why it is tempting, then why it fails. Banned: "This is incorrect", "The correct answer is X",
"Not supported by the passage" as the entire note. These render to the learner prefixed with
**"Your choice."** when they picked that option, so each note must read well standalone.

---

## 13. `tip` — closed label set

```jsonc
"tip": { "label": "Exam Tip", "text": "…" }
```

`label` must be one of *(the established closed set — do not invent new labels)*:

`Exam Tip` · `Remember` · `Common Mistake` · `Grammar Rule` · `Law Reminder` ·
`Constitution Reminder` · `Formula` · `Pattern Recognition` · `Logic Rule` · `Math Shortcut` ·
`Filing Rule` · `Vocabulary Trick` · `Mnemonic` · `Spelling Pattern` · `Historical Note`

*(observed)* usage: Exam Tip 87 · Remember 43 · Common Mistake 37 · Grammar Rule 33 ·
Pattern Recognition 26 · Logic Rule 26 · Formula 26 · Law Reminder 26 · Math Shortcut 23 ·
Constitution Reminder 23 · Vocabulary Trick 20 · Mnemonic 16 · Filing Rule 15 · Spelling Pattern 12 ·
Historical Note 10.

> **One off-set label exists in the corpus:** `ana-0006` uses `"Degree of Intensity"`. It is frozen
> under Decision 4. It is **not** an extension of the set — do not copy it.

`tip.text` must be a **reusable strategy that helps on future items**, not a restatement of this one.
Compressed contrast pairs are the house favourite: *"Senate = 6 years, max 2 consecutive terms;
House = 3 years, max 3 consecutive terms."*

---

## 14. `reference`

Not validator-enforced. Coverage expectations *(observed)*:

| Subject | Coverage | Expectation |
|---|---|---|
| General Information | **92/92 = 100%** | **Mandatory by convention.** Every GI item cites its provision or authority. |
| Verbal Ability | 50/105 = 48% | Required for Grammar & Usage (34/37) and Error Identification (7/7); rare for Reading Comprehension (1/14) and never for Paragraph Organization (0/11). |
| Clerical Ability | 24/53 = 45% | Required for Office Procedures & Correspondence (8/8) and normal for Filing & Alphabetizing (16/21). Never used for Spelling (0/13) or Clerical Operations (0/11). |
| Analytical Reasoning | 0/81 = 0% | Not used. |
| Numerical Reasoning | 0/93 = 0% | Not used. |

House formats:

```
1987 Constitution, Art. VI, Sec. 4
1987 Constitution, Art. VIII, Sec. 4(1)
RA 6713, Sec. 4(A)(c)
RA 8749, Sec. 9
RA 9003 (Ecological Solid Waste Management Act of 2000), Sec. 37
ARMA International Filing Rules, Rule 1 (Letter-by-Letter).
ARMA Rule 5; CSC Records Management Guidelines.
CSC MC No. 1, s. 2017 (Revised Personal Data Sheet); CSC Form 212 Instructions.
Subject-Verb Agreement: Collective Nouns and Indefinite Pronouns
```

Legal/constitutional citations are verified against primary sources (lawphil.net, the Supreme Court
E-Library, csc.gov.ph, DENR-EMB for environmental statutes). **Never invent a section number.** If a
provision cannot be verified, write the explanation without a citation and set
`"reference": "VERIFY"` so the orchestrator catches it. *(observed)* there are currently **0**
`"VERIFY"` markers in the bank — do not leave one in a merged file.

> **Known outstanding defect — do not silently fix.** `gen-0024`, `gen-0029`, and `gen-0032` cite the
> wrong RA 6713 subsection letters (and `gen-0024`'s body miscites professionalism). The statute's
> Sec. 4(A) runs (a) commitment to public interest, (b) professionalism, (c) justness and sincerity,
> (d) political neutrality, (e) responsiveness to the public, (f) nationalism and patriotism,
> (g) commitment to democracy, (h) simple living. **New items use the correct letters**; the old ones
> await the owner's explicit go-ahead.

---

## 15. `tags` — per-subject conventions (they differ on purpose)

**Per-subject consistency outranks global consistency.** Never modify an existing item's tags, never
rename a tag, never run a repo-wide tag cleanup. New items match the convention of **their own
subject file**.

| File | Convention | Examples *(observed)* |
|---|---|---|
| `general-information/core.json` | **lowercase space-separated phrases**, with real capitalisation preserved for statutes and acronyms | `constitution`, `bill of rights`, `norms of conduct`, `RA 6713`, `CHR`, `supreme court`, `civilian supremacy` |
| `verbal/core.json` | **kebab-case** | `subject-verb-agreement`, `context-clues`, `reading-comprehension`, `civic-context` |
| `numerical/core.json` | **kebab-case**, but **established uppercase acronym tags are preserved** | `word-problems`, `percentage-change`, `distance-speed-time`, and `LCM`, `GCF`, `PEMDAS` |
| `clerical/core.json` | **kebab-case**; proper nouns keep their capitals | `nothing-before-something`, `letter-by-letter`, `Filipino-surnames`, `Villa-surnames`, `San`, `De` |
| `analytical/core.json` | **kebab-case** *and* uniquely **includes the difficulty as the last tag** (`easy` / `medium` / `hard`) | `["ordering","arrangement","linear","easy"]` |

**The difficulty tag belongs to Analytical only.** *(observed)* 68 of 81 analytical items carry it
(the 10 earliest `ana-00xx` analogy items and the 3 `seed-ana-*` items predate the convention), it is
**always the final element**, it **always matches the `difficulty` field** (0 mismatches), and **0 of
the 343 non-analytical items** carry one. Do not add difficulty tags in any other subject.

Count: 2–7 tags, *(observed)* median 4 (Analytical/Clerical/GI median 4; Numerical/Verbal median 3).
Order runs broad → narrow: topic tag, subtopic tag, then the specific rule or trap.

---

## 16. Duplication policy

The validator only catches **exact** duplicates: the normalized stem (`\s+`-collapsed, trimmed,
lowercased) joined with the four lowercased choice texts. Editorial dedup is stricter and mandatory:

- **Reject an item when an existing item already tests the same concept at the same difficulty**,
  even if wording and numbers differ. A father/son age problem structurally identical to an existing
  one with new numbers is a duplicate.
- **Cap ≈ 2–3 items bank-wide per logical form or rule.** A fourth modus tollens item is a reject.
  Count what exists before adding.
- **Deliberate exception — shared stem templates are house style, not duplication.** Reuse the
  canonical stem rather than inventing a paraphrase. *(observed)* live templates:
  `"Which of the following is the correctly written sentence?"` (4×),
  `"Which of the following words is spelled CORRECTLY?"` (3×),
  `"Which of the following words is MISSPELLED?"` (2×),
  `"Which sentence is grammatically correct?"` (2×).
  The stem repeats; the four options must differ, or the exact-duplicate gate fires.

---

## 17. Typography

The house voice uses real typographic characters, not ASCII substitutes. *(observed)* in use:
`—` (1438) `×` (658) `₱` (593) `→` (387) `÷` (256) `–` (236) `−` (179) `²` (147) `≈` `≠` `π` `↔`
`³` `°` `…` `½` `¾` `⅝` `√` `≥` `∩` `⊆` `¬` `✓` `✗`.

Use `×` not `x`, `÷` not `/` for division prose, `₱` not `P` or `PHP`, `–` for numeric ranges,
`—` for parenthetical breaks. Files are UTF-8; do not escape these as `\uXXXX`.

---

## 18. Verification standard

- **Numerical answers: recompute programmatically**, never by inspection.
- **Ordering / logic puzzles: solve by exhaustive search** and confirm the keyed option is the only
  valid one among the four offered.
- **Legal / constitutional citations: verify against primary sources.** If unverifiable, escalate —
  never guess a section number.
- **Never trust a source's supplied answer key.** Derive every answer independently.

---

## 19. How to validate

```bash
# 1. JSON well-formedness (per file, fastest failure)
python3 -m json.tool content/questions/numerical/core.json > /dev/null

# 2. Full structural + teaching-quality gate (this is the build gate)
npm run validate:questions

# 3. Types still compile
npm run typecheck
```

`npm run validate:questions` prints supply by subject, the difficulty split, and the live A/B/C/D
answer-letter standings, then either lists up to 50 errors and exits `1`, or prints
`✓ Question bank passes all structural and teaching-quality gates.`

### Every gate the validator enforces

Structural (fatal): file parses as JSON · root is an array · `id` present and non-empty ·
`id` unique bank-wide · `examLevel` in enum · `subject` in enum · `difficulty` in enum ·
`topic` non-empty string · `subtopic` non-empty string *when present* · `question` ≥ 10 chars ·
`tags` is an array · exactly 4 `choices` · choice ids exactly `A,B,C,D` in order · no duplicate
choice text · no empty choice text · `correctOptionId` in `A|B|C|D` · no duplicate normalized
stem + choice-text key.

Teaching-quality (equally fatal): `explanation` ≥ 100 chars · `steps` ≥ 2 entries for computational
items (`needsSteps`) · every `steps` entry a string ≥ 3 chars · `distractorExplanations` is a
non-null object · each of the three wrong letters has a note ≥ 20 chars · `distractorExplanations`
excludes the correct letter · `tip` is an object with a non-empty `label` and `text` ≥ 10 chars.

### Second, looser gate: runtime load

`src/data/questionBank.ts` re-validates at load and **silently drops** failing items (with a
`console.warn` in dev only). It checks: object shape, non-empty `id`, non-empty `question`,
`explanation` is a string, `subject` is a string, `topic` is a string, `examLevel` in enum,
`difficulty` in enum, `choices` is an array of exactly 4 objects each with an id in `A|B|C|D` and a
string `text`, `correctOptionId` in `A|B|C|D`, `tags` is an array. It then drops duplicate ids,
keeping the first occurrence in path-sorted order.

This gate is **looser** than the build validator in every respect (no length floors, no `tip`, no
`distractorExplanations`, no choice-order check, no `subtopic` check) — but it drops silently in
production. Anything that passes `npm run validate:questions` passes it. Never rely on it.

---

## 20. One perfect example

A single Clerical Ability item exercising the maximum field surface — `passage`, `steps`, and
`reference` all present — at genuine `Hard` difficulty. *(No item in the live corpus currently
carries all three at once; this composes the house patterns from `cler-0042` (passage + steps),
`cler-0009` (hyphen rule + ARMA reference), and `num-0004` (misconception distractors).)*

```json
{
  "id": "cler-0051",
  "examLevel": "Subprofessional",
  "subject": "Clerical Ability",
  "topic": "Filing & Alphabetizing",
  "subtopic": "Hyphenated Surnames with Letter-by-Letter Tie-Breaking",
  "difficulty": "Hard",
  "passage": "A records officer must file the following four personnel folders in standard alphabetical order:\n\n  Reyes, Anna Marie\n  Reyes-Cruz, Ana\n  Reyes, Ana\n  Reyes, Ana Maria",
  "question": "Which folder is filed THIRD?",
  "choices": [
    { "id": "A", "text": "Reyes, Ana" },
    { "id": "B", "text": "Reyes, Ana Maria" },
    { "id": "C", "text": "Reyes-Cruz, Ana" },
    { "id": "D", "text": "Reyes, Anna Marie" }
  ],
  "correctOptionId": "D",
  "explanation": "Three filing rules interact here, and they must be applied in sequence — unit by unit, left to right. First, a hyphenated surname is indexed as ONE unit with the hyphen dropped, so \"Reyes-Cruz\" becomes the single unit REYESCRUZ, not REYES followed by CRUZ. Second, \"nothing before something\": when one unit is an exact prefix of another, the shorter unit files first, so REYES precedes REYESCRUZ and all three plain Reyes folders sort ahead of Reyes-Cruz. Third, the surviving tie among the three Reyes folders is broken on the second unit, compared letter by letter: ANA, ANA, ANNA. ANA and ANA tie, so their third units decide — nothing (Reyes, Ana) files before MARIA (Reyes, Ana Maria). ANNA loses to both at the third letter, where N follows A. The full sequence is Reyes, Ana → Reyes, Ana Maria → Reyes, Anna Marie → Reyes-Cruz, Ana, which puts Reyes, Anna Marie third.",
  "steps": [
    "Step 1 — Index each name into units, dropping punctuation: REYES | ANNA | MARIE, REYESCRUZ | ANA, REYES | ANA, and REYES | ANA | MARIA.",
    "Step 2 — Compare the first unit. REYES is an exact prefix of REYESCRUZ, so by \"nothing before something\" the three REYES folders all precede Reyes-Cruz, which takes 4th.",
    "Step 3 — Break the three-way REYES tie on the second unit, letter by letter: ANA = ANA, and ANA vs ANNA splits at the third letter, where A precedes N. So both ANA folders outrank ANNA.",
    "Step 4 — Break the remaining ANA tie on the third unit: Reyes, Ana has no third unit, and nothing files before MARIA, so Reyes, Ana is 1st and Reyes, Ana Maria is 2nd.",
    "Step 5 — Final order: Reyes, Ana (1st) → Reyes, Ana Maria (2nd) → Reyes, Anna Marie (3rd) → Reyes-Cruz, Ana (4th). The third folder is Reyes, Anna Marie."
  ],
  "distractorExplanations": {
    "A": "Reyes, Ana files FIRST, not third. It wins every comparison it enters: it ties on REYES, ties again on ANA, and then wins on \"nothing before something\" because it has no third indexing unit at all. Choosing it usually means counting from the wrong end of the sequence.",
    "B": "Reyes, Ana Maria files SECOND. It is easy to push it to third by assuming MARIA and MARIE tie on their first four letters and then reading the two names as interchangeable — but the two folders never reach a MARIA-vs-MARIE comparison, because the contest is already settled one unit earlier at ANA vs ANNA.",
    "C": "Reyes-Cruz, Ana files LAST. This option is chosen by treating the hyphen as a unit break, which turns the name into REYES | CRUZ and makes it look like just another Reyes folder sorting on CRUZ. Hyphenated surnames are indexed as a single unit, so the comparison is REYES vs REYESCRUZ, and the longer unit always follows."
  },
  "tip": {
    "label": "Filing Rule",
    "text": "Index first, compare second. Strip hyphens and apostrophes into one solid unit (Reyes-Cruz → REYESCRUZ, O'Brien → OBRIEN), then walk the units left to right and stop at the first difference. When one unit runs out, nothing beats something: Reyes < Reyes Ana < Reyes-Cruz."
  },
  "reference": "ARMA International Filing Rules, Rule 7 (Hyphens in Personal Names); Rule 4 (Nothing Before Something).",
  "tags": ["filing", "alphabetizing", "hyphenated-surnames", "nothing-before-something", "letter-by-letter"]
}
```

**Why this item is exemplary**

- The `passage` carries data the stem genuinely cannot hold, and the stem stays one line.
- `explanation` names three rules and the order they apply in — it teaches the *procedure*, so the
  learner can file any four names afterwards, not just these.
- `steps` is five discrete operations; the last one restates the answer. Clerical's `"Step N — "`
  em-dash prefix is used, matching the file.
- Each distractor note names the exact wrong move that produces it (miscounting the sequence,
  a MARIA/MARIE comparison that never happens, splitting the hyphen) — never "this is incorrect".
- `tip` is portable: it gives the index-then-compare procedure and a worked ordering the learner can
  carry to the next item.
- `reference` cites two specific ARMA rules in house format; `Hard` is honest (three interacting
  rules); `correctOptionId` is `D`, the currently underrepresented letter.
