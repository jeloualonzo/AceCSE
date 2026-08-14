# AceCSE Content Architecture Implementation Report

**Repository:** [jeloualonzo/AceCSE](https://github.com/jeloualonzo/AceCSE)  
**Branch:** `phase4-booklet`  
**Starting SHA:** `778a58fab8e7f467c40bb8e19d1a0bde75947ab1`  
**Implementation commit:** `820e6295a09aeb79f51600ac5906b22bba25b4de`  
**Current remote SHA at implementation verification:** `820e6295a09aeb79f51600ac5906b22bba25b4de`  
**Working tree at implementation verification:** Clean  
**Author:** **Manus AI**

## Final verdict

**READY TO FREEZE for the content-architecture phase.** The approved canonical architecture is now physically present on `origin/phase4-booklet`, loaded by runtime code, validated against the complete 688-question bank, and covered by regression tests. No question #689 was added, and no historical source question file was deleted or rewritten.

The next phase may reformat the existing 688 questions into richer authentic task/item-set structures. That work should be incremental and should preserve the canonical IDs, source files, manifest classifications, and pool references created here.

## Remote verification

The implementation was synchronized from `origin/phase4-booklet` before changes. The required artifacts were initially absent. After implementation, the branch was committed and pushed; `git rev-parse HEAD` and `git rev-parse origin/phase4-booklet` both returned:

```text
820e6295a09aeb79f51600ac5906b22bba25b4de
```

The following files physically exist on the branch:

| Required artifact | Status |
|---|---|
| `content/taxonomy/taxonomy.json` | Present |
| `content/taxonomy/classification-manifest.json` | Present |
| `content/taxonomy/AI_CONTENT_GUIDE.md` | Present |
| `content/taxonomy/pools/` | Present; 40 JSON indexes |

Runtime code references the canonical artifacts through [`src/data/taxonomy.ts`][1], and production content loading attaches the classifications and pool indexes through [`src/data/questionBank.ts`][2] and [`src/data/contentCatalog.ts`][3].

## Canonical taxonomy

The registry uses the existing five persisted application subjects: Analytical Reasoning, Clerical Ability, General Information, Numerical Reasoning, and Verbal Ability. It defines controlled topic, question-type, question-format, task-format, storage-mode, pool-compatibility, shared-task, and fixed-set rules in [`taxonomy.json`][4]. The registry intentionally contains 40 reusable pools rather than creating a nominal 50-pool catalog without evidence from the bank.

| Subject | Pool count | Pool questions | Fixed-set questions | Total |
|---|---:|---:|---:|---:|
| Analytical Reasoning | 7 | 123 | 0 | 123 |
| Clerical Ability | 4 | 63 | 0 | 63 |
| General Information | 10 | 147 | 0 | 147 |
| Numerical Reasoning | 10 | 152 | 5 | 157 |
| Verbal Ability | 9 | 185 | 13 | 198 |
| **Total** | **40** | **670** | **18** | **688** |

The architecture separates reusable pool supply from presentation format and fixed-context dependency. A pool index contains question IDs and classification metadata only; it does not duplicate full question bodies. Historical source files remain the canonical content storage and provenance layer.

## Classification manifest

The manifest contains **exactly 688 unique question IDs**. Every source question has a subject-matching manifest row, a controlled question type, a controlled question format, a task format, a storage mode, a pool or fixed-set reference, and a preserved source-file path.

| Manifest property | Result |
|---|---:|
| Classification rows | 688 |
| Unique question IDs | 688 |
| Pool records | 670 |
| Fixed-set records | 18 |
| High-confidence records | 579 |
| Medium-confidence records | 109 |
| Low-confidence records | 0 |
| Unresolved records | 0 |
| Duplicate IDs | 0 |
| Source/provenance paths preserved | 688/688 |

The deliberate corrections are encoded: `ana-0038` and `ana-0040` use `letter_sequence`, direct and contextual synonym formats are distinct, logical reasoning uses controlled procedure-level formats, and Filing/Spelling use shared-task formats rather than historical Set membership.

The principal task-format distribution is:

| Task format | Records |
|---|---:|
| `standard_multiple_choice` | 595 |
| `number_sequence` | 33 |
| `letter_sequence` | 2 |
| `shared_filing_task` | 26 |
| `shared_spelling_task` | 14 |
| `fixed_shared_context` | 18 |

The current 11 Numerical Reasoning Number Series records remain authored with terminal freeform blanks. The model now supports structured `numberSeries.sequence` and `numberSeries.missingPosition` for future and carefully migrated items without mass-rewriting existing content.

## Semantic pools

All 40 pool indexes are reference-only. Each entry contains `questionId`, `questionType`, `questionFormat`, and `taskFormat`; the validator rejects unresolved IDs, pool mismatches, incompatible subject/topic/format assignments, duplicate pool entries, and full question-body fields inside pool indexes.

Representative pool sizes include `analytical-word-analogy` 32, `analytical-assumption-conclusion` 15, `analytical-letter-sequence` 2, `analytical-number-pattern` 26, `clerical-filing` 26, `clerical-spelling` 14, `numerical-number-sequence` 11, `numerical-percentages` 18, `verbal-direct-synonym` 28, and `verbal-synonym-context` 27. The complete machine-readable pool registry is in [`taxonomy.json`][4], while each reference-only index is under `content/taxonomy/pools/`.

## Fixed-context sets

The eight approved fixed-context sets remain separate from reusable pools:

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

Each is validated as an exact member list with resolved IDs, shared content, atomic selection, and fixed order. The engine derives the allowed fixed IDs from the manifest and will not treat another historical group as a canonical fixed set.

## Runtime allocation

Production simulation allocation now uses canonical manifest classifications and pool indexes. The runtime path is:

```text
subject → allocation policy → canonical pool or manifest-declared fixed set → contiguous session block
```

Historical `QuestionGroup` objects remain available for provenance and Practice compatibility, but they no longer determine pool-like production simulation selection. Only manifest-declared fixed sets are emitted as historical group blocks. Canonical pool blocks carry `poolId`, `questionType`, `taskFormat`, and contiguous `questionIds`.

The booklet view model, SectionRenderer, GroupRenderer, and navigator now understand pool blocks. Shared Filing and Spelling directions are shown once above a pool task block when a task definition provides a directions source. Navigator labels use task names such as **Filing**, **Spelling**, **Number Series**, and **Letter Series** rather than misleading historical Set labels.

## Real-bank simulation audit

Ten real simulations were generated from the production bank using five Professional seeds and five Subprofessional seeds. Professional sessions contained 150 scored questions; Subprofessional sessions contained 145.

| Runtime check | Result |
|---|---:|
| Professional sessions | 5 |
| Subprofessional sessions | 5 |
| Duplicate-free sessions | 10/10 |
| Canonical pool blocks | 349 |
| Fixed-set blocks | 36 |
| Historical pool-like group IDs observed | 0 |
| Fixed group IDs observed | Only the eight approved IDs |
| Pool task formats observed | Standard multiple choice, Number Series, Letter Series, Filing, Spelling |

The previous partial historical-group bug is no longer reproduced in the canonical runtime audit. The only `kind: "group"` blocks observed were the eight manifest-approved fixed-context groups, and those blocks retained exact authored member order. Pool questions were emitted as `kind: "pool"` blocks with canonical pool IDs.

A representative Professional session contained Verbal Ability, General Information, Numerical Reasoning, Analytical Reasoning, and Clerical blocks in a seeded policy order, with fixed Reading Comprehension blocks followed by direct-synonym, grammar, and other canonical pool blocks. A representative Subprofessional session included a fixed Numerical Data Interpretation set followed by fraction/decimal, geometry, probability/data, finance, Number Series, and other canonical pool blocks.

## Validator and tests

The standard `validate:questions` gate now runs both the existing question validator and the canonical taxonomy validator. The taxonomy validator reports 688 classifications, 40 reference-only pools, 670 pool records, 18 fixed-set records, eight fixed sets, and zero low-confidence records for the current bank.

All required gates passed after the implementation:

| Command | Result |
|---|---|
| `npm run validate:questions` | Passed |
| `npm run audit:content` | Passed |
| `npm run test:content-model` | Passed |
| `npm run test:engine` | Passed; 18 tests |
| `npm run test:booklet` | Passed; 40 tests |
| `npm test -- --run` | Passed; 7 files / 89 tests |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |

The new taxonomy tests cover exact 688-row coverage, pool reference-only integrity, fixed-set preservation, letter-series corrections, task-format distinctions, and six real production-levels/seeds across both exam levels.

## AI future-proofing

[`AI_CONTENT_GUIDE.md`][5] now teaches future agents how to inspect the taxonomy, preserve provenance, decide pool versus fixed set, choose a task format, classify Filing/Spelling/Number Series/Letter Series, distinguish direct synonyms from contextual synonyms, use controlled logic formats, handle shared reading/data sets, validate options and answer keys, run the gates, and flag uncertainty.

The guide explicitly supports future compact task instances without fabricating No Error options or rewriting the current 26 Filing and 14 Spelling questions blindly. It also requires structured missing-position metadata for new Number Series items and keeps the existing subject terminology stable.

## Known limitations and next phase

The architecture is ready to freeze, but the content-format reauthoring phase remains separate. Existing Filing and Spelling records still contain their historical full-sentence prompts; the new schema and renderer can support compact shared-task instances, but migrating those records safely requires a later deterministic content transformation and review. Existing Number Series records remain freeform terminal-blank items; the structured missing-position field is available for future items and manual migrations.

The build continues to emit a chunk-size warning for the approximately 603 kB Firestore chunk. This is a pre-existing performance consideration and does not invalidate the taxonomy or runtime correctness. Pool indexes remain lightweight reference files, and subject-level question chunks remain lazy-loaded.

No merge to `main` was performed. No question #689 was added.

## References

[1]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/data/taxonomy.ts "Canonical taxonomy runtime loader"
[2]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/data/questionBank.ts "Question bank and taxonomy loading"
[3]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/data/contentCatalog.ts "Normalized content catalog"
[4]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/content/taxonomy/taxonomy.json "Canonical taxonomy registry"
[5]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/content/taxonomy/AI_CONTENT_GUIDE.md "Future-AI content authoring guide"
[6]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/lib/examEngine.ts "Canonical pool-based simulation allocation"
[7]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/scripts/validate-taxonomy.mjs "Canonical taxonomy validator"
