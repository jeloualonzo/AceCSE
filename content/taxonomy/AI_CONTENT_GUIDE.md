# AceCSE Canonical Content Authoring Guide

**Status:** Canonical authoring contract, taxonomy version 1.  
**Source of truth:** `taxonomy.json`, `classification-manifest.json`, the historical question files under `content/questions/`, and the validator commands below.

## Purpose

AceCSE separates three concepts that must never be collapsed into one historical group identifier:

1. **Question pool:** the reusable supply of compatible questions selected without replacement.
2. **Task or presentation format:** how a compatible question is presented, including shared directions, examples, answer structure, and compact instances.
3. **Fixed-context item set:** multiple questions that depend on one exact shared passage, table, or scenario and must be selected atomically in authored order.

The canonical runtime path is:

```text
subject → question type/skill → semantic pool → task/presentation block → question instance
```

A fixed-context set follows a separate path:

```text
fixed set → shared stimulus → exact dependent members in fixed order
```

Historical `content/groups/**` files preserve source and set history. Their Set 1/Set 2/Set 3 boundaries do not define semantic pool membership.

## Required workflow

Before authoring or classifying an item, inspect the complete `taxonomy.json`, the target subject’s existing question files, and the current `classification-manifest.json`. Do not invent a new subject, topic, question type, question format, task format, or pool ID when an existing controlled value fits.

Derive the answer independently. Recompute numerical answers programmatically, solve ordering and logic problems exhaustively, and verify legal or constitutional citations against a primary source. Preserve the existing question ID and source file. New content must use the repository’s timestamped batch-file convention and must not be appended directly to a historical `core.json` file.

For every new or migrated question, create one manifest record with:

```json
{
  "questionId": "num-0102",
  "subject": "Numerical Reasoning",
  "examLevel": "Both",
  "topic": "Percentages",
  "subtopic": "Reverse Percentage from a Complement",
  "questionType": "percentage_problem",
  "questionFormat": "percentage_problem",
  "taskFormat": "standard_multiple_choice",
  "storageMode": "pool",
  "poolId": "numerical-percentages",
  "fixedGroupId": null,
  "embeddedStimulus": false,
  "sourceFile": "content/questions/numerical/2026-08-06-0900-cse-review-book-1.json",
  "confidence": "high",
  "notes": ""
}
```

Use `storageMode: "fixed-set"`, a valid `fixedGroupId`, `poolId: null`, and the exact authored group order for a dependent shared-context question. A self-contained question with its own passage, table, codebook, or puzzle setup remains a pool item and uses `embeddedStimulus: true`.

## Classification decision tree

First identify the **skill being tested**, not the source exam section or surface topic. Then assign the application’s exact subject enum. Next reuse an established topic, assign a precise subtopic, choose the controlled question type and question format, and finally choose the compatible pool. Only after that decide whether the item is a standard pool instance, a shared task-format instance, or a fixed-context member.

Create a fixed set only when two or more questions depend on the same exact stimulus. The group must carry shared content, use atomic selection, use fixed order, and list the exact member IDs. Never create a fixed set merely because one question has a passage or table.

## Subject and format rules

### Analytical Reasoning

Word analogy is always **Analytical Reasoning / Word Analogy / `word_analogy`**, even when a source exam prints it in a verbal section. Assumption or conclusion evaluation is **Analytical Reasoning / Assumption and Conclusion**, even when wrapped in a short passage. Meaning, main idea, or detail extraction from a passage is Verbal Reading Comprehension instead.

Use `analytical-letter-sequence` and `letter_sequence` for letter series. In particular, `ana-0038` and `ana-0040` are letter-series items and must not be placed in a numeric-only pool. Use `analytical-number-pattern` for numeric series and numerical patterns. Use `analytical-letter-and-code-pattern` for A1Z26, Caesar, Atbash, and substitution-code formats.

Logical Reasoning uses one reusable pool with controlled `questionFormat` values such as `categorical_logic`, `conditional_logic`, `disjunctive_logic`, `logic_grid`, and `logical_deduction`. Do not infer compatibility from historical Logical Conclusions Set 1/2/3 membership.

