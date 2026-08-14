# MANUS Independent Content Taxonomy Audit

**Repository:** [jeloualonzo/AceCSE](https://github.com/jeloualonzo/AceCSE)  
**Branch:** `phase4-booklet`  
**Starting SHA:** `23cfc721a48b1ca9775eb9b8f48756c85cdab32c`  
**Current SHA at audit:** `23cfc721a48b1ca9775eb9b8f48756c85cdab32c`  
**Audit status:** Content migration was **not performed**.  
**Overall verdict:** **APPROVE WITH CORRECTIONS**

## Overall verdict

Gemini’s **aggregate pool/fixed-set distinction is supported by the actual repository**, but the proposal is not ready for blind migration. The live files independently reproduce **688 questions, 670 pool questions, 18 members in 8 true shared-context groups, 33 current groups, and 25 pool-like groups**. Those aggregate figures match the proposal summary.

The correction is that the underlying Gemini taxonomy artifacts are not present in this checkout: there is no `taxonomy.json`, classification manifest, or `AI_CONTENT_GUIDE.md` to audit row by row. Therefore, the exact membership of the claimed 28 canonical pools and the claimed 100% classification confidence cannot be approved. The migration should proceed only after the missing row-level manifest is supplied or regenerated and the corrections below are accepted.

The current repository’s existing group metadata is internally consistent. The major design issue is not that the 25 pool-like groups are fixed sets; it is that future migration must not treat the current Set 1/Set 2/Set 3 boundaries as semantic. The second issue is that **question format is not yet represented on the 688 question records**: `questionType` is absent from all 688 records, while the group files use it only as broad group metadata.

## Repository verification and scope

The branch was synchronized with `git fetch origin`, `git checkout phase4-booklet`, and `git pull --ff-only origin phase4-booklet`. The starting branch was `phase4-booklet`; the working tree was clean; and the starting HEAD was `23cfc721a48b1ca9775eb9b8f48756c85cdab32c`.

The audit inspected the question files, group files, current audit report, source types, question validator, lazy loader, content normalization, exam engine, content specification, authoring guide, and production-bank tests. No production question, choice, key, group, engine, UI, or grading file was changed.

> **Evidence limitation:** The supplied proposal describes Gemini’s intended artifacts, but the actual repository contains neither the proposed taxonomy file nor the row-level migration manifest. This report therefore distinguishes independently verified repository facts from claims that remain untestable until those artifacts exist.

## Independent count verification

| Metric | Independent result | Gemini proposal | Assessment |
|---|---:|---:|---|
| Total questions | 688 | 688 | Confirmed |
| Pool questions | 670 derived as 471 singleton + 199 pool-like-group members | 670 | Confirmed at aggregate level |
| Fixed-context questions | 18 members of 8 explicit fixed groups | 18 | Confirmed at aggregate level |
| Current groups | 33 | 33 | Confirmed |
| True fixed-context groups | 8 | 8 | Confirmed |
| Pool-like/template groups | 25 | 25 | Confirmed |
| Distinct live topic values | 45 | Not specified | Current repository fact |
| Question records with explicit `questionType` | 0 | Proposed as taxonomy dimension | Migration gap |
| Question records with `source` | 0 | Not specified | Provenance gap |
| Question records with `reference` | 243 | Not specified | Preserve; General Information is 147/147 |

The derived total is exact: the 25 pool-like groups contain 199 questions, and the 471 ungrouped questions are independently sampleable under the current normalization model, yielding 670 pool questions. The eight fixed groups contain 18 questions in total.

## Current taxonomy evidence

The application’s canonical subject strings are `Analytical Reasoning`, `Clerical Ability`, `General Information`, `Numerical Reasoning`, and `Verbal Ability`. These exact strings are defined in [`src/types/index.ts`](https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/types/index.ts) and enforced by [`scripts/validate-questions.mjs`](https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/scripts/validate-questions.mjs). The audit found no reason to introduce terminology such as “Analytical Ability” in persisted metadata; if official-exam wording is discussed, it should be documented as an external label rather than replacing the application enum.

| Subject | Distinct live topics | Questions |
|---|---:|---:|
| Analytical Reasoning | 5 | 123 |
| Clerical Ability | 4 | 63 |
| General Information | 10 | 147 |
| Numerical Reasoning | 20 | 157 |
| Verbal Ability | 6 | 198 |

The repository guide deliberately treats `topic` as the closed vocabulary and `subtopic` as a descriptive fine-grained label. That is the correct separation for future growth. A subtopic such as “Reverse Percentage from a Complement” or “Nothing-Before-Something — Villa- Surnames” should not automatically become a canonical pool. Pool membership should be driven by compatible solving format and sampling policy.

## Audit of all 33 current groups

Every current group was inspected. There are no missing member IDs, duplicate IDs within a group, overlapping group memberships, or group subject mismatches. The eight fixed groups have shared content blocks, `atomic` selection, and `fixed` order. The remaining 25 groups have no content blocks, use `splittable` selection, and use `shuffle-questions` order; they are therefore pool-like presentation templates rather than genuine fixed-context sets.

| Group ID | Subject | Group type | Size | Classification | Policy | Content blocks |
|---|---|---|---:|---|---|---:|
| `grp-analogy-01` | Analytical Reasoning | Analogy | 8 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-analogy-02` | Analytical Reasoning | Analogy | 8 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-analogy-03` | Analytical Reasoning | Analogy | 8 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-analogy-04` | Analytical Reasoning | Analogy | 8 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-ana-series-01` | Analytical Reasoning | Number Sequence | 8 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-ana-series-02` | Analytical Reasoning | Number Sequence | 8 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-ana-series-03` | Analytical Reasoning | Number Sequence | 7 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-syllogism-01` | Analytical Reasoning | Logical Reasoning | 8 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-syllogism-02` | Analytical Reasoning | Logical Reasoning | 8 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-syllogism-03` | Analytical Reasoning | Logical Reasoning | 5 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-filing-01` | Clerical Ability | Filing | 9 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-filing-02` | Clerical Ability | Filing | 9 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-filing-03` | Clerical Ability | Filing | 8 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-spelling-01` | Clerical Ability | Spelling | 7 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-spelling-02` | Clerical Ability | Spelling | 7 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-num-series-01` | Numerical Reasoning | Number Sequence | 6 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-num-series-02` | Numerical Reasoning | Number Sequence | 5 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-di-employment` | Numerical Reasoning | Data Interpretation | 3 | Fixed | atomic / fixed | 1 |
| `grp-di-roadworks` | Numerical Reasoning | Data Interpretation | 2 | Fixed | atomic / fixed | 1 |
| `grp-synonyms-01` | Verbal Ability | Synonyms | 10 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-synonyms-02` | Verbal Ability | Synonyms | 10 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-synonyms-03` | Verbal Ability | Synonyms | 8 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-syn-context-01` | Verbal Ability | Synonyms | 9 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-syn-context-02` | Verbal Ability | Synonyms | 9 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-syn-context-03` | Verbal Ability | Synonyms | 9 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-antonyms-01` | Verbal Ability | Antonyms | 9 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-antonyms-02` | Verbal Ability | Antonyms | 8 | Pool-like | splittable / shuffle-questions | 0 |
| `grp-rc-public-trust` | Verbal Ability | Reading Comprehension | 3 | Fixed | atomic / fixed | 1 |
| `grp-rc-csc` | Verbal Ability | Reading Comprehension | 2 | Fixed | atomic / fixed | 1 |
| `grp-rc-property` | Verbal Ability | Reading Comprehension | 2 | Fixed | atomic / fixed | 1 |
| `grp-rc-careers` | Verbal Ability | Reading Comprehension | 2 | Fixed | atomic / fixed | 1 |
| `grp-rc-frontline` | Verbal Ability | Reading Comprehension | 2 | Fixed | atomic / fixed | 1 |
| `grp-rc-appointments` | Verbal Ability | Reading Comprehension | 2 | Fixed | atomic / fixed | 1 |

### True fixed-context groups — KEEP

| Group ID | Subject | Size | Group type | Member IDs |
|---|---|---:|---|---|
| `grp-di-employment` | Numerical Reasoning | 3 | Data Interpretation | num-0041, num-0042, num-0043 |
| `grp-di-roadworks` | Numerical Reasoning | 2 | Data Interpretation | num-0044, num-0045 |
| `grp-rc-public-trust` | Verbal Ability | 3 | Reading Comprehension | verb-0117, verb-0118, verb-0119 |
| `grp-rc-csc` | Verbal Ability | 2 | Reading Comprehension | verb-0043, verb-0044 |
| `grp-rc-property` | Verbal Ability | 2 | Reading Comprehension | verb-0045, verb-0046 |
| `grp-rc-careers` | Verbal Ability | 2 | Reading Comprehension | verb-0047, verb-0048 |
| `grp-rc-frontline` | Verbal Ability | 2 | Reading Comprehension | verb-0049, verb-0050 |
| `grp-rc-appointments` | Verbal Ability | 2 | Reading Comprehension | verb-0090, verb-0091 |

For these eight groups, exact membership matters because the questions refer to the same passage, table, or other shared material. The simulation engine already encodes the correct invariant: atomic groups are taken whole and remain contiguous. These groups should survive migration as fixed item sets.

### Pool-like groups — REHOME, DO NOT PRESERVE AS SEMANTIC SETS

The 25 pool-like groups are correctly treated as independently answerable questions. Their current boundaries are historical or presentation-oriented. The migration should move their members into reusable pools while preserving each question’s ID and metadata. The old group files should not be deleted until runtime and tests no longer depend on them.

The following corrections are required inside the pool-like classification:

| Area | Exact correction |
|---|---|
| Analytical series | `ana-0038` and `ana-0040` explicitly ask for letters, although `grp-ana-series-01` is labeled `Number Sequence`. Keep the broad topic `Number and Letter Pattern`, but assign `questionFormat=letter_sequence`; do not sample them from a numeric-only pool. |
| Logical reasoning | The three logical groups combine categorical syllogisms, conditional reasoning, disjunction, chain reasoning, and logic conclusions. They are independently answerable, but the future manifest must record the specific procedure instead of using group membership as the pool definition. |
| Synonyms | `grp-syn-context-01`, `02`, and `03` are splittable, but their “as used in that sentence” directions distinguish them from direct synonym items. Preserve a `synonym_in_context` format. |
| Filing and spelling | The broad Clerical topics are valid, but subformats such as personal-name filing, business/office-name filing, coding, and spelling rules should be explicit metadata rather than permanent Set boundaries. |

## Fixed-context corrections beyond the eight groups

The repository contains **26 additional questions with item-local passages or setups that are not members of an explicit group**:

> `ana-0019`, `ana-0020`, `ana-0021`, `ana-0022`, `ana-0023`, `ana-0024`, `ana-0025`, `ana-0026`, `ana-0028`, `ana-0029`, `ana-0051`, `ana-0053`, `ana-0054`, `ana-0055`, `ana-0076`, `cler-0042`, `cler-0043`, `cler-0044`, `cler-0045`, `num-0088`, `seed-verb-005`, `verb-0092`, `verb-0110`, `verb-0133`, `verb-0134`, and `verb-0147`.

These are **not evidence of 26 missing multi-question groups**. Each is self-sufficient: its passage, table, codebook, or puzzle setup belongs to that single question. The correct representation is a pool question with an `embeddedStimulus`/local-stimulus classification, or an internal singleton fixed item if the implementation requires that distinction. The migration must not create artificial groups that would force unrelated questions to stay together.

The six standalone Verbal reading-comprehension items should remain `Verbal Ability / Reading Comprehension`; the analytical puzzle items should remain Analytical; and the four clerical coding items should remain Clerical. An embedded passage does not override the tested skill.

## Question-classification audit

A complete row-level audit of Gemini’s 688 classifications is **not possible from the current checkout** because the classification manifest is absent. The following are the exact independently supported corrections and safeguards:

| Question IDs or scope | Finding | Required action |
|---|---|---|
| `ana-0038`, `ana-0040` | Letter-series stems inside a group labeled `Number Sequence` | Mark `letter_sequence`; do not use a numeric-only pool |
| 26 IDs listed above | Item-local stimulus without shared multi-question dependency | Keep local stimulus; do not create artificial fixed groups |
| `ana-0076`, `ana-0077` | Assumption/conclusion skill | Keep Analytical Reasoning even when a short passage is present |
| `ana-0065`, `ana-0066`, `ana-0078` | Word analogy | Keep Analytical Reasoning / Word Analogy |
| `cler-0042`–`cler-0045` | Clerical coding with item-local code tables | Keep Clerical Operations; do not promote to shared fixed set |
| All 688 records | `questionType` absent | Populate a controlled `questionType` and `questionFormat` manifest before migration is accepted |

No structural subject misclassification was found: all 688 records have valid subjects matching their directories, and all group memberships resolve. This is not equivalent to certifying every semantic classification; the missing Gemini manifest prevents that stronger conclusion.

## Taxonomy corrections

1. **Keep the five application subjects exactly as implemented.** Use “Analytical Reasoning,” not a new persisted “Analytical Ability” label. If official terminology is useful, document it as an alias in the guide.
2. **Keep the current closed topic vocabulary.** Do not replace topics with 28 pool names unless each merge is justified by compatible solving skill, answer process, and future sampling behavior. The live bank has 45 distinct topic values across the five subjects.
3. **Add a real question-type and question-format layer.** The desired hierarchy should become `subject → topic → questionType → questionFormat → pool or fixedSet`, but the last two fields must be controlled vocabularies and must not be inferred from group titles.
4. **Use pool compatibility rules.** Numeric sequences, letter sequences, direct synonyms, contextual synonyms, categorical logic, conditional logic, filing, spelling, and table interpretation should not be merged merely because they share a broad topic.
5. **Treat fixed sets as dependency relationships.** A fixed set requires shared context and dependent members. A question-local passage is not enough to create a multi-question group.
6. **Preserve provenance and references.** The existing bank has 243 references, including complete reference coverage for General Information, and no `source` values. A taxonomy migration must not erase those citations or invent source metadata.

## AI guide corrections

The future guide must give a new AI a deterministic decision tree:

1. Identify the tested skill, not the surface context or source exam section.
2. Assign the exact application subject using the existing five-value enum.
3. Assign one existing closed `topic`; use `subtopic` for a precise descriptive skill.
4. Assign a controlled `questionType` and `questionFormat`.
5. Ask whether the question is independently answerable from its own record. If yes, it is pool-eligible even if it has an item-local passage, table, codebook, or puzzle setup.
6. If multiple questions depend on the same exact passage/table/scenario, create one fixed item set with shared content, atomic selection, fixed order, and exact membership.
7. Preserve IDs, choices, answer keys, explanations, references, and passages.
8. Run the full validator and a format-compatibility audit before accepting the batch.

The guide must also explicitly preserve the repository’s non-obvious rules: Word Analogy is Analytical Reasoning; Assumption/Conclusion is Analytical Reasoning; Spelling and Filing are Clerical Ability; and `examLevel` follows the application blueprint rather than the source exam’s label.

## File-organization assessment

The proposed `content/questions/<subject>/<canonical-pool>.json` structure is workable as a generated view, but it should not replace the repository’s current provenance-oriented batch files as the canonical source. The current specification requires timestamped batch filenames and the loader discovers every JSON file under the subject directory. One file per pool would make future additions easy to find, but it would bury source provenance, create larger long-lived files, and complicate review when a question changes classification.

The recommended architecture is:

```text
content/
  questions/
    <subject>/
      core.json                         # historical baseline
      YYYY-MM-DD-HHMM-<source>.json     # canonical authored/import batch
  groups/
    <subject>/
      <fixed-item-set>.json             # only true shared-context sets
  taxonomy/
    taxonomy.json                       # controlled vocabulary and compatibility rules
    classification-manifest.json        # question-id-level decisions and review status
    AI_CONTENT_GUIDE.md                 # deterministic authoring/classification guide
```

Pool indexes can be generated from `classification-manifest.json` for runtime or analytics. This preserves Git history, keeps source batches traceable, and avoids requiring a future AI to edit a large pool file merely to add one question. The existing lazy subject-directory loader remains compatible with this design.

## Migration risks and handoff

The next migration agent must not modify question content, move or delete historical files, change choices or answer keys, alter the exam engine, or rewrite UI/grading behavior. It should first create the missing taxonomy and classification artifacts, then run a dry-run report showing every question’s proposed destination and every group’s fate.

The migration agent should treat the eight fixed groups as immutable atomic units, treat the 25 pool-like groups as temporary presentation containers, and preserve all 26 item-local contextual questions as independent records. It should correct the two letter-series formats, materialize question type/format metadata, and validate that no unrelated question types are left as one-question remnants of a historical template group.

## Verification record

The independent audit computed 688 unique questions from 27 question files, 33 groups, 217 grouped questions, 471 singleton questions, zero duplicate IDs, zero unresolved group references, zero overlapping group memberships, eight fixed-context groups, and 25 pool-like groups. The repository’s existing question validator, TypeScript check, test suite, and production build had passed at this revision before this review began; no production code or content was changed by this audit.

## References

[1]: https://github.com/jeloualonzo/AceCSE/tree/phase4-booklet "AceCSE phase4-booklet branch"
[2]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/types/index.ts "AceCSE canonical domain types"
[3]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/docs/content/JSON_SPEC.md "AceCSE JSON content specification"
[4]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/docs/content/MASTER_GUIDE.md "AceCSE content master guide"
[5]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/data/productionBank.test.ts "AceCSE production bank tests"
[6]: https://github.com/jeloualonzo/AceCSE/blob/phase4-booklet/src/lib/examEngine.ts "AceCSE exam engine"
