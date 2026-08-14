# POST-MIGRATION AUDIT

**Repository:** [jeloualonzo/AceCSE](https://github.com/jeloualonzo/AceCSE)  
**Branch:** `phase4-booklet`  
**Starting SHA:** `a0525079c64f775f35f234d118faa46419b424c0`  
**Audit scope:** Claimed Gemini post-migration taxonomy, classification manifest, semantic pools, fixed-set architecture, runtime behavior, and future-AI contract  
**Production migration performed by this audit:** No  
**Verdict:** **MAJOR ISSUES**

## Executive verdict

The claimed Gemini post-migration architecture is **not present on the audited branch**. The branch is still at the prior Manus audit commit, `a0525079c64f775f35f234d118faa46419b424c0`; it contains no `content/taxonomy/` directory, no `taxonomy.json`, no `classification-manifest.json`, no semantic pool indexes, and no post-migration `AI_CONTENT_GUIDE.md`.

This is a **critical implementation gap**, not a minor documentation discrepancy. The current application still loads `content/questions/**/*.json` and `content/groups/**/*.json`, and the exam engine still samples through the 33 historical groups. The original problem therefore remains reproducible: pool-like historical groups can be partially selected, including one-question remnants, and singleton questions have no runtime question-type metadata.

The existing bank itself remains structurally healthy. All 688 questions are present with unique IDs, all 33 groups resolve, the eight true fixed groups remain atomic and whole, all 688 questions retain five choices and valid answer keys, and the existing validator, typecheck, automated tests, and production build pass. These successes do **not** prove that the claimed taxonomy migration exists or that semantic pool selection is active.

> **Freeze recommendation:** Do not freeze this taxonomy and do not begin question **#689** based on the claimed migration. The architecture must be implemented and audited again.

## Starting state and scope

The branch was synchronized with `git fetch origin`, `git checkout phase4-booklet`, and `git pull --ff-only origin phase4-booklet`. The starting branch was `phase4-booklet`, the working tree was clean, and the latest reachable commit was:

```text
a052507 docs: add independent content taxonomy audit
```

The audit did not reset history, force-push, modify `main`, rewrite production questions, alter choices or answer keys, change the UI, change Firebase, or change grading. A temporary runtime test was created outside the final change set, used to generate ten real simulations, and then removed.

## Bank integrity

| Check | Result | Assessment |
|---|---:|---|
| Historical question files | 27 | Present |
| Question records | 688 | Confirmed |
| Unique question IDs | 688 | No duplicates |
| Missing question IDs | 0 | None detected |
| Explicit groups | 33 | Confirmed |
| Grouped questions | 217 | Confirmed |
| Singleton questions | 471 | Confirmed |
| Unresolved group references | 0 | None detected |
| Overlapping group memberships | 0 | None detected |
| Exact five-choice records | 688 | All are A–E |
| Correct answer exists | 688 | All keys resolve to a choice |
| Four distractor explanations | 688 | All present |
| References | 243 | Preserved |
| Source-field values | 0 | No source metadata values exist |

The clean-branch validation suite passed as follows: `npm run validate:questions`, `npm run typecheck`, and all six test files containing 84 tests. The production build also passed, with a Vite warning about large chunks.

## Claimed architecture versus actual repository

| Claimed artifact | Expected path | Actual state |
|---|---|---|
| Canonical taxonomy | `content/taxonomy/taxonomy.json` | **Missing** |
| 688-row classification map | `content/taxonomy/classification-manifest.json` | **Missing** |
| Semantic pool indexes | `content/taxonomy/pools/` | **Missing** |
| Future-AI contract | `content/taxonomy/AI_CONTENT_GUIDE.md` | **Missing** |
| Question-level `questionType` | All 688 records | 0 records |
| Question-level `questionFormat` | All 688 records | 0 records |
| Pool/fixed-set classification | All 688 records | 0 records |

The actual question records contain the established fields `subject`, `topic`, `subtopic`, `difficulty`, and content fields. They do not contain the claimed post-migration classification fields. Historical group files contain broad `questionType` values, but these cover only the old grouped items and are not a canonical classification layer.

## Critical and high-severity findings

| ID | Severity | Exact file or IDs | Finding | Why it matters | Required correction |
|---|---|---|---|---|---|
| PM-CRIT-001 | **CRITICAL** | Missing `content/taxonomy/` | The claimed taxonomy, manifest, 50 pool indexes, and AI guide are absent. The latest commit is the prior Manus audit, not a Gemini migration commit. | There is no canonical classification layer to validate or consume. | Implement or supply the claimed artifacts, then rerun this audit. |
| PM-HIGH-001 | **HIGH** | `src/data/questionBank.ts`; `src/lib/examEngine.ts` | Runtime still loads historical question and group files. No code references `content/taxonomy`, pool indexes, or a classification manifest. | The claimed canonical pool flow is not active. | Route generation through canonical pool indexes; retain historical groups only for provenance or true fixed sets. |
| PM-HIGH-002 | **HIGH** | `grp-syn-context-02`, `grp-syn-context-03`, `grp-filing-02` | Ten real simulations produced eight partial historical-group selections and three one-question remnants. One observed Clerical run selected `grp-filing-02` as **1/9**. | The original Set 1/Set 2 remnant bug remains possible. | Sample pool-like questions from compatible semantic pools, not historical groups. |
| PM-HIGH-003 | **HIGH** | All 688 question records | No question has `questionType`, `questionFormat`, pool classification, or fixed-group classification. | The engine cannot form semantic type blocks for singleton questions, and future AI agents have no machine-readable destination contract. | Add the 688-row manifest and wire it into runtime selection. |

## Runtime simulation audit

I generated ten real simulations from the current bank: five Professional simulations at 150 scored questions and five Subprofessional simulations at 145 scored questions, using seeds `post-audit-01` through `post-audit-05`.

| Runtime check | Result |
|---|---:|
| Sessions generated | 10 |
| Duplicate question IDs within sessions | 0 |
| Atomic fixed-group selections whole | 22/22 |
| Partial historical pool-like group selections | **8** |
| One-question historical multi-question remnants | **3** |
| Canonical pool selections | 0 |
| Semantic question-type blocks | Not implemented |

Observed partial selections included:

| Group | Selected | Full size | Example consequence |
|---|---:|---:|---|
| `grp-syn-context-03` | 1 | 9 | One contextual-synonym remnant |
| `grp-analogy-04` | 3 | 8 | Partial analogy template group |
| `grp-analogy-01` | 7 | 8 | Partial analogy template group |
| `grp-syn-context-02` | 1 | 9 | One contextual-synonym remnant |
| `grp-filing-02` | 5 | 9 | Partial filing template group |
| `grp-filing-02` | 1 | 9 | One-question filing remnant |

One observed Clerical sequence was effectively:

```text
Spelling: grp-spelling-01, 7/7
Clerical Operations singleton: cler-0042
Clerical Operations singleton: seed-cler-003
Spelling: grp-spelling-02, 7/7
Filing: grp-filing-01, 9/9
Office Procedures singleton: cler-0030
Filing: grp-filing-02, 1/9
```

This confirms that the motivating bug has **not** been solved. The eight true fixed-context groups are handled correctly as atomic and fixed-order blocks, but pool-like groups and singleton questions still flow through the historical group model.

## Fixed-set audit

The expected eight fixed groups are all present:

```text
grp-di-employment
grp-di-roadworks
grp-rc-public-trust
grp-rc-csc
grp-rc-property
grp-rc-careers
grp-rc-frontline
grp-rc-appointments
```

| Fixed-set property | Result |
|---|---:|
| Expected groups | 8 |
| Actual groups | 8 |
| All member IDs resolve | Yes |
| All have a shared content block | Yes |
| All use `atomic` selection | Yes |
| All use `fixed` order | Yes |
| All members share the repeated passage | Yes |
| Additional missed multi-question dependencies | None found |

The fixed-set portion of the current implementation is structurally sound. The problem is that these groups are not connected to the claimed new taxonomy layer because that layer is absent.

The 26 standalone contextual questions remain ungrouped, which is correct. A question-local passage, table, codebook, or puzzle setup does not automatically make a multi-question fixed set. However, those questions also have no manifest classification, so their future pool treatment is not machine-readable.

## Known corrections audit

| Correction | Expected state | Actual state |
|---|---|---|
| `ana-0038` | `letter_sequence` | No canonical format; historical group says `Number Sequence` |
| `ana-0040` | `letter_sequence` | No canonical format; historical group says `Number Sequence` |
| Direct vs contextual synonyms | Controlled distinction | Only inferable from subtopic/group history |
| Logical reasoning formats | Controlled categorical/conditional/disjunctive/chain/grid/deduction formats | Not represented in canonical metadata |
| Filing formats | Controlled filing formats | Not represented in canonical metadata |
| 26 standalone contextual questions | Independent, not artificial groups | No canonical classification layer |

The known corrections were identified in the prior audit but have not been implemented in the claimed post-migration layer because that layer does not exist.

## Future-AI authoring audit

The repository has an older `docs/content/AI_GENERATION_PROMPT.md`, `JSON_SPEC.md`, and `MASTER_GUIDE.md`. These documents preserve useful subject rules, including Word Analogy → Analytical Reasoning, Assumption/Conclusion → Analytical Reasoning, and Spelling/Filing → Clerical Ability. They do **not** provide the claimed post-migration taxonomy, 50 pool definitions, pool compatibility rules, or 688-row manifest.

A new AI could infer some destinations from existing documentation, but it could not reliably determine all of the following from the claimed post-migration contract because the contract is absent:

| Example | Result |
|---|---|
| Misspelled word | Inferable as Clerical / Spelling from legacy guidance |
| Direct synonym | Inferable only from existing subtopic/group history |
| Synonym in context | Inferable only from existing subtopic/group history |
| Letter sequence | Ambiguous in current group metadata; `ana-0038`/`0040` remain under Number Sequence |
| Number sequence | Inferable from topic/history but not a canonical pool reference |
| Percentage problem | Inferable from topic/history but not a canonical pool reference |
| Alphabetical filing | Inferable as Clerical / Filing but not a canonical format destination |
| Logical conditional | Not represented by a controlled canonical format |
| Four-question reading passage | Fixed-group behavior exists historically, but no taxonomy manifest reference |
| Standalone table question | Local passage exists, but no canonical pool classification |

The future-AI contract is therefore **not ready** for freeze or question #689.

## Provenance and performance

Historical source files remain intact, all original question IDs remain unchanged, and 243 references are present. No `source` field values or classification-provenance layer exist. The historical batch-file structure remains suitable for provenance, but the claimed classification layer is missing.

The production build passes but reports large chunks. The largest minified chunk is approximately 603 kB for Firestore, with several additional chunks above 200 kB. This is not the primary migration defect, but it should be addressed before adding large semantic indexes or scaling toward 5,000–10,000 questions.

## Required corrections before approval

1. Add `content/taxonomy/taxonomy.json` with controlled subjects, topics, question types, question formats, and compatibility rules.
2. Add `content/taxonomy/classification-manifest.json` containing exactly 688 unique question IDs and a valid classification for every record.
3. Add reference-only semantic pool indexes under `content/taxonomy/pools/`; do not duplicate full question bodies.
4. Add `content/taxonomy/AI_CONTENT_GUIDE.md` with deterministic pool/fixed-set decisions and examples.
5. Change runtime generation to use canonical pool indexes instead of historical pool-like groups.
6. Ensure compatible type batches are contiguous and cannot produce one-question historical-group remnants.
7. Encode `ana-0038` and `ana-0040` as `letter_sequence` and distinguish direct synonyms, contextual synonyms, logical formats, and filing formats.
8. Preserve all question IDs, choices, answer keys, references, and historical source files.
9. Rerun this audit after the actual migration artifacts are present.

## What changed in this audit

No production files were changed. The only intended additions are this report and its machine-readable companion, `post-migration-audit.json`. The temporary runtime audit test was removed after use, and the working tree was clean before artifact creation.

## Final handoff

The audited branch is **not safe to freeze** and is **not ready for future content expansion** under the claimed architecture. The existing bank is structurally valid, and the eight fixed sets are correct, but the canonical taxonomy migration is absent and the original runtime remnant bug is reproducible.

## References

[1]: https://github.com/jeloualonzo/AceCSE/tree/phase4-booklet "AceCSE phase4-booklet branch"
[2]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/data/questionBank.ts "AceCSE question loader"
[3]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/lib/examEngine.ts "AceCSE simulation engine"
[4]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/types/index.ts "AceCSE domain types"
[5]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/docs/content/AI_GENERATION_PROMPT.md "AceCSE AI generation prompt"
[6]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/docs/content/JSON_SPEC.md "AceCSE content specification"
[7]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/data/productionBank.test.ts "AceCSE production bank tests"