### Numerical Reasoning

Use the established topic vocabulary. Number Series uses `numerical-number-sequence` and `number_sequence`.

**Current bank versus architecture:** All 11 current production Number Series items happen to use final-position blanks. That is a descriptive fact about the current authored bank, not a rule of the architecture. Number Series supports a missing term at any valid position: first, middle, or final.

Preserve the missing-term position exactly as supplied by the source or author. Never move the blank to the end, never reorder the sequence, and never rewrite a question merely to fit the current production examples. `missingPosition` is one-based; `sequence` preserves authored order; and the missing term is represented structurally rather than inferred from the current bank. The renderer derives the visible `___` from that structured representation. Future questions may use first, middle, or final positions, and the current final-position distribution is descriptive, not normative.

Preserve exact authored display strings for fractions, signs, decimals, negative values, Unicode minus signs, and other numeric notation. Do not simplify or normalize sequence values.

The question model supports:

```json
"numberSeries": {
  "sequence": [12, 24, null, 96, 192],
  "missingPosition": 3
}
```

Use `data_interpretation` for table/data tasks. A table that belongs to one question only remains a pool question with an embedded stimulus. A table shared by multiple dependent questions becomes one of the fixed data-interpretation sets.

### Clerical Ability

Spelling and Filing are Clerical Ability and Subprofessional-only. Historical Filing and Spelling sets are not semantic pools.

Filing uses `clerical-filing` with `shared_filing_task`. Use the format values `personal_name_filing`, `business_or_office_filing`, or `subject_or_office_filing` when supported by the actual item. Shared directions and examples come from the `filing_default` task definition; a compact instance should contain the names, entities, data, and item prompt without repeating the entire instruction. Existing items that cannot be transformed safely use `taskFormat: "legacy_full_prompt"` and an additive Filing task instance with `migrationStatus: "manual_review_required"`. Do not fabricate compact entries from uncertain prose. The current bank intentionally contains both safe compact instances and preserved legacy prompts until manual editorial review is complete.

Spelling uses `clerical-spelling` with `shared_spelling_task`. Use `correctly_spelled_word` or `misspelled_word`. A `no_error_variant` may be added only when the authored task deliberately includes an E = No Error answer structure. Never fabricate a No Error choice for an item that does not use that format.

Clerical Operations uses `clerical_record_check` or `clerical_code_or_record_check`. Office Procedures and Correspondence uses `office_procedure`.

### Verbal Ability

Use `verbal-direct-synonym` and `direct_synonym` for a word or phrase whose nearest meaning is requested directly. Use `verbal-synonym-context` and `synonym_in_context` when the meaning is determined by a sentence or passage. Do not collapse these because both are broadly synonyms.

Use the dedicated pools for Antonym, Grammar & Usage, Error Identification, Reading Comprehension, Paragraph Organization, and Sentence Completion. Multiple questions sharing a reading passage must use a fixed set; a self-contained reading item remains a pool item with `embeddedStimulus: true`.

#### Grammar & Usage Sentence Correction pilot

The four QA-approved pilot items `verb-0059` through `verb-0062` remain independently answerable entries in `verbal-grammar-usage`. They use the additive task format `shared_grammar_sentence_correction` and the shared definition `grammar_sentence_correction_pilot`; this is reusable task presentation, not a fixed-context group and not a new pool. Do not migrate any other Grammar & Usage question into this pilot.

The shared direction is exactly: “Choose the sentence that is grammatically correct in formal edited English.” The pilot is governed by an answer-uniqueness gate: every item must have one defensible answer under the explicit formal-edited-English criterion, retain exactly five A–E choices, and preserve the corrected answer key, explanation, reference, provenance, and tags. `verb-0059` must show the item qualifier “Treat the collective noun panel as a single unit.” `verb-0061` must show the item qualifier “Apply the formal-edited-English convention: use 'the reason ... is that' rather than 'the reason ... is because'.” The other two pilot items have no additional qualifier.

