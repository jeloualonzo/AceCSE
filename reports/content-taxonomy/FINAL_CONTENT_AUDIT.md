# FINAL CONTENT ARCHITECTURE AUDIT

**Repository:** [jeloualonzo/AceCSE](https://github.com/jeloualonzo/AceCSE)  
**Branch:** `phase4-booklet`  
**Starting SHA:** `4f88a342db5367fb5e5ed1569b339d49a9510bb5`  
**Audit author:** **Manus AI**  
**Production migration performed by this audit:** No  
**Verdict:** **MAJOR ISSUES**

## Executive verdict

The claimed final Gemini migration is **not present** on the audited branch. There is no `content/taxonomy/taxonomy.json`, no 688-question `classification-manifest.json`, no `content/taxonomy/pools/` directory, and no `AI_CONTENT_GUIDE.md`. The current branch remains the prior production-bank implementation plus earlier Manus audit artifacts. The latest reachable commit before this audit was `4f88a342`, `docs: add post-migration taxonomy audit`.

This is a **critical implementation gap**, not a documentation preference. The application still loads question files and historical group files, normalizes standalone questions into singleton groups, and allocates simulation questions through those groups. It does not load semantic pool indexes or a classification manifest. The original historical Set-boundary problem therefore remains possible.

The existing 688-question bank is structurally healthy. It contains 688 unique records across 27 question files, 33 explicit groups, 217 grouped questions, and 471 singleton questions. All 688 records have five contiguous choices A–E and a valid answer key. The eight true shared-context groups are structurally correct. Those facts do **not** establish that the claimed taxonomy migration exists or that the simulator now uses semantic pools.

> **Freeze recommendation:** Do not freeze the content architecture and do not add question **#689** yet. Implement the missing taxonomy/task-format layer, connect it to runtime selection, and rerun this audit.

## Starting-state verification

The branch was synchronized using fast-forward-only Git operations. The starting state was:

```text
branch: phase4-booklet
HEAD:   4f88a342db5367fb5e5ed1569b339d49a9510bb5
status: clean
```

No history was reset, no force-push was used, and no production question, choice, answer key, explanation, UI, authentication, Firebase, or grading file was changed during this audit. A temporary runtime test was created, executed, and removed after use.

## 1. Migration verification

| Claimed artifact | Expected path | Actual result |
|---|---|---|
| Canonical taxonomy registry | `content/taxonomy/taxonomy.json` | **Missing** |
| 688-row classification manifest | `content/taxonomy/classification-manifest.json` | **Missing** |
| 50 semantic pool indexes | `content/taxonomy/pools/` | **Missing** |
| Future-AI authoring guide | `content/taxonomy/AI_CONTENT_GUIDE.md` | **Missing** |
| Question-level `questionType` | All 688 records | 0 explicit fields |
| Question-level `questionFormat` | All 688 records | 0 explicit fields |
| `storageMode`, `poolId`, `fixedGroupId` | All 688 records | 0 explicit fields |

The current `Question` type has an optional broad `questionType` and optional historical `groupId`/`groupPosition`, but no controlled `questionFormat`, task/presentation format, storage mode, semantic pool reference, fixed-group reference, shared-direction reference, or structured number-series missing position.[1] The structural validator likewise checks broad question shape and A–E compatibility, but does not enforce a canonical pool or task-format layer.[2]

The runtime loader uses Vite globs over `content/questions/**/*.json`, `content/fixtures/**/*.json`, and `content/groups/**/*.json`.[3] The normalization layer creates `singleton:<id>` groups for standalone questions and overlays explicit groups, removing the member singletons when a historical group exists.[4] The exam engine then computes supply and selects questions through eligible groups.[5]

Therefore, the claimed flow is not implemented:

```text
claimed:  subject → compatible semantic pool → contiguous task batch
actual:   subject → historical QuestionGroup or singleton → partial selection
```

## 2. Bank integrity

| Check | Result | Assessment |
|---|---:|---|
| Historical question files | 27 | Preserved |
| Question records | 688 | Confirmed |
| Unique question IDs | 688 | No duplicates |
| Missing IDs | 0 | None detected |
| Explicit groups | 33 | Confirmed |
| Grouped questions | 217 | Confirmed |
| Singleton questions | 471 | Confirmed |
| Unresolved group references | 0 | None detected |
| Overlapping group memberships | 0 | None detected |
| Exact A–E choice records | 688 | All valid |
| Correct answer exists | 688 | All valid |
| Duplicate option-text records | 0 | None detected |
| A/B/C/D/E correct distribution | 138/138/139/138/135 | Balanced enough for current audit |
| E appears as correct | Yes | Confirmed |
| References | 243 | Preserved |
| Source-field values | 0 | No source values currently exist |

The clean-branch quality gates passed: question validation, TypeScript checking, all six test files containing 84 tests, and the production build. The build emits a Vite warning because the minified Firestore chunk is approximately 602.98 kB and several other chunks exceed 200 kB. This is a scale concern, not the primary migration defect.

## 3. Pool audit

Gemini reported 50 semantic pools, but the reported pool files are absent. Consequently, there are **zero actual pool files to classify, merge, split, rename, or remove**. The following judgments apply to the current historical groups only:

| Current historical structure | Audit disposition | Reason |
|---|---|---|
| `grp-spelling-01`, `grp-spelling-02` | **REHOME AS TASK-FORMAT POOL** | They are splittable historical sets, not canonical semantic pools. |
| `grp-filing-01`–`03` | **REHOME AS TASK-FORMAT POOL** | They repeat directions and mix several filing entity types across Set boundaries. |
| `grp-ana-series-01`–`03` | **SPLIT FORMAT METADATA** | Numeric and letter sequences are mixed; `ana-0038` and `ana-0040` are letter series. |
| `grp-synonyms-01`–`03` | **REHOME WITH FORMAT METADATA** | Direct synonym and contextual synonym formats must remain distinguishable. |
| `grp-syllogism-01`–`03` | **REHOME WITH CONTROLLED LOGIC FORMATS** | Broad logical-reasoning labels are insufficient for categorical, conditional, disjunctive, chain, grid, and deduction procedures. |
| `grp-analogy-01`–`04` | **REHOME WITH FORMAT METADATA** | Historical Set numbering must not define sampling compatibility. |
| Eight shared-context groups | **KEEP AS FIXED SETS** | They have shared content, atomic selection, and fixed order. |

These are not recommendations to redesign the taxonomy blindly. They are the minimum separation required by the product requirement: **pool**, **task/presentation format**, and **fixed-context item set** must not be collapsed into one historical `groupId` concept.

## 4. Pool-file content and duplication

Because `content/taxonomy/pools/` is absent, the audit cannot verify whether the claimed files are lightweight ID indexes or duplicated full question objects. The current repository has no canonical pool layer from which duplication can be measured.

The required implementation should make the canonical question body exist once in its historical source file, while pool indexes contain question IDs and semantic metadata only. Runtime should resolve those IDs against the question catalog. A future audit must explicitly verify that every pool entry resolves to one canonical question and that no incompatible duplicate membership exists.

## 5. Classification coverage

There is no manifest to audit. The live records contain the following broad content fields, but no post-migration canonical classification fields:

| Classification concept | Current representation |
|---|---|
| Subject | Present on all 688 records |
| Exam level | Present on all 688 records |
| Topic | Present on all 688 records |
| Subtopic | Present on all 688 records |
| Question type | Absent on all 688 records; broad values exist only on historical groups |
| Question format | Absent |
| Storage mode | Absent |
| Pool ID | Absent |
| Fixed-group ID | Absent as a classification field; legacy groups exist |
| Embedded/local stimulus | Only inferred from optional `passage` |
| Source/provenance classification | No `source` values and no manifest |

The existing repository rules still support several important subject decisions: Word Analogy belongs to Analytical Reasoning, Assumption/Conclusion belongs to Analytical Reasoning, and Spelling/Filing belong to Clerical Ability.[6] Those rules are useful legacy guidance, but they do not replace a row-level classification manifest.

## 6. Known corrections

| Correction | Current audit result |
|---|---|
| `ana-0038` must be a letter sequence | **Not implemented canonically.** The record is a letter series, but `grp-ana-series-01` labels the whole historical group `Number Sequence`. |
| `ana-0040` must be a letter sequence | **Not implemented canonically.** Same defect. |
| Direct synonym vs synonym-in-context | **Not represented by controlled metadata.** |
| Logical reasoning formats | **Not represented by controlled metadata.** |
| Filing formats | **Not represented by controlled metadata.** |
| 26 standalone contextual questions | **Not artificially grouped by the current groups**, which is correct; no manifest classification exists. |

## 7. Fixed-context groups

The expected eight true shared-context groups are all present:

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
| Expected count | 8 |
| Actual count | 8 |
| Member IDs resolve | Yes |
| Shared context/content block | Yes |
| Atomic selection | Yes |
| Fixed order | Yes |
| Member passages share context | Yes |
| Additional missed multi-question dependency found | No |

The existing fixed groups are the strongest part of the architecture. They should remain atomic and contiguous. However, no canonical `fixedGroupId` layer exists, so they are still represented as the same general `QuestionGroup` concept used for historical pool-like sets.

## 8. Runtime simulation audit

I generated ten deterministic real simulations from the current bank: five Professional simulations at 150 scored questions and five Subprofessional simulations at 145 scored questions, using seeds `final-audit-01` through `final-audit-05`.

| Runtime check | Final-run result |
|---|---:|
| Sessions generated | 10 |
| Duplicate question IDs within sessions | 0 |
| Partial historical-group selections | **9** |
| One-question remnants in this final run | 0 |
| Atomic fixed-group checks | 13 |
| Atomic fixed groups selected whole | 13/13 |
| Canonical pool selections | 0 |

The final run still selected partial historical groups, including:

| Group | Selected | Full size | Subject |
|---|---:|---:|---|
| `grp-ana-series-01` | 6 | 8 | Analytical Reasoning |
| `grp-analogy-02` | 2 | 8 | Analytical Reasoning |
| `grp-analogy-04` | 3 | 8 | Analytical Reasoning |
| `grp-antonyms-02` | 7 | 8 | Verbal Ability |
| `grp-synonyms-03` | 7 | 8 | Verbal Ability |
| `grp-spelling-01` | 5 | 7 | Clerical Ability |
| `grp-filing-02` | 6 | 9 | Clerical Ability |
| `grp-spelling-01` | 2 | 7 | Clerical Ability |
| `grp-synonyms-03` | 4 | 8 | Verbal Ability |

The preceding post-migration audit, run against the unchanged production runtime before this final audit’s report commit, also observed **three one-question remnants**, including `grp-filing-02` selected as **1/9**. That prior evidence remains valid because no production runtime code changed between the runs.[7]

Accordingly, the original bug remains reproducible. Historical groups can still generate arbitrary partial blocks and, depending on seed and allocation, one-question remnants. The system has not reached the required pool → compatible questions → contiguous task batch behavior.

## 9. Filing task-format audit

The bank contains **26 Filing & Alphabetizing questions** across three historical Filing groups. The group files already carry shared directions and an example, which means the renderer can show shared directions once above a group.[8] However, the current representation is not a separate task-format layer:

- The groups are titled `Filing — Set 1`, `Filing — Set 2`, and `Filing — Set 3`.
- All three are `splittable` and `shuffle-questions`.
- The groups contain no `contentBlocks`.
- Many question records repeat full-sentence task instructions such as “Which of the following sets of names is arranged in correct alphabetical filing order?”
- The content includes personal names, prefixes, titles, government offices, businesses, abbreviations, and numeric/business entries, but these are not represented through controlled filing-format metadata.

The current architecture can display shared directions, but it cannot cleanly express:

```text
FILING TASK FORMAT
  shared directions
  shared examples/rules
  filing entity type
  ordering mode
  compact question instances
```

The correct next step is not to rewrite all 26 items during an audit. It is to add a task-format contract such as `filingEntityType` and `orderingMode`, retain historical source records, and migrate content incrementally after the taxonomy is accepted.

## 10. Spelling task-format audit

The bank contains **14 Spelling questions** across two historical groups. The group files carry shared directions, but the groups remain `splittable` and `shuffle-questions`. Most question records are full-sentence prompts, including repeated forms such as:

```text
Which of the following words is spelled CORRECTLY?
Which of the following words is MISSPELLED?
Which word is MISSPELLED?
```

The current representation therefore supports a shared direction visually but does not model a reusable Spelling task format with compact word-list instances. The observed bank contains no explicit `E = No Error` spelling format; that should be optional and used only for authored items whose task structure requires it.

The future model should distinguish the pool from the presentation format, for example:

```text
Spelling pool
  taskFormat = correctly_spelled | misspelled | no_error_variant
  sharedDirectionsRef
  answerStructure
  compact instance
```

No mass content rewrite was performed.

## 11. Number Series structure audit

The bank contains **11 Numerical Reasoning Number Series questions**. All 11 encode the missing term at the end of the series in freeform text. None has a `missingPosition`, `blankPosition`, structured sequence-token field, or equivalent metadata.

Examples include:

```text
What is the next number in the series: 4, 9, 14, 19, ___?
What is the missing number: 3, 7, 4, 10, 5, 13, 6, ___?
```

The current format cannot faithfully represent a missing term in position 1, 2, 3, 4, 5, or another nonterminal location except by embedding it in an unstructured string. The future content model should support structured sequence tokens, an explicit missing position, and an answer-value type. Existing items should not be mass-rewritten during this audit.

## 12. Future-AI authoring contract

The claimed `AI_CONTENT_GUIDE.md` and taxonomy registry are absent. A new AI therefore cannot determine all of the following without guessing:

| Authoring case | Current result |
|---|---|
| Misspelled-word question | Broad Clerical/Spelling destination is inferable from legacy guidance, but no task-format contract exists. |
| Direct synonym | Broad Vocabulary/Synonyms history is inferable, but no canonical pool/format ID exists. |
| Synonym in context | Not enforceably distinguishable from direct synonym by manifest metadata. |
| Letter sequence | `ana-0038`/`ana-0040` are visibly letters but remain under a historical `Number Sequence` group. |
| Number sequence | Broad topic/history exists, but no structured missing-position or canonical format. |
| Percentage problem | Topic is available, but no semantic pool or compatibility index. |
| Alphabetical filing | Broad topic/history exists, but no filing entity/order metadata. |
| Conditional logic | Broad Logical Reasoning history exists, but no controlled procedure format. |
| Reading passage set | Eight fixed groups exist, but no canonical fixed-set manifest. |
| Standalone table/setup item | Local passage can be stored, but pool/fixed status is not machine-readable. |
| General Information item | Topic and references exist, but no canonical pool/provenance manifest. |

A completely different AI cannot safely add question #689 under the claimed architecture because the destination contract is missing.

## 13. Provenance and five-choice audit

Historical files and original IDs remain intact. The 243 existing references remain present. No full-question duplication in pool indexes can be assessed because no pool indexes exist. No classification-level provenance exists beyond the historical source-file organization and existing optional references.

All 688 production questions remain five-choice with contiguous A–E IDs. All 688 have a correct answer among those choices. The distribution is A=138, B=138, C=139, D=138, E=135, and E is represented as a real correct answer. No content or choice regressions were found.

## 14. Performance and scale

The current question loader uses lazy Vite imports by subject-directory files and caches loaded subject chunks, which is a reasonable baseline for growth.[3] However, semantic pool-index performance cannot be audited because the index layer does not exist. The build currently reports a 602.98 kB minified Firestore chunk and several chunks above 200 kB.

A future pool implementation should use reference-only indexes, avoid copying full question objects, preserve subject-level lazy loading, and measure bundle and first-load behavior at 1,000, 5,000, and 10,000 questions.

## 15. Required corrections before approval

1. Add `content/taxonomy/taxonomy.json` with controlled subjects, topics, question types, question formats, task formats, storage modes, and compatibility rules.
2. Add `content/taxonomy/classification-manifest.json` with exactly 688 unique question IDs, complete classification, fixed-set/pool status, and provenance fields.
3. Add reference-only pool indexes under `content/taxonomy/pools/`; do not duplicate full question bodies.
4. Add `content/taxonomy/AI_CONTENT_GUIDE.md` with deterministic examples covering Filing, Spelling, Number Series, Letter Series, direct/contextual synonyms, logic formats, reading sets, tables, and General Information.
5. Change runtime allocation to use canonical semantic pools rather than historical pool-like `QuestionGroup` objects.
6. Separate pool, task/presentation format, and fixed-context item set concepts; only the eight shared-context groups should be atomic/fixed.
7. Encode `ana-0038` and `ana-0040` as `letter_sequence`.
8. Add controlled metadata for direct/contextual synonyms, logical reasoning procedures, filing entities/order modes, spelling answer structures, and number-series missing positions.
9. Preserve all historical IDs, source files, references, answer keys, and content while migrating incrementally.
10. Rerun the complete final audit after implementation. Do not add question #689 before the audit returns **APPROVE**.

## What changed in this audit

Only the two final audit artifacts were added. No production content, engine, UI, schema, historical group, choice, answer key, or source file was changed.

## Final handoff

The 688-question content architecture is **not ready to freeze**. The bank is structurally valid, and the eight true fixed-context groups are sound, but the claimed taxonomy migration is absent, semantic pool runtime behavior is absent, the original historical-group remnant problem remains reproducible, and the new exam-format requirements for Filing, Spelling, and nonterminal Number Series blanks are not modeled as first-class task formats.

**Question #689 should not be added yet.**

## References

[1]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/types/index.ts "AceCSE canonical domain types"
[2]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/data/questionShape.ts "AceCSE question validator and manifest types"
[3]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/data/questionBank.ts "AceCSE question and group loader"
[4]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/data/contentNormalization.ts "AceCSE content normalization"
[5]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/lib/examEngine.ts "AceCSE exam engine"
[6]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/docs/content/MASTER_GUIDE.md "AceCSE content classification rules"
[7]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/reports/content-taxonomy/POST_MIGRATION_AUDIT.md "Prior post-migration audit"
[8]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/content/groups/clerical/core-groups.json "AceCSE Clerical group registry"
[9]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/content/questions/clerical/core.json "AceCSE Clerical question content"
[10]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/docs/content/AI_GENERATION_PROMPT.md "AceCSE AI generation guidance"