Compact Grammar payloads contain the shared task definition ID, `instanceFormat: "compact"`, `answerStructure: "sentence_selection"`, `migrationStatus: "safe_compact_conversion"`, and `sourcePromptPreserved: true`, with `itemNote` only where the criterion needs clarification. The long source stem remains preserved in the record for provenance but must not be rendered repeatedly; the shared direction appears once in the task block, and the pilot uses normal document flow rather than a tinted or emerald question card. Grammar & Usage remains broader than Sentence Correction: all non-pilot Grammar items stay in `verbal-grammar-usage` with `standard_multiple_choice` until separately reviewed.

### General Information

Use the existing General Information topic exactly as authored, preserve the reference, and assign `general_information_recall` with the matching `general-*` pool. Never invent a citation or section number. If a citation is not verified, flag it for review rather than silently accepting it.

## Shared task definitions

The canonical shared task references are:

| Reference | Task format | Use |
|---|---|---|
| `filing_default` | `shared_filing_task` | Filing directions, examples, and rules |
| `spelling_default` | `shared_spelling_task` | Spelling directions and answer structure |
| `number_series_default` | `number_sequence` | Number Series conventions and explicit missing position |
| `grammar_sentence_correction_pilot` | `shared_grammar_sentence_correction` | Four-item formal-edited-English Sentence Correction pilot |
| `letter_series_default` | `letter_sequence` | Letter-series presentation |

These shared definitions are not fixed-context sets. They describe reusable task presentation. Fixed sets are reserved for exact shared stimuli and use `fixedGroupId`.

## Provenance and preservation

Never delete or rewrite the historical source question files as part of classification. Preserve IDs, original question text, choices, `correctOptionId`, explanations, steps, distractor explanations, tips, references, tags, and the source-file path in the manifest. Pool indexes contain references and classification metadata only; they must not contain complete question bodies.

Legacy `seed-*` IDs remain valid and permanent. Never mint a new seed ID. Do not renumber, reuse, or backfill IDs.

## Validation

Run all of the following before accepting a batch:

```bash
npm run validate:questions
npm run validate:taxonomy
npm run audit:content
npm run test:content-model
npm run test:engine
npm run test:booklet
npm test
npm run typecheck
npm run build
```

`validate:taxonomy` must report exactly 688 classifications for the current bank, zero duplicate or missing IDs, valid pool and fixed-set references, compatible pool membership, reference-only pool entries, and eight atomic/fixed shared-context sets. Any low-confidence or unresolved classification must be reported and reviewed before merge.

## Examples

| Example | Destination |
|---|---|
| “Which word is MISSPELLED?” | Clerical / Spelling / `misspelled_word` / `clerical-spelling` / shared spelling task |
| Direct “meaning most nearly the same” | Verbal / Vocabulary / `direct_synonym` / `verbal-direct-synonym` |
| Meaning of a word as used in a sentence | Verbal / Vocabulary / `synonym_in_context` / `verbal-synonym-context` |
| Numeric series with a missing middle term | Numerical or Analytical according to the tested blueprint / `number_sequence` / explicit `numberSeries.missingPosition` |
| `ana-0038` or `ana-0040` | Analytical / Number and Letter Pattern / `letter_sequence` / `analytical-letter-sequence` |
| Alphabetical ordering of personal names | Clerical / Filing & Alphabetizing / `personal_name_filing` / shared filing task |
| Conditional “if…then” inference | Analytical / Logical Reasoning / `conditional_logic` |
| Four questions sharing one passage | Verbal or Numerical according to skill / `fixed-set` / exact fixed group |
| One question with its own table | Pool item with `embeddedStimulus: true`; do not create an artificial fixed set |
| Statutory or constitutional recall | General Information / existing topic / preserve verified `reference` |

## Uncertainty policy

Use `confidence: "medium"` when the classification is a defensible inference from the stem or subtopic but not an exact match to a controlled example. Use `confidence: "low"` only when the destination is genuinely uncertain. Do not hide uncertainty by inventing a new category. Flag low-confidence items for review and do not accept them into a frozen taxonomy without an explicit decision.
